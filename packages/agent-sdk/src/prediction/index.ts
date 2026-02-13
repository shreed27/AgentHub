/**
 * Prediction Module - Trade on prediction markets
 * Supports: Polymarket, Kalshi, Manifold, Metaculus, PredictIt, Betfair, Smarkets
 */

import type {
  PredictionBetParams,
  PredictionPlatform,
  TradeResult,
  Position,
} from '../types';
import type { DainClient } from '../client';

export interface Market {
  id: string;
  platform: PredictionPlatform;
  question: string;
  description?: string;
  outcomes: Outcome[];
  volume: number;
  liquidity: number;
  closeTime?: Date;
  category?: string;
  tags?: string[];
  url?: string;
}

export interface Outcome {
  id: string;
  name: string;
  price: number;        // 0-1 (probability)
  previousPrice?: number;
  volume24h?: number;
}

export interface SearchOptions {
  platform?: PredictionPlatform | PredictionPlatform[];
  query?: string;
  category?: string;
  minVolume?: number;
  minLiquidity?: number;
  limit?: number;
  offset?: number;
}

export interface ArbitrageOpportunity {
  markets: Array<{
    platform: PredictionPlatform;
    marketId: string;
    question: string;
    outcome: string;
    price: number;
  }>;
  profit: number;       // Expected profit percentage
  confidence: number;   // 0-1 confidence score
  totalRequired: number;
}

/**
 * Prediction markets module
 *
 * @example
 * ```ts
 * // Search for markets
 * const markets = await dain.prediction.searchMarkets({
 *   query: 'Bitcoin price',
 *   platform: 'polymarket',
 *   minVolume: 10000
 * });
 *
 * // Place a bet
 * const result = await dain.prediction.placeBet({
 *   platform: 'polymarket',
 *   marketId: markets[0].id,
 *   outcome: 'YES',
 *   amount: 100,
 *   maxPrice: 0.65
 * });
 * ```
 */
export class PredictionModule {
  constructor(private client: DainClient) {}

  /**
   * Search for prediction markets across platforms
   */
  async searchMarkets(options: SearchOptions = {}): Promise<Market[]> {
    const response = await this.client.request<Market[]>('GET', '/api/v1/markets/search', options);

    return response.data || [];
  }

  /**
   * Get a specific market by ID
   */
  async getMarket(platform: PredictionPlatform, marketId: string): Promise<Market> {
    const response = await this.client.request<Market>(
      'GET',
      `/api/v1/markets/${platform}/${marketId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get market');
  }

  /**
   * Get trending markets
   */
  async getTrendingMarkets(options?: {
    platform?: PredictionPlatform;
    limit?: number;
  }): Promise<Market[]> {
    const response = await this.client.request<Market[]>('GET', '/api/v1/markets/trending', options);

    return response.data || [];
  }

  /**
   * Place a bet on a prediction market
   *
   * @param params - Bet parameters
   * @returns Trade execution result
   */
  async placeBet(params: PredictionBetParams): Promise<TradeResult> {
    const response = await this.client.request<TradeResult>('POST', '/api/v1/execution/bet', params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to place bet');
  }

  /**
   * Sell/exit a position
   *
   * @param positionId - Position to sell
   * @param amount - Amount to sell (optional, defaults to full position)
   */
  async sellPosition(positionId: string, amount?: number): Promise<TradeResult> {
    const response = await this.client.request<TradeResult>('POST', '/api/v1/execution/sell', {
      positionId,
      amount,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to sell position');
  }

  /**
   * Get all prediction market positions
   */
  async getPositions(platform?: PredictionPlatform): Promise<Position[]> {
    const response = await this.client.request<Position[]>('GET', '/api/v1/positions', {
      type: 'PREDICTION',
      platform,
    });

    return response.data || [];
  }

  /**
   * Find arbitrage opportunities across platforms
   */
  async findArbitrage(options?: {
    minProfit?: number;   // Minimum profit % (default: 2)
    maxRisk?: number;     // Maximum risk tolerance
    platforms?: PredictionPlatform[];
  }): Promise<ArbitrageOpportunity[]> {
    const response = await this.client.request<ArbitrageOpportunity[]>(
      'GET',
      '/api/v1/arbitrage/opportunities',
      options
    );

    return response.data || [];
  }

  /**
   * Execute an arbitrage opportunity
   *
   * @param opportunity - The arbitrage opportunity to execute
   * @param totalAmount - Total amount to deploy
   */
  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    totalAmount: number
  ): Promise<TradeResult[]> {
    const response = await this.client.request<TradeResult[]>(
      'POST',
      '/api/v1/arbitrage/execute',
      { opportunity, totalAmount }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to execute arbitrage');
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): PredictionPlatform[] {
    return [
      'polymarket',
      'kalshi',
      'manifold',
      'metaculus',
      'predictit',
      'betfair',
      'smarkets',
    ];
  }
}

// Re-export types
export type { PredictionPlatform, PredictionBetParams };
