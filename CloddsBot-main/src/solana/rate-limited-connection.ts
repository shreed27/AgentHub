/**
 * Rate-Limited Solana Connection
 *
 * Wraps the standard Solana Connection class with rate limiting
 * to avoid hitting RPC rate limits (especially on free tiers).
 */

import { Connection, ConnectionConfig, Commitment, GetVersionedTransactionConfig } from '@solana/web3.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimiterConfig {
  /** Maximum requests per window (default: 50) */
  maxRequests: number;
  /** Window size in milliseconds (default: 1000 = 1 second) */
  windowMs: number;
  /** Whether to queue requests when rate limited (default: true) */
  queueRequests: boolean;
  /** Maximum queue size (default: 100) */
  maxQueueSize: number;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class RateLimiter {
  private requests: number[] = [];
  private queue: Array<() => void> = [];
  private config: Required<RateLimiterConfig>;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? 50,
      windowMs: config.windowMs ?? 1000,
      queueRequests: config.queueRequests ?? true,
      maxQueueSize: config.maxQueueSize ?? 100,
    };
  }

  /**
   * Acquire permission to make a request
   * Blocks until a slot is available
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((t) => now - t < this.config.windowMs);

    // Check if we can make a request
    if (this.requests.length < this.config.maxRequests) {
      this.requests.push(now);
      return;
    }

    // Rate limited - queue the request
    if (!this.config.queueRequests) {
      throw new Error('Rate limit exceeded');
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Rate limit queue full');
    }

    // Wait for a slot
    return new Promise((resolve) => {
      const checkAndResolve = () => {
        const currentTime = Date.now();
        this.requests = this.requests.filter((t) => currentTime - t < this.config.windowMs);

        if (this.requests.length < this.config.maxRequests) {
          this.requests.push(currentTime);
          resolve();
        } else {
          // Calculate wait time until oldest request expires
          const oldestRequest = Math.min(...this.requests);
          const waitTime = this.config.windowMs - (currentTime - oldestRequest) + 10;
          setTimeout(checkAndResolve, Math.max(waitTime, 10));
        }
      };

      this.queue.push(checkAndResolve);
      checkAndResolve();
    });
  }

  /**
   * Get current stats
   */
  getStats(): { currentRequests: number; queueLength: number; maxRequests: number } {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.config.windowMs);

    return {
      currentRequests: this.requests.length,
      queueLength: this.queue.length,
      maxRequests: this.config.maxRequests,
    };
  }
}

// =============================================================================
// RATE-LIMITED CONNECTION
// =============================================================================

export interface RateLimitedConnectionConfig extends ConnectionConfig {
  rateLimiter?: Partial<RateLimiterConfig>;
}

export class RateLimitedConnection extends Connection {
  private limiter: RateLimiter;

  constructor(endpoint: string, commitmentOrConfig?: Commitment | RateLimitedConnectionConfig) {
    // Handle both commitment string and config object
    if (typeof commitmentOrConfig === 'string') {
      super(endpoint, commitmentOrConfig);
      this.limiter = new RateLimiter();
    } else {
      const { rateLimiter, ...connectionConfig } = commitmentOrConfig || {};
      super(endpoint, connectionConfig);
      this.limiter = new RateLimiter(rateLimiter);
    }
  }

  /**
   * Get rate limiter stats
   */
  getRateLimiterStats() {
    return this.limiter.getStats();
  }

  // Override methods that make RPC calls

  override async getBalance(
    publicKey: Parameters<Connection['getBalance']>[0],
    config?: Parameters<Connection['getBalance']>[1]
  ): Promise<ReturnType<Connection['getBalance']>> {
    await this.limiter.acquire();
    return super.getBalance(publicKey, config);
  }

  override async getLatestBlockhash(
    commitmentOrConfig?: Parameters<Connection['getLatestBlockhash']>[0]
  ): Promise<ReturnType<Connection['getLatestBlockhash']>> {
    await this.limiter.acquire();
    return super.getLatestBlockhash(commitmentOrConfig);
  }

  override async sendRawTransaction(
    rawTransaction: Parameters<Connection['sendRawTransaction']>[0],
    options?: Parameters<Connection['sendRawTransaction']>[1]
  ): Promise<ReturnType<Connection['sendRawTransaction']>> {
    await this.limiter.acquire();
    return super.sendRawTransaction(rawTransaction, options);
  }

  override async confirmTransaction(
    ...args: Parameters<Connection['confirmTransaction']>
  ): Promise<ReturnType<Connection['confirmTransaction']>> {
    await this.limiter.acquire();
    return super.confirmTransaction(...args);
  }

  override async getTransaction(
    signature: string,
    rawConfig?: GetVersionedTransactionConfig
  ): Promise<ReturnType<Connection['getTransaction']>> {
    await this.limiter.acquire();
    return super.getTransaction(signature, rawConfig);
  }

  override async getSignaturesForAddress(
    ...args: Parameters<Connection['getSignaturesForAddress']>
  ): Promise<ReturnType<Connection['getSignaturesForAddress']>> {
    await this.limiter.acquire();
    return super.getSignaturesForAddress(...args);
  }

  override async getTokenAccountsByOwner(
    ...args: Parameters<Connection['getTokenAccountsByOwner']>
  ): Promise<ReturnType<Connection['getTokenAccountsByOwner']>> {
    await this.limiter.acquire();
    return super.getTokenAccountsByOwner(...args);
  }

  override async getAccountInfo(
    ...args: Parameters<Connection['getAccountInfo']>
  ): Promise<ReturnType<Connection['getAccountInfo']>> {
    await this.limiter.acquire();
    return super.getAccountInfo(...args);
  }

  override async getProgramAccounts(
    ...args: Parameters<Connection['getProgramAccounts']>
  ): Promise<ReturnType<Connection['getProgramAccounts']>> {
    await this.limiter.acquire();
    return super.getProgramAccounts(...args);
  }

  override async getMultipleAccountsInfo(
    ...args: Parameters<Connection['getMultipleAccountsInfo']>
  ): Promise<ReturnType<Connection['getMultipleAccountsInfo']>> {
    await this.limiter.acquire();
    return super.getMultipleAccountsInfo(...args);
  }

  override async simulateTransaction(
    ...args: Parameters<Connection['simulateTransaction']>
  ): Promise<ReturnType<Connection['simulateTransaction']>> {
    await this.limiter.acquire();
    return super.simulateTransaction(...args);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a rate-limited Solana connection
 */
export function createRateLimitedConnection(
  endpoint?: string,
  config?: RateLimitedConnectionConfig
): RateLimitedConnection {
  const rpcUrl = endpoint || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  return new RateLimitedConnection(rpcUrl, {
    commitment: 'confirmed',
    ...config,
  });
}
