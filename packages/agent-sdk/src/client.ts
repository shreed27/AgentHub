/**
 * DAIN Client - Main entry point for the SDK
 */

import type {
  DainConfig,
  Agent,
  RegisterAgentParams,
  Signal,
  SurvivalStatus,
  CopyTradingConfig,
  ApiResponse,
} from './types';
import { SolanaModule } from './solana';
import { PredictionModule } from './prediction';
import { FuturesModule } from './futures';
import { SurvivalMode } from './survival';

const DEFAULT_BASE_URLS = {
  production: 'https://api.dain.dev',
  staging: 'https://staging-api.dain.dev',
  local: 'http://localhost:4000',
};

export class DainClient {
  private config: Required<DainConfig>;
  private agentId: string | null = null;

  /** Solana DEX trading (Jupiter, Raydium, etc.) */
  public readonly solana: SolanaModule;

  /** Prediction markets (Polymarket, Kalshi, etc.) */
  public readonly prediction: PredictionModule;

  /** Perpetual futures (Hyperliquid, Binance, etc.) */
  public readonly futures: FuturesModule;

  /** Survival Mode risk management */
  public readonly survival: SurvivalMode;

  constructor(config: DainConfig) {
    this.config = {
      apiKey: config.apiKey,
      environment: config.environment || 'production',
      baseUrl: config.baseUrl || DEFAULT_BASE_URLS[config.environment || 'production'],
      timeout: config.timeout || 30000,
      debug: config.debug || false,
    };

    // Initialize modules
    this.solana = new SolanaModule(this);
    this.prediction = new PredictionModule(this);
    this.futures = new FuturesModule(this);
    this.survival = new SurvivalMode(this);
  }

  /**
   * Register a new agent with DAIN
   *
   * @example
   * ```ts
   * const agent = await dain.registerAgent({
   *   name: 'my-trading-bot',
   *   permissions: ['SWAP', 'LIMIT_ORDER'],
   *   survivalConfig: {
   *     initialBalance: 10000,
   *     autoKillOnCritical: true
   *   }
   * });
   * ```
   */
  async registerAgent(params: RegisterAgentParams): Promise<Agent> {
    const response = await this.request<Agent>('POST', '/api/v1/agents', params);

    if (response.success && response.data) {
      this.agentId = response.data.id;
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to register agent');
  }

  /**
   * Get the current agent's info
   */
  async getAgent(): Promise<Agent> {
    this.ensureAgent();
    const response = await this.request<Agent>('GET', `/api/v1/agents/${this.agentId}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get agent');
  }

  /**
   * Pause the agent - stops all trading activity
   */
  async pauseAgent(): Promise<void> {
    this.ensureAgent();
    await this.request('PUT', `/api/v1/agents/${this.agentId}/pause`);
  }

  /**
   * Resume the agent
   */
  async resumeAgent(): Promise<void> {
    this.ensureAgent();
    await this.request('PUT', `/api/v1/agents/${this.agentId}/resume`);
  }

  /**
   * Emergency kill switch - closes all positions and stops agent
   *
   * @example
   * ```ts
   * // Emergency: close everything and stop
   * const result = await dain.killAgent();
   * console.log(`Closed ${result.positionsClosed} positions`);
   * ```
   */
  async killAgent(): Promise<{ positionsClosed: number; fundsReturned: number }> {
    this.ensureAgent();
    const response = await this.request<{ positionsClosed: number; fundsReturned: number }>(
      'PUT',
      `/api/v1/agents/${this.agentId}/kill`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to kill agent');
  }

  /**
   * Get incoming signals (whale alerts, AI analysis, arbitrage opportunities)
   */
  async getSignals(options?: {
    source?: string[];
    limit?: number;
    since?: Date;
  }): Promise<Signal[]> {
    this.ensureAgent();
    const response = await this.request<Signal[]>('GET', '/api/v1/signals', options);

    return response.data || [];
  }

  /**
   * Configure copy trading for a target wallet
   */
  async configureCopyTrading(config: Omit<CopyTradingConfig, 'id' | 'agentId'>): Promise<CopyTradingConfig> {
    this.ensureAgent();
    const response = await this.request<CopyTradingConfig>(
      'POST',
      '/api/v1/copy-trading/configs',
      { ...config, agentId: this.agentId }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to configure copy trading');
  }

  /**
   * Get all copy trading configurations
   */
  async getCopyTradingConfigs(): Promise<CopyTradingConfig[]> {
    this.ensureAgent();
    const response = await this.request<CopyTradingConfig[]>('GET', '/api/v1/copy-trading/configs');

    return response.data || [];
  }

  /**
   * Connect an existing agent by ID
   */
  connectAgent(agentId: string): void {
    this.agentId = agentId;
  }

  /**
   * Get the current agent ID
   */
  getAgentId(): string | null {
    return this.agentId;
  }

  /**
   * Internal: Make an authenticated API request
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-Agent-Id': this.agentId || '',
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    if (this.config.debug) {
      console.log(`[DAIN] ${method} ${url}`, body || '');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (this.config.debug) {
        console.log(`[DAIN] Response:`, data);
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data.message || data.error || 'Request failed',
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
        metadata: {
          requestId: response.headers.get('x-request-id') || '',
          timestamp: new Date(),
          latencyMs: 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Request timed out after ${this.config.timeout}ms`,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private ensureAgent(): void {
    if (!this.agentId) {
      throw new Error('No agent connected. Call registerAgent() or connectAgent() first.');
    }
  }
}
