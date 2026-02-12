/**
 * Copy Trading Orchestrator - Central service for managing per-user copy trading sessions
 *
 * Responsibilities:
 * - Manages copy trading sessions per wallet address
 * - Loads user credentials and creates ExecutionService instances
 * - Persists configs to database
 * - Routes whale trades to appropriate user sessions
 * - Handles session lifecycle (start/stop on config changes)
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import { createCopyTradingService, type CopyTradingService, type CopyTradingConfig, type CopiedTrade, type CopyTradingStats } from './copy-trading';
import { createExecutionService, type ExecutionService, type ExecutionConfig } from '../execution/index';
import type { WhaleTracker, WhaleTrade } from '../feeds/polymarket/whale-tracker';
import type { UnifiedWhaleTracker, WhaleTrade as UnifiedWhaleTrade, WhalePlatform } from './whale-tracker-unified';
import type { CredentialsManager } from '../credentials/index';
import type { PairingService } from '../pairing/index';
import type { Database } from '../db/index';
import type { PolymarketCredentials, KalshiCredentials, HyperliquidCredentials } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/** Platform-specific settings for copy trading */
export interface PlatformSettings {
  polymarket?: {
    enabled: boolean;
    maxSize: number;
  };
  hyperliquid?: {
    enabled: boolean;
    maxSize: number;
    /** Match whale's leverage (capped at user's maxLeverage) */
    matchLeverage: boolean;
    /** Maximum leverage to use (even if whale uses more) */
    maxLeverage: number;
  };
  kalshi?: {
    enabled: boolean;
    maxSize: number;
    /** Minimum momentum confidence score to copy (0-100) */
    momentumThreshold: number;
  };
}

export interface CopyTradingConfigRecord {
  id: string;
  userWallet: string;
  targetWallet: string;
  targetLabel?: string;
  enabled: boolean;
  dryRun: boolean;
  sizingMode: 'fixed' | 'proportional' | 'percentage';
  fixedSize: number;
  proportionMultiplier: number;
  portfolioPercentage: number;
  maxPositionSize: number;
  minTradeSize: number;
  copyDelayMs: number;
  maxSlippage: number;
  stopLoss?: number;
  takeProfit?: number;
  totalTrades: number;
  totalPnl: number;
  createdAt: Date;
  updatedAt: Date;
  // Multi-platform settings (NEW)
  /** Platform-specific settings */
  platforms?: PlatformSettings;
  /** Enable instant execution mode (0 delay for high priority) */
  instantMode?: boolean;
  /** Maximum slippage percentage before aborting */
  maxSlippagePercent?: number;
}

export interface CopyTradeRecord {
  id: string;
  configId: string;
  userWallet: string;
  targetWallet: string;
  marketId: string;
  tokenId?: string;
  outcome?: string;
  side: 'BUY' | 'SELL';
  originalSize: number;
  copiedSize: number;
  entryPrice: number;
  exitPrice?: number;
  status: 'pending' | 'filled' | 'partial' | 'failed' | 'closed';
  pnl?: number;
  createdAt: Date;
  closedAt?: Date;
  // Multi-platform fields (NEW)
  /** Platform where trade was executed */
  platform?: WhalePlatform;
  /** Leverage used (for perpetuals) */
  leverage?: number;
  /** Actual slippage experienced */
  slippageActual?: number;
}

export interface CreateCopyConfigInput {
  targetWallet: string;
  targetLabel?: string;
  enabled?: boolean;
  dryRun?: boolean;
  sizingMode?: 'fixed' | 'proportional' | 'percentage';
  fixedSize?: number;
  proportionMultiplier?: number;
  portfolioPercentage?: number;
  maxPositionSize?: number;
  minTradeSize?: number;
  copyDelayMs?: number;
  maxSlippage?: number;
  stopLoss?: number;
  takeProfit?: number;
  allocationPercent?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  // Multi-platform settings (NEW)
  /** Platform-specific settings */
  platforms?: PlatformSettings;
  /** Enable instant execution mode (0 delay for high priority) */
  instantMode?: boolean;
  /** Maximum slippage percentage before aborting */
  maxSlippagePercent?: number;
}

interface CopyTradingSession {
  walletAddress: string;
  copyService: CopyTradingService;
  executionService: ExecutionService | null;
  configs: CopyTradingConfigRecord[];
}

export interface CopyTradingOrchestratorEvents {
  sessionStarted: (walletAddress: string) => void;
  sessionStopped: (walletAddress: string) => void;
  tradeCopied: (walletAddress: string, trade: CopiedTrade) => void;
  tradeSkipped: (walletAddress: string, trade: WhaleTrade, reason: string) => void;
  error: (walletAddress: string, error: Error) => void;
}

export interface CopyTradingOrchestrator extends EventEmitter<keyof CopyTradingOrchestratorEvents> {
  // Session management
  startSession(walletAddress: string): Promise<void>;
  stopSession(walletAddress: string): Promise<void>;
  getSession(walletAddress: string): CopyTradingSession | undefined;
  hasActiveSession(walletAddress: string): boolean;

  // Config management
  createConfig(walletAddress: string, input: CreateCopyConfigInput): Promise<CopyTradingConfigRecord>;
  updateConfig(configId: string, updates: Partial<CreateCopyConfigInput>): Promise<CopyTradingConfigRecord | null>;
  toggleConfig(configId: string, enabled: boolean): Promise<void>;
  deleteConfig(configId: string): Promise<void>;
  getConfig(configId: string): Promise<CopyTradingConfigRecord | null>;
  getConfigsForWallet(walletAddress: string): Promise<CopyTradingConfigRecord[]>;

  // Credentials check
  hasCredentials(walletAddress: string, platform: 'polymarket' | 'kalshi'): Promise<boolean>;

  // Stats & history
  getStats(walletAddress: string): Promise<CopyTradingStats>;
  getAggregatedStats(walletAddress: string): Promise<{
    totalConfigs: number;
    activeConfigs: number;
    totalCopiedTrades: number;
    successfulTrades: number;
    totalPnl: number;
    successRate: number;
    topPerformingTarget?: { wallet: string; pnl: number };
  }>;
  getHistory(walletAddress: string, options?: { limit?: number; configId?: string }): Promise<CopyTradeRecord[]>;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// =============================================================================
// DATABASE SCHEMA & HELPERS
// =============================================================================

function initializeDatabase(db: Database): void {
  // Copy trading configs table
  db.run(`
    CREATE TABLE IF NOT EXISTS copy_trading_configs (
      id TEXT PRIMARY KEY,
      userWallet TEXT NOT NULL,
      targetWallet TEXT NOT NULL,
      targetLabel TEXT,
      enabled INTEGER DEFAULT 1,
      dryRun INTEGER DEFAULT 0,
      sizingMode TEXT DEFAULT 'fixed',
      fixedSize REAL DEFAULT 100,
      proportionMultiplier REAL DEFAULT 0.1,
      portfolioPercentage REAL DEFAULT 5,
      maxPositionSize REAL DEFAULT 500,
      minTradeSize REAL DEFAULT 1000,
      copyDelayMs INTEGER DEFAULT 0,
      maxSlippage REAL DEFAULT 3,
      stopLoss REAL,
      takeProfit REAL,
      totalTrades INTEGER DEFAULT 0,
      totalPnl REAL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      -- Multi-platform columns (optimized for ultra-low latency)
      platforms TEXT DEFAULT '{"polymarket":{"enabled":true,"maxSize":500}}',
      instantMode INTEGER DEFAULT 1,
      maxSlippagePercent REAL DEFAULT 3.0
    )
  `);

  // Add columns to existing tables (migration-safe)
  try {
    db.run(`ALTER TABLE copy_trading_configs ADD COLUMN platforms TEXT DEFAULT '{"polymarket":{"enabled":true,"maxSize":500}}'`);
  } catch { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE copy_trading_configs ADD COLUMN instantMode INTEGER DEFAULT 0`);
  } catch { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE copy_trading_configs ADD COLUMN maxSlippagePercent REAL DEFAULT 2.0`);
  } catch { /* Column may already exist */ }

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_copy_configs_wallet
    ON copy_trading_configs(userWallet)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_copy_configs_target
    ON copy_trading_configs(targetWallet)
  `);

  // Copy trade history table
  db.run(`
    CREATE TABLE IF NOT EXISTS copy_trades (
      id TEXT PRIMARY KEY,
      configId TEXT NOT NULL,
      userWallet TEXT NOT NULL,
      targetWallet TEXT NOT NULL,
      marketId TEXT NOT NULL,
      tokenId TEXT,
      outcome TEXT,
      side TEXT NOT NULL,
      originalSize REAL NOT NULL,
      copiedSize REAL NOT NULL,
      entryPrice REAL NOT NULL,
      exitPrice REAL,
      status TEXT NOT NULL,
      pnl REAL,
      createdAt TEXT NOT NULL,
      closedAt TEXT,
      -- Multi-platform columns
      platform TEXT DEFAULT 'polymarket',
      leverage REAL,
      slippageActual REAL,
      FOREIGN KEY (configId) REFERENCES copy_trading_configs(id)
    )
  `);

  // Add columns to existing tables (migration-safe)
  try {
    db.run(`ALTER TABLE copy_trades ADD COLUMN platform TEXT DEFAULT 'polymarket'`);
  } catch { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE copy_trades ADD COLUMN leverage REAL`);
  } catch { /* Column may already exist */ }
  try {
    db.run(`ALTER TABLE copy_trades ADD COLUMN slippageActual REAL`);
  } catch { /* Column may already exist */ }

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_copy_trades_wallet
    ON copy_trades(userWallet, createdAt)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_copy_trades_config
    ON copy_trades(configId, createdAt)
  `);

  logger.info('Copy trading database schema initialized');
}

function generateId(): string {
  return `cpy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// ORCHESTRATOR IMPLEMENTATION
// =============================================================================

export function createCopyTradingOrchestrator(
  whaleTracker: WhaleTracker,
  credentialsManager: CredentialsManager,
  db: Database,
  pairingService?: PairingService
): CopyTradingOrchestrator {
  const emitter = new EventEmitter() as CopyTradingOrchestrator;
  const sessions = new Map<string, CopyTradingSession>();
  let initialized = false;

  // Initialize database schema
  initializeDatabase(db);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  async function createExecutionServiceForWallet(walletAddress: string): Promise<ExecutionService | null> {
    try {
      // Load Polymarket credentials
      const polymarketCreds = await credentialsManager.getCredentials<PolymarketCredentials>(
        walletAddress,
        'polymarket'
      );

      if (!polymarketCreds) {
        logger.warn({ walletAddress }, 'No Polymarket credentials found for wallet');
        return null;
      }

      const execConfig: ExecutionConfig = {
        polymarket: {
          address: polymarketCreds.address,
          apiKey: polymarketCreds.apiKey,
          apiSecret: polymarketCreds.apiSecret,
          apiPassphrase: polymarketCreds.apiPassphrase,
          privateKey: polymarketCreds.privateKey,
          funderAddress: polymarketCreds.funderAddress || polymarketCreds.address,
          signatureType: polymarketCreds.signatureType,
        },
        maxOrderSize: 1000,
        dryRun: false,
      };

      // Also load Kalshi credentials if available
      const kalshiCreds = await credentialsManager.getCredentials<KalshiCredentials>(
        walletAddress,
        'kalshi'
      );

      if (kalshiCreds?.apiKeyId && kalshiCreds?.privateKeyPem) {
        execConfig.kalshi = {
          apiKeyId: kalshiCreds.apiKeyId,
          privateKeyPem: kalshiCreds.privateKeyPem,
        };
      }

      // Also load Hyperliquid credentials if available
      const hlCreds = await credentialsManager.getCredentials<HyperliquidCredentials>(
        walletAddress,
        'hyperliquid'
      );

      if (hlCreds?.privateKey) {
        execConfig.hyperliquid = {
          privateKey: hlCreds.privateKey,
          walletAddress: hlCreds.walletAddress || walletAddress,
          testnet: hlCreds.testnet || false,
        };
      }

      return createExecutionService(execConfig);
    } catch (error) {
      logger.error({ error, walletAddress }, 'Failed to create execution service');
      return null;
    }
  }

  function configRecordToCopyConfig(record: CopyTradingConfigRecord): CopyTradingConfig {
    // Build enabled platforms list from settings
    const enabledPlatforms: Array<'polymarket' | 'kalshi' | 'hyperliquid'> = [];
    if (record.platforms?.polymarket?.enabled) enabledPlatforms.push('polymarket');
    if (record.platforms?.kalshi?.enabled) enabledPlatforms.push('kalshi');
    if (record.platforms?.hyperliquid?.enabled) enabledPlatforms.push('hyperliquid');

    // Default to polymarket if none specified
    if (enabledPlatforms.length === 0) {
      enabledPlatforms.push('polymarket', 'kalshi');
    }

    return {
      followedAddresses: [record.targetWallet],
      sizingMode: record.sizingMode,
      fixedSize: record.fixedSize,
      proportionMultiplier: record.proportionMultiplier,
      portfolioPercentage: record.portfolioPercentage,
      maxPositionSize: record.maxPositionSize,
      minTradeSize: record.minTradeSize,
      copyDelayMs: record.instantMode ? 0 : record.copyDelayMs, // Instant mode = 0 delay
      maxSlippage: record.maxSlippagePercent || record.maxSlippage,
      stopLoss: record.stopLoss,
      takeProfit: record.takeProfit,
      dryRun: record.dryRun,
      enabledPlatforms,
      // Multi-platform settings
      platforms: record.platforms,
      instantMode: record.instantMode,
    };
  }

  function rowToConfigRecord(row: any): CopyTradingConfigRecord {
    // Parse platforms JSON
    let platforms: PlatformSettings | undefined;
    if (row.platforms) {
      try {
        platforms = typeof row.platforms === 'string'
          ? JSON.parse(row.platforms)
          : row.platforms;
      } catch {
        platforms = { polymarket: { enabled: true, maxSize: 500 } };
      }
    }

    return {
      id: row.id,
      userWallet: row.userWallet,
      targetWallet: row.targetWallet,
      targetLabel: row.targetLabel,
      enabled: Boolean(row.enabled),
      dryRun: Boolean(row.dryRun),
      sizingMode: row.sizingMode || 'fixed',
      fixedSize: row.fixedSize || 100,
      proportionMultiplier: row.proportionMultiplier || 0.1,
      portfolioPercentage: row.portfolioPercentage || 5,
      maxPositionSize: row.maxPositionSize || 500,
      minTradeSize: row.minTradeSize || 1000,
      copyDelayMs: row.copyDelayMs ?? 0,        // Default 0 for instant
      maxSlippage: row.maxSlippage || 3,        // Increased tolerance
      stopLoss: row.stopLoss,
      takeProfit: row.takeProfit,
      totalTrades: row.totalTrades || 0,
      totalPnl: row.totalPnl || 0,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      // Multi-platform fields - optimized for low latency
      platforms,
      instantMode: row.instantMode !== 0,      // Default true
      maxSlippagePercent: row.maxSlippagePercent || 3.0,
    };
  }

  function rowToTradeRecord(row: any): CopyTradeRecord {
    return {
      id: row.id,
      configId: row.configId,
      userWallet: row.userWallet,
      targetWallet: row.targetWallet,
      marketId: row.marketId,
      tokenId: row.tokenId,
      outcome: row.outcome,
      side: row.side,
      originalSize: row.originalSize,
      copiedSize: row.copiedSize,
      entryPrice: row.entryPrice,
      exitPrice: row.exitPrice,
      status: row.status,
      pnl: row.pnl,
      createdAt: new Date(row.createdAt),
      closedAt: row.closedAt ? new Date(row.closedAt) : undefined,
      // Multi-platform fields
      platform: row.platform as WhalePlatform || 'polymarket',
      leverage: row.leverage,
      slippageActual: row.slippageActual,
    };
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  async function startSessionInternal(walletAddress: string): Promise<void> {
    if (sessions.has(walletAddress)) {
      logger.debug({ walletAddress }, 'Session already exists');
      return;
    }

    // Load configs for this wallet
    const configRows = db.query<any>(
      'SELECT * FROM copy_trading_configs WHERE userWallet = ? AND enabled = 1',
      [walletAddress]
    );
    const configs = configRows.map(rowToConfigRecord);

    if (configs.length === 0) {
      logger.debug({ walletAddress }, 'No enabled configs found for wallet');
      return;
    }

    // Create execution service
    const executionService = await createExecutionServiceForWallet(walletAddress);

    // Merge all followed addresses from configs
    const followedAddresses = configs.map(c => c.targetWallet);
    const primaryConfig = configs[0];

    // Create copy trading service
    const copyConfig: CopyTradingConfig = {
      ...configRecordToCopyConfig(primaryConfig),
      followedAddresses,
    };

    const copyService = createCopyTradingService(whaleTracker, executionService, copyConfig);

    // Set up event handlers
    copyService.on('tradeCopied', (trade: CopiedTrade) => {
      logger.info({ walletAddress, tradeId: trade.id }, 'Trade copied');
      emitter.emit('tradeCopied', walletAddress, trade);

      // Record to database
      const config = configs.find(c => c.targetWallet === trade.originalTrade.maker || c.targetWallet === trade.originalTrade.taker);
      if (config) {
        db.run(`
          INSERT INTO copy_trades (id, configId, userWallet, targetWallet, marketId, tokenId, outcome, side, originalSize, copiedSize, entryPrice, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          trade.id,
          config.id,
          walletAddress,
          config.targetWallet,
          trade.originalTrade.marketId,
          trade.originalTrade.tokenId,
          trade.originalTrade.outcome,
          trade.side,
          trade.originalTrade.usdValue,
          trade.size * trade.entryPrice,
          trade.entryPrice,
          trade.status,
          new Date().toISOString(),
        ]);

        // Update config stats
        db.run(`
          UPDATE copy_trading_configs
          SET totalTrades = totalTrades + 1, updatedAt = ?
          WHERE id = ?
        `, [new Date().toISOString(), config.id]);
      }
    });

    copyService.on('tradeSkipped', (trade: WhaleTrade, reason: string) => {
      logger.debug({ walletAddress, marketId: trade.marketId, reason }, 'Trade skipped');
      emitter.emit('tradeSkipped', walletAddress, trade, reason);
    });

    copyService.on('positionClosed', (trade: CopiedTrade, pnl: number) => {
      logger.info({ walletAddress, tradeId: trade.id, pnl }, 'Position closed');

      // Update database
      db.run(`
        UPDATE copy_trades
        SET status = 'closed', exitPrice = ?, pnl = ?, closedAt = ?
        WHERE id = ?
      `, [trade.exitPrice, pnl, new Date().toISOString(), trade.id]);

      // Update config PnL
      const config = configs.find(c => c.targetWallet === trade.originalTrade.maker || c.targetWallet === trade.originalTrade.taker);
      if (config) {
        db.run(`
          UPDATE copy_trading_configs
          SET totalPnl = totalPnl + ?, updatedAt = ?
          WHERE id = ?
        `, [pnl, new Date().toISOString(), config.id]);
      }
    });

    copyService.on('error', (error: Error) => {
      logger.error({ walletAddress, error: error.message }, 'Copy trading error');
      emitter.emit('error', walletAddress, error);
    });

    // Start the service
    copyService.start();

    const session: CopyTradingSession = {
      walletAddress,
      copyService,
      executionService,
      configs,
    };

    sessions.set(walletAddress, session);
    logger.info({ walletAddress, configCount: configs.length }, 'Copy trading session started');
    emitter.emit('sessionStarted', walletAddress);
  }

  async function stopSessionInternal(walletAddress: string): Promise<void> {
    const session = sessions.get(walletAddress);
    if (!session) {
      return;
    }

    // Close all open positions
    await session.copyService.closeAllPositions();

    // Stop the service
    session.copyService.stop();

    sessions.delete(walletAddress);
    logger.info({ walletAddress }, 'Copy trading session stopped');
    emitter.emit('sessionStopped', walletAddress);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  Object.assign(emitter, {
    async startSession(walletAddress: string): Promise<void> {
      await startSessionInternal(walletAddress);
    },

    async stopSession(walletAddress: string): Promise<void> {
      await stopSessionInternal(walletAddress);
    },

    getSession(walletAddress: string): CopyTradingSession | undefined {
      return sessions.get(walletAddress);
    },

    hasActiveSession(walletAddress: string): boolean {
      const session = sessions.get(walletAddress);
      return session?.copyService?.isRunning() ?? false;
    },

    async createConfig(walletAddress: string, input: CreateCopyConfigInput): Promise<CopyTradingConfigRecord> {
      const id = generateId();
      const now = new Date().toISOString();

      // Handle frontend field names
      const fixedSize = input.fixedSize ?? (input.allocationPercent ? input.allocationPercent * 10 : 100);
      const stopLoss = input.stopLoss ?? input.stopLossPercent;
      const takeProfit = input.takeProfit ?? input.takeProfitPercent;

      db.run(`
        INSERT INTO copy_trading_configs (
          id, userWallet, targetWallet, targetLabel, enabled, dryRun,
          sizingMode, fixedSize, proportionMultiplier, portfolioPercentage,
          maxPositionSize, minTradeSize, copyDelayMs, maxSlippage,
          stopLoss, takeProfit, totalTrades, totalPnl, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `, [
        id,
        walletAddress,
        input.targetWallet,
        input.targetLabel || null,
        input.enabled !== false ? 1 : 0,
        input.dryRun === true ? 1 : 0,
        input.sizingMode || 'fixed',
        fixedSize,
        input.proportionMultiplier ?? 0.1,
        input.portfolioPercentage ?? 5,
        input.maxPositionSize ?? 500,
        input.minTradeSize ?? 1000,
        input.copyDelayMs ?? 0,            // Default 0 for instant execution
        input.maxSlippage ?? 3,            // Increased tolerance for speed
        stopLoss || null,
        takeProfit || null,
        now,
        now,
      ]);

      const record = await emitter.getConfig(id);
      if (!record) {
        throw new Error('Failed to create config');
      }

      // If enabled, start or update session
      if (record.enabled) {
        const existingSession = sessions.get(walletAddress);
        if (existingSession) {
          // Update existing session
          existingSession.configs.push(record);
          existingSession.copyService.follow(record.targetWallet);
        } else {
          // Start new session
          await startSessionInternal(walletAddress);
        }
      }

      logger.info({ configId: id, walletAddress, targetWallet: input.targetWallet }, 'Copy config created');
      return record;
    },

    async updateConfig(configId: string, updates: Partial<CreateCopyConfigInput>): Promise<CopyTradingConfigRecord | null> {
      const existing = await emitter.getConfig(configId);
      if (!existing) {
        return null;
      }

      const sets: string[] = [];
      const values: any[] = [];

      if (updates.targetLabel !== undefined) {
        sets.push('targetLabel = ?');
        values.push(updates.targetLabel);
      }
      if (updates.enabled !== undefined) {
        sets.push('enabled = ?');
        values.push(updates.enabled ? 1 : 0);
      }
      if (updates.dryRun !== undefined) {
        sets.push('dryRun = ?');
        values.push(updates.dryRun ? 1 : 0);
      }
      if (updates.sizingMode !== undefined) {
        sets.push('sizingMode = ?');
        values.push(updates.sizingMode);
      }
      if (updates.fixedSize !== undefined) {
        sets.push('fixedSize = ?');
        values.push(updates.fixedSize);
      }
      if (updates.maxPositionSize !== undefined) {
        sets.push('maxPositionSize = ?');
        values.push(updates.maxPositionSize);
      }
      if (updates.stopLoss !== undefined || updates.stopLossPercent !== undefined) {
        sets.push('stopLoss = ?');
        values.push(updates.stopLoss ?? updates.stopLossPercent);
      }
      if (updates.takeProfit !== undefined || updates.takeProfitPercent !== undefined) {
        sets.push('takeProfit = ?');
        values.push(updates.takeProfit ?? updates.takeProfitPercent);
      }

      if (sets.length === 0) {
        return existing;
      }

      sets.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(configId);

      db.run(`UPDATE copy_trading_configs SET ${sets.join(', ')} WHERE id = ?`, values);

      return emitter.getConfig(configId);
    },

    async toggleConfig(configId: string, enabled: boolean): Promise<void> {
      const config = await emitter.getConfig(configId);
      if (!config) {
        throw new Error(`Config ${configId} not found`);
      }

      db.run(`
        UPDATE copy_trading_configs
        SET enabled = ?, updatedAt = ?
        WHERE id = ?
      `, [enabled ? 1 : 0, new Date().toISOString(), configId]);

      const session = sessions.get(config.userWallet);

      if (enabled) {
        if (session) {
          // Add to existing session
          session.copyService.follow(config.targetWallet);
          session.configs.push({ ...config, enabled: true });
        } else {
          // Start new session
          await startSessionInternal(config.userWallet);
        }
      } else {
        if (session) {
          // Remove from session
          session.copyService.unfollow(config.targetWallet);
          session.configs = session.configs.filter(c => c.id !== configId);

          // Stop session if no more configs
          if (session.configs.filter(c => c.enabled).length === 0) {
            await stopSessionInternal(config.userWallet);
          }
        }
      }

      logger.info({ configId, enabled }, 'Config toggled');
    },

    async deleteConfig(configId: string): Promise<void> {
      const config = await emitter.getConfig(configId);
      if (!config) {
        return;
      }

      // Disable first to clean up session
      if (config.enabled) {
        await emitter.toggleConfig(configId, false);
      }

      db.run('DELETE FROM copy_trading_configs WHERE id = ?', [configId]);
      logger.info({ configId }, 'Config deleted');
    },

    async getConfig(configId: string): Promise<CopyTradingConfigRecord | null> {
      const rows = db.query<any>('SELECT * FROM copy_trading_configs WHERE id = ?', [configId]);
      if (rows.length === 0) {
        return null;
      }
      return rowToConfigRecord(rows[0]);
    },

    async getConfigsForWallet(walletAddress: string): Promise<CopyTradingConfigRecord[]> {
      const rows = db.query<any>(
        'SELECT * FROM copy_trading_configs WHERE userWallet = ? ORDER BY createdAt DESC',
        [walletAddress]
      );
      return rows.map(rowToConfigRecord);
    },

    async hasCredentials(walletAddress: string, platform: 'polymarket' | 'kalshi'): Promise<boolean> {
      return credentialsManager.hasCredentials(walletAddress, platform);
    },

    async getStats(walletAddress: string): Promise<CopyTradingStats> {
      const session = sessions.get(walletAddress);
      if (session) {
        return session.copyService.getStats();
      }

      // Return default stats if no active session
      return {
        totalCopied: 0,
        totalSkipped: 0,
        totalPnl: 0,
        winRate: 0,
        avgReturn: 0,
        openPositions: 0,
        followedAddresses: 0,
      };
    },

    async getAggregatedStats(walletAddress: string): Promise<{
      totalConfigs: number;
      activeConfigs: number;
      totalCopiedTrades: number;
      successfulTrades: number;
      totalPnl: number;
      successRate: number;
      topPerformingTarget?: { wallet: string; pnl: number };
    }> {
      const configs = await emitter.getConfigsForWallet(walletAddress);
      const activeConfigs = configs.filter(c => c.enabled).length;

      // Get trade stats
      const tradeStats = db.query<any>(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'filled' OR status = 'closed' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
          SUM(COALESCE(pnl, 0)) as totalPnl
        FROM copy_trades
        WHERE userWallet = ?
      `, [walletAddress])[0];

      // Get top performing target
      const topTarget = db.query<any>(`
        SELECT targetWallet, SUM(COALESCE(pnl, 0)) as totalPnl
        FROM copy_trades
        WHERE userWallet = ?
        GROUP BY targetWallet
        ORDER BY totalPnl DESC
        LIMIT 1
      `, [walletAddress])[0];

      return {
        totalConfigs: configs.length,
        activeConfigs,
        totalCopiedTrades: tradeStats?.total || 0,
        successfulTrades: tradeStats?.successful || 0,
        totalPnl: tradeStats?.totalPnl || 0,
        successRate: tradeStats?.total > 0
          ? ((tradeStats?.wins || 0) / tradeStats.total) * 100
          : 0,
        topPerformingTarget: topTarget && topTarget.totalPnl > 0
          ? { wallet: topTarget.targetWallet, pnl: topTarget.totalPnl }
          : undefined,
      };
    },

    async getHistory(walletAddress: string, options?: { limit?: number; configId?: string }): Promise<CopyTradeRecord[]> {
      const limit = options?.limit ?? 50;
      let sql = 'SELECT * FROM copy_trades WHERE userWallet = ?';
      const params: any[] = [walletAddress];

      if (options?.configId) {
        sql += ' AND configId = ?';
        params.push(options.configId);
      }

      sql += ' ORDER BY createdAt DESC LIMIT ?';
      params.push(limit);

      const rows = db.query<any>(sql, params);
      return rows.map(rowToTradeRecord);
    },

    async initialize(): Promise<void> {
      if (initialized) {
        return;
      }

      logger.info('Initializing copy trading orchestrator');

      // Load all enabled configs and start sessions
      const enabledConfigs = db.query<any>(
        'SELECT DISTINCT userWallet FROM copy_trading_configs WHERE enabled = 1'
      );

      for (const row of enabledConfigs) {
        try {
          await startSessionInternal(row.userWallet);
        } catch (error) {
          logger.error({ error, walletAddress: row.userWallet }, 'Failed to start session');
        }
      }

      initialized = true;
      logger.info({ sessionCount: sessions.size }, 'Copy trading orchestrator initialized');
    },

    async shutdown(): Promise<void> {
      logger.info('Shutting down copy trading orchestrator');

      const wallets = Array.from(sessions.keys());
      for (const wallet of wallets) {
        await stopSessionInternal(wallet);
      }

      initialized = false;
      logger.info('Copy trading orchestrator shut down');
    },
  } as Partial<CopyTradingOrchestrator>);

  return emitter;
}

// Export singleton creation helper
let orchestratorInstance: CopyTradingOrchestrator | null = null;

export function getCopyTradingOrchestrator(): CopyTradingOrchestrator | null {
  return orchestratorInstance;
}

export function setCopyTradingOrchestrator(orchestrator: CopyTradingOrchestrator): void {
  orchestratorInstance = orchestrator;
}
