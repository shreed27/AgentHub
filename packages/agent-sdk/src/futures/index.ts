/**
 * Futures Module - Trade perpetual futures
 * Supports: Hyperliquid, Binance, Bybit, Drift
 */

import type {
  FuturesParams,
  FuturesExchange,
  TradeResult,
  Position,
} from '../types';
import type { DainClient } from '../client';

export interface FuturesMarket {
  symbol: string;
  exchange: FuturesExchange;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  nextFundingTime?: Date;
  maxLeverage: number;
  minOrderSize: number;
}

export interface FuturesPosition extends Position {
  exchange: FuturesExchange;
  liquidationPrice: number;
  marginUsed: number;
  maintenanceMargin: number;
  fundingPaid: number;
  markPrice: number;
  indexPrice: number;
}

export interface FundingRate {
  exchange: FuturesExchange;
  symbol: string;
  rate: number;
  nextFundingTime: Date;
  predictedRate?: number;
}

/**
 * Perpetual futures trading module
 *
 * @example
 * ```ts
 * // Open a leveraged position
 * const result = await dain.futures.openPosition({
 *   exchange: 'hyperliquid',
 *   symbol: 'BTC-USD',
 *   side: 'LONG',
 *   amount: 1000,
 *   leverage: 10,
 *   stopLoss: 0.05,      // 5% stop loss
 *   takeProfit: 0.15     // 15% take profit
 * });
 *
 * // Close position
 * await dain.futures.closePosition(result.positionId);
 * ```
 */
export class FuturesModule {
  constructor(private client: DainClient) {}

  /**
   * Get available futures markets
   */
  async getMarkets(exchange?: FuturesExchange): Promise<FuturesMarket[]> {
    const response = await this.client.request<FuturesMarket[]>(
      'GET',
      '/api/v1/futures/markets',
      { exchange }
    );

    return response.data || [];
  }

  /**
   * Get a specific market
   */
  async getMarket(exchange: FuturesExchange, symbol: string): Promise<FuturesMarket> {
    const response = await this.client.request<FuturesMarket>(
      'GET',
      `/api/v1/futures/markets/${exchange}/${symbol}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get market');
  }

  /**
   * Open a futures position
   *
   * @param params - Position parameters
   * @returns Trade execution result
   */
  async openPosition(params: FuturesParams): Promise<TradeResult & { positionId: string }> {
    const response = await this.client.request<TradeResult & { positionId: string }>(
      'POST',
      '/api/v1/futures/open',
      params
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to open position');
  }

  /**
   * Close a futures position
   *
   * @param positionId - Position to close
   * @param amount - Partial close amount (optional, defaults to full)
   */
  async closePosition(positionId: string, amount?: number): Promise<TradeResult> {
    const response = await this.client.request<TradeResult>(
      'POST',
      '/api/v1/futures/close',
      { positionId, amount }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to close position');
  }

  /**
   * Modify position parameters (stop loss, take profit, leverage)
   */
  async modifyPosition(
    positionId: string,
    params: {
      stopLoss?: number;
      takeProfit?: number;
      leverage?: number;
    }
  ): Promise<void> {
    const response = await this.client.request(
      'PUT',
      `/api/v1/futures/positions/${positionId}`,
      params
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to modify position');
    }
  }

  /**
   * Get all open futures positions
   */
  async getPositions(exchange?: FuturesExchange): Promise<FuturesPosition[]> {
    const response = await this.client.request<FuturesPosition[]>(
      'GET',
      '/api/v1/futures/positions',
      { exchange }
    );

    return response.data || [];
  }

  /**
   * Get current funding rates
   */
  async getFundingRates(exchange?: FuturesExchange): Promise<FundingRate[]> {
    const response = await this.client.request<FundingRate[]>(
      'GET',
      '/api/v1/futures/funding-rates',
      { exchange }
    );

    return response.data || [];
  }

  /**
   * Get leverage limits for a symbol
   */
  async getLeverageLimits(
    exchange: FuturesExchange,
    symbol: string
  ): Promise<{ min: number; max: number; default: number }> {
    const response = await this.client.request<{ min: number; max: number; default: number }>(
      'GET',
      `/api/v1/futures/leverage-limits/${exchange}/${symbol}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get leverage limits');
  }

  /**
   * Set account-wide leverage for an exchange
   */
  async setLeverage(exchange: FuturesExchange, symbol: string, leverage: number): Promise<void> {
    const response = await this.client.request(
      'PUT',
      '/api/v1/futures/leverage',
      { exchange, symbol, leverage }
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to set leverage');
    }
  }

  /**
   * Get max leverage by exchange
   */
  getMaxLeverage(exchange: FuturesExchange): number {
    const limits: Record<FuturesExchange, number> = {
      hyperliquid: 50,
      binance: 125,
      bybit: 100,
      drift: 20,
    };
    return limits[exchange];
  }

  /**
   * Get supported exchanges
   */
  getSupportedExchanges(): FuturesExchange[] {
    return ['hyperliquid', 'binance', 'bybit', 'drift'];
  }
}

// Re-export types
export type { FuturesExchange, FuturesParams };
