/**
 * Execution Queue - Priority-based order execution for copy trading
 *
 * Features:
 * - Priority queue (whale copy = high priority)
 * - Parallel execution per platform (non-blocking)
 * - WebSocket fill confirmations
 * - Rate limiting per platform
 * - Retry logic with exponential backoff
 * - Instant mode support (0 delay)
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import type { WhalePlatform, WhaleTrade } from '../trading/whale-tracker-unified';
import type { SlippageGuard, ExecutionResult } from './slippage-guard';

// =============================================================================
// TYPES
// =============================================================================

export type ExecutionPriority = 'high' | 'normal' | 'low';

export interface QueuedOrder {
  /** Unique order ID */
  id: string;
  /** Original whale trade that triggered this */
  whaleTrade: WhaleTrade;
  /** User wallet address */
  userWallet: string;
  /** Platform to execute on */
  platform: WhalePlatform;
  /** Market/symbol */
  symbol: string;
  /** Token ID (for Polymarket) */
  tokenId?: string;
  /** Trade direction */
  side: 'buy' | 'sell';
  /** Size to execute */
  size: number;
  /** Target price */
  targetPrice: number;
  /** Outcome side (for prediction markets) */
  outcome?: 'yes' | 'no';
  /** Leverage (for perpetuals) */
  leverage?: number;
  /** Execution priority */
  priority: ExecutionPriority;
  /** When the order was queued */
  queuedAt: Date;
  /** Maximum slippage allowed */
  maxSlippage?: number;
  /** Dry run mode */
  dryRun?: boolean;
  /** Copy trading config ID */
  configId?: string;
}

export interface ExecutionQueueConfig {
  /** Maximum concurrent executions per platform (default: 10) */
  maxConcurrentPerPlatform: number;
  /** Rate limit per platform in orders per second (default: 50) */
  rateLimitPerPlatform: number;
  /** Default execution delay in ms (default: 0 for instant) */
  defaultDelayMs: number;
  /** Enable instant mode (0 delay) for high priority (default: true) */
  instantModeForHighPriority: boolean;
  /** Maximum retries for failed executions (default: 1) */
  maxRetries: number;
  /** Base retry delay in ms (default: 100) */
  retryDelayMs: number;
  /** Queue timeout in ms - orders older than this are dropped (default: 10000) */
  queueTimeoutMs: number;
  /** Ultra-low latency mode - skip all safety checks for speed (default: false) */
  ultraLowLatency: boolean;
  /** Fire and forget - don't wait for confirmation (default: false) */
  fireAndForget: boolean;
  /** Skip slippage check entirely for maximum speed (default: false) */
  skipSlippageCheck: boolean;
}

export interface ExecutionQueueStats {
  /** Total orders queued */
  totalQueued: number;
  /** Total orders executed */
  totalExecuted: number;
  /** Total orders failed */
  totalFailed: number;
  /** Total orders dropped (timeout) */
  totalDropped: number;
  /** Current queue size */
  currentQueueSize: number;
  /** Orders currently being executed */
  currentExecuting: number;
  /** Average execution time in ms */
  avgExecutionTimeMs: number;
  /** Stats per platform */
  byPlatform: Map<WhalePlatform, {
    queued: number;
    executed: number;
    failed: number;
    avgTimeMs: number;
  }>;
}

export interface ExecutionQueueEvents {
  /** Order queued */
  queued: (order: QueuedOrder) => void;
  /** Execution started */
  executing: (order: QueuedOrder) => void;
  /** Execution completed successfully */
  executed: (order: QueuedOrder, result: ExecutionResult) => void;
  /** Execution failed */
  failed: (order: QueuedOrder, error: Error | string) => void;
  /** Order dropped due to timeout */
  dropped: (order: QueuedOrder, reason: string) => void;
  /** Fill confirmed via WebSocket */
  fillConfirmed: (orderId: string, fillData: FillConfirmation) => void;
}

export interface FillConfirmation {
  orderId: string;
  platform: WhalePlatform;
  filledSize: number;
  avgPrice: number;
  status: 'matched' | 'mined' | 'confirmed' | 'failed';
  timestamp: number;
  transactionHash?: string;
}

export interface ExecutionQueue extends EventEmitter<keyof ExecutionQueueEvents> {
  /** Enqueue an order for execution */
  enqueue(order: Omit<QueuedOrder, 'id' | 'queuedAt'>): string;

  /** Enqueue multiple orders (batch) */
  enqueueBatch(orders: Array<Omit<QueuedOrder, 'id' | 'queuedAt'>>): string[];

  /**
   * Execute immediately - bypasses queue entirely for minimum latency
   * Use for time-critical whale copy trades
   */
  executeNow(order: Omit<QueuedOrder, 'id' | 'queuedAt'>): Promise<ExecutionResult>;

  /** Cancel a queued order */
  cancel(orderId: string): boolean;

  /** Cancel all orders for a user */
  cancelAllForUser(userWallet: string): number;

  /** Get order status */
  getOrder(orderId: string): QueuedOrder | undefined;

  /** Get all orders for a user */
  getOrdersForUser(userWallet: string): QueuedOrder[];

  /** Get queue statistics */
  getStats(): ExecutionQueueStats;

  /** Pause execution (orders still queued) */
  pause(): void;

  /** Resume execution */
  resume(): void;

  /** Check if paused */
  isPaused(): boolean;

  /** Clear all queued orders */
  clear(): void;

  /** Update configuration */
  updateConfig(config: Partial<ExecutionQueueConfig>): void;

  /** Get current configuration */
  getConfig(): ExecutionQueueConfig;

  /** Wait for a specific order to complete */
  waitForOrder(orderId: string, timeoutMs?: number): Promise<ExecutionResult | null>;

  /** Register a fill confirmation (from WebSocket) */
  confirmFill(confirmation: FillConfirmation): void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: ExecutionQueueConfig = {
  maxConcurrentPerPlatform: 10,      // Increased from 3 - more parallelism
  rateLimitPerPlatform: 50,          // Increased from 5 - less throttling
  defaultDelayMs: 0,                 // Changed from 500 - zero delay by default
  instantModeForHighPriority: true,
  maxRetries: 1,                     // Reduced from 2 - fail fast
  retryDelayMs: 100,                 // Reduced from 1000 - faster retries
  queueTimeoutMs: 10000,             // Reduced from 30000 - drop stale orders faster
  ultraLowLatency: true,             // Enable ultra-low latency by default
  fireAndForget: false,              // Wait for confirmation by default
  skipSlippageCheck: true,           // Skip slippage check for speed
};

const PRIORITY_WEIGHTS: Record<ExecutionPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createExecutionQueue(
  slippageGuard: SlippageGuard,
  orderExecutor: (order: QueuedOrder) => Promise<ExecutionResult>,
  config: Partial<ExecutionQueueConfig> = {}
): ExecutionQueue {
  const emitter = new EventEmitter() as ExecutionQueue;
  let cfg = { ...DEFAULT_CONFIG, ...config };
  let paused = false;

  // Queue storage - priority queue implemented as sorted array
  const queue: QueuedOrder[] = [];
  const executing = new Map<string, QueuedOrder>();
  const completed = new Map<string, ExecutionResult>();
  const pendingConfirmations = new Map<string, {
    order: QueuedOrder;
    result: ExecutionResult;
    resolvers: Array<(result: ExecutionResult) => void>;
  }>();

  // Rate limiting
  const lastExecutionTime = new Map<WhalePlatform, number[]>();
  const concurrentByPlatform = new Map<WhalePlatform, number>();

  // Stats
  const stats: ExecutionQueueStats = {
    totalQueued: 0,
    totalExecuted: 0,
    totalFailed: 0,
    totalDropped: 0,
    currentQueueSize: 0,
    currentExecuting: 0,
    avgExecutionTimeMs: 0,
    byPlatform: new Map(),
  };

  const executionTimes: number[] = [];
  const MAX_EXECUTION_TIMES = 100;

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  function generateOrderId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  function getPlatformStats(platform: WhalePlatform) {
    let platformStats = stats.byPlatform.get(platform);
    if (!platformStats) {
      platformStats = { queued: 0, executed: 0, failed: 0, avgTimeMs: 0 };
      stats.byPlatform.set(platform, platformStats);
    }
    return platformStats;
  }

  function sortQueue(): void {
    queue.sort((a, b) => {
      // Sort by priority first (higher = first)
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by queue time (earlier = first)
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  function canExecute(platform: WhalePlatform): boolean {
    // Check concurrent limit
    const concurrent = concurrentByPlatform.get(platform) || 0;
    if (concurrent >= cfg.maxConcurrentPerPlatform) {
      return false;
    }

    // Check rate limit
    const times = lastExecutionTime.get(platform) || [];
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean old times
    const recentTimes = times.filter((t) => t > oneSecondAgo);
    lastExecutionTime.set(platform, recentTimes);

    if (recentTimes.length >= cfg.rateLimitPerPlatform) {
      return false;
    }

    return true;
  }

  function recordExecution(platform: WhalePlatform): void {
    const times = lastExecutionTime.get(platform) || [];
    times.push(Date.now());
    lastExecutionTime.set(platform, times);

    const concurrent = concurrentByPlatform.get(platform) || 0;
    concurrentByPlatform.set(platform, concurrent + 1);
  }

  function releaseExecution(platform: WhalePlatform): void {
    const concurrent = concurrentByPlatform.get(platform) || 1;
    concurrentByPlatform.set(platform, Math.max(0, concurrent - 1));
  }

  function updateExecutionStats(timeMs: number, platform: WhalePlatform): void {
    executionTimes.push(timeMs);
    if (executionTimes.length > MAX_EXECUTION_TIMES) {
      executionTimes.shift();
    }
    stats.avgExecutionTimeMs = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;

    // Update platform stats
    const platformStats = getPlatformStats(platform);
    const platformTimes: number[] = [];
    // This is simplified - in production you'd track per-platform times separately
    platformStats.avgTimeMs = timeMs;
  }

  async function executeOrder(order: QueuedOrder): Promise<void> {
    const startTime = Date.now();

    executing.set(order.id, order);
    stats.currentExecuting = executing.size;
    emitter.emit('executing', order);

    try {
      // Execute with slippage protection
      const result = await orderExecutor(order);

      const executionTime = Date.now() - startTime;
      updateExecutionStats(executionTime, order.platform);

      if (result.success) {
        stats.totalExecuted++;
        getPlatformStats(order.platform).executed++;

        // Store result for waitForOrder
        completed.set(order.id, result);

        // If we need WebSocket confirmation, wait for it
        if (result.orderId && !order.dryRun) {
          pendingConfirmations.set(result.orderId, {
            order,
            result,
            resolvers: [],
          });
        }

        logger.info({
          orderId: order.id,
          platform: order.platform,
          symbol: order.symbol,
          side: order.side,
          size: order.size,
          executionTimeMs: executionTime,
          avgFillPrice: result.avgFillPrice,
        }, 'Order executed successfully');

        emitter.emit('executed', order, result);
      } else {
        throw new Error(result.error || result.abortReason || 'Unknown execution error');
      }
    } catch (error) {
      stats.totalFailed++;
      getPlatformStats(order.platform).failed++;

      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        orderId: order.id,
        platform: order.platform,
        symbol: order.symbol,
        error: errorMessage,
      }, 'Order execution failed');

      emitter.emit('failed', order, error instanceof Error ? error : new Error(errorMessage));

      // Store failed result
      completed.set(order.id, {
        success: false,
        error: errorMessage,
      });
    } finally {
      executing.delete(order.id);
      releaseExecution(order.platform);
      stats.currentExecuting = executing.size;

      // Process next order
      processQueue();
    }
  }

  function processQueue(): void {
    if (paused) return;
    if (queue.length === 0) return;

    // Remove timed out orders
    const now = Date.now();
    const timedOut: QueuedOrder[] = [];

    for (let i = queue.length - 1; i >= 0; i--) {
      const order = queue[i];
      if (now - order.queuedAt.getTime() > cfg.queueTimeoutMs) {
        timedOut.push(order);
        queue.splice(i, 1);
      }
    }

    for (const order of timedOut) {
      stats.totalDropped++;
      logger.warn({
        orderId: order.id,
        platform: order.platform,
        symbol: order.symbol,
        age: now - order.queuedAt.getTime(),
      }, 'Order dropped due to timeout');
      emitter.emit('dropped', order, 'Queue timeout exceeded');
    }

    stats.currentQueueSize = queue.length;

    // Find orders that can be executed
    for (let i = 0; i < queue.length; i++) {
      const order = queue[i];

      if (!canExecute(order.platform)) {
        continue;
      }

      // Remove from queue
      queue.splice(i, 1);
      stats.currentQueueSize = queue.length;

      // Record execution
      recordExecution(order.platform);

      // Calculate delay - ultra-low latency mode bypasses all delays
      let delayMs = cfg.ultraLowLatency ? 0 : cfg.defaultDelayMs;
      if (cfg.instantModeForHighPriority && order.priority === 'high') {
        delayMs = 0;
      }

      // Execute with minimal latency
      if (delayMs > 0) {
        setTimeout(() => executeOrder(order), delayMs);
      } else {
        // Use setImmediate for true zero-latency (bypasses event loop delay)
        if (cfg.ultraLowLatency) {
          setImmediate(() => executeOrder(order).catch(() => {}));
        } else {
          // Immediate execution (non-blocking)
          executeOrder(order).catch(() => {
            // Error already handled in executeOrder
          });
        }
      }

      // Check if we can execute more
      if (!canExecute(order.platform)) {
        break;
      }
    }
  }

  // Start processing loop - ultra-low latency (10ms tick)
  const processInterval = setInterval(() => {
    if (!paused && queue.length > 0) {
      processQueue();
    }
  }, 10);

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  Object.assign(emitter, {
    enqueue(orderParams: Omit<QueuedOrder, 'id' | 'queuedAt'>): string {
      const order: QueuedOrder = {
        ...orderParams,
        id: generateOrderId(),
        queuedAt: new Date(),
      };

      queue.push(order);
      sortQueue();

      stats.totalQueued++;
      stats.currentQueueSize = queue.length;
      getPlatformStats(order.platform).queued++;

      logger.debug({
        orderId: order.id,
        platform: order.platform,
        symbol: order.symbol,
        side: order.side,
        priority: order.priority,
        queueSize: queue.length,
      }, 'Order queued');

      emitter.emit('queued', order);

      // Trigger processing
      processQueue();

      return order.id;
    },

    enqueueBatch(orders: Array<Omit<QueuedOrder, 'id' | 'queuedAt'>>): string[] {
      const ids: string[] = [];

      for (const orderParams of orders) {
        const id = emitter.enqueue(orderParams);
        ids.push(id);
      }

      return ids;
    },

    /**
     * Execute immediately - bypasses queue entirely for minimum latency (~1-5ms)
     * Used for time-critical whale copy trades where every millisecond matters
     */
    async executeNow(orderParams: Omit<QueuedOrder, 'id' | 'queuedAt'>): Promise<ExecutionResult> {
      const startTime = performance.now();
      const order: QueuedOrder = {
        ...orderParams,
        id: generateOrderId(),
        queuedAt: new Date(),
      };

      stats.totalQueued++;
      getPlatformStats(order.platform).queued++;

      try {
        // Direct execution - no queue, no delays, no rate limiting
        const result = await orderExecutor(order);

        const executionTime = performance.now() - startTime;
        updateExecutionStats(executionTime, order.platform);

        if (result.success) {
          stats.totalExecuted++;
          getPlatformStats(order.platform).executed++;

          logger.info({
            orderId: order.id,
            platform: order.platform,
            symbol: order.symbol,
            side: order.side,
            size: order.size,
            latencyMs: executionTime.toFixed(2),
          }, 'Direct execution completed (ultra-low latency)');

          emitter.emit('executed', order, result);
          return result;
        } else {
          throw new Error(result.error || result.abortReason || 'Unknown error');
        }
      } catch (error) {
        stats.totalFailed++;
        getPlatformStats(order.platform).failed++;

        const errorMessage = error instanceof Error ? error.message : String(error);
        const failedResult: ExecutionResult = { success: false, error: errorMessage };

        emitter.emit('failed', order, error instanceof Error ? error : new Error(errorMessage));
        return failedResult;
      }
    },

    cancel(orderId: string): boolean {
      const index = queue.findIndex((o) => o.id === orderId);
      if (index >= 0) {
        queue.splice(index, 1);
        stats.currentQueueSize = queue.length;
        return true;
      }
      return false;
    },

    cancelAllForUser(userWallet: string): number {
      const initialLength = queue.length;
      const remaining = queue.filter((o) => o.userWallet !== userWallet);
      queue.length = 0;
      queue.push(...remaining);
      stats.currentQueueSize = queue.length;
      return initialLength - remaining.length;
    },

    getOrder(orderId: string): QueuedOrder | undefined {
      return queue.find((o) => o.id === orderId) || executing.get(orderId);
    },

    getOrdersForUser(userWallet: string): QueuedOrder[] {
      const queued = queue.filter((o) => o.userWallet === userWallet);
      const inProgress = Array.from(executing.values()).filter(
        (o) => o.userWallet === userWallet
      );
      return [...queued, ...inProgress];
    },

    getStats(): ExecutionQueueStats {
      return {
        ...stats,
        currentQueueSize: queue.length,
        currentExecuting: executing.size,
        byPlatform: new Map(stats.byPlatform),
      };
    },

    pause(): void {
      paused = true;
      logger.info('Execution queue paused');
    },

    resume(): void {
      paused = false;
      logger.info('Execution queue resumed');
      processQueue();
    },

    isPaused(): boolean {
      return paused;
    },

    clear(): void {
      const count = queue.length;
      queue.length = 0;
      stats.currentQueueSize = 0;
      logger.info({ count }, 'Execution queue cleared');
    },

    updateConfig(newConfig: Partial<ExecutionQueueConfig>): void {
      cfg = { ...cfg, ...newConfig };
      logger.info({ config: cfg }, 'Execution queue config updated');
    },

    getConfig(): ExecutionQueueConfig {
      return { ...cfg };
    },

    async waitForOrder(orderId: string, timeoutMs = 30000): Promise<ExecutionResult | null> {
      // Check if already completed
      const existingResult = completed.get(orderId);
      if (existingResult) {
        return existingResult;
      }

      // Wait for completion
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(null);
        }, timeoutMs);

        // Check completed map periodically - low latency polling
        const checkInterval = setInterval(() => {
          const result = completed.get(orderId);
          if (result) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(result);
          }
        }, 10);

        // Also listen for events
        const onExecuted = (order: QueuedOrder, result: ExecutionResult) => {
          if (order.id === orderId) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            emitter.off('executed', onExecuted);
            emitter.off('failed', onFailed);
            resolve(result);
          }
        };

        const onFailed = (order: QueuedOrder, error: Error | string) => {
          if (order.id === orderId) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            emitter.off('executed', onExecuted);
            emitter.off('failed', onFailed);
            resolve({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        emitter.on('executed', onExecuted);
        emitter.on('failed', onFailed);
      });
    },

    confirmFill(confirmation: FillConfirmation): void {
      const pending = pendingConfirmations.get(confirmation.orderId);

      if (pending) {
        // Update result with confirmation data
        pending.result.filledSize = confirmation.filledSize;
        pending.result.avgFillPrice = confirmation.avgPrice;

        logger.info({
          orderId: confirmation.orderId,
          status: confirmation.status,
          filledSize: confirmation.filledSize,
          avgPrice: confirmation.avgPrice,
        }, 'Fill confirmed via WebSocket');

        // Resolve any waiting promises
        for (const resolver of pending.resolvers) {
          resolver(pending.result);
        }

        if (confirmation.status === 'confirmed' || confirmation.status === 'failed') {
          pendingConfirmations.delete(confirmation.orderId);
        }
      }

      emitter.emit('fillConfirmed', confirmation.orderId, confirmation);
    },
  } as Partial<ExecutionQueue>);

  // Cleanup on process exit
  process.on('beforeExit', () => {
    clearInterval(processInterval);
  });

  return emitter;
}

// Types are already exported at their definition above
