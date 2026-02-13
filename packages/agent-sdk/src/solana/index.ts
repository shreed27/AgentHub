/**
 * Solana Module - Trade on Solana DEXs via Jupiter V6
 */

import type {
  SwapParams,
  LimitOrderParams,
  TradeResult,
  Position,
  ApiResponse,
} from '../types';
import type { DainClient } from '../client';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  slippageBps: number;
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  price?: number;
  logoURI?: string;
}

export interface Portfolio {
  wallet: string;
  totalValueUsd: number;
  tokens: Array<{
    mint: string;
    symbol: string;
    balance: number;
    valueUsd: number;
  }>;
}

export interface LimitOrder {
  id: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  limitPrice: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  filledAt?: Date;
}

/**
 * Solana trading module - Jupiter V6 integration
 *
 * @example
 * ```ts
 * // Get a quote
 * const quote = await dain.solana.getQuote({
 *   inputMint: 'So11111111111111111111111111111111111111112',  // SOL
 *   outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
 *   amount: 1_000_000_000, // 1 SOL in lamports
 *   slippage: 0.5
 * });
 *
 * // Execute the swap
 * const result = await dain.solana.swap({
 *   inputMint: 'So11111111111111111111111111111111111111112',
 *   outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   amount: 1_000_000_000,
 *   slippage: 0.5
 * });
 * ```
 */
export class SolanaModule {
  constructor(private client: DainClient) {}

  /**
   * Get a swap quote from Jupiter V6
   *
   * @param params - Swap parameters
   * @returns Quote with routing info and price impact
   */
  async getQuote(params: SwapParams): Promise<JupiterQuote> {
    const response = await this.client.request<JupiterQuote>('POST', '/api/v1/execution/quote', {
      platform: 'jupiter',
      ...params,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get quote');
  }

  /**
   * Execute a swap via Jupiter V6
   *
   * @param params - Swap parameters
   * @returns Transaction result with signature
   */
  async swap(params: SwapParams): Promise<TradeResult> {
    const response = await this.client.request<TradeResult>('POST', '/api/v1/execution/swap', {
      platform: 'jupiter',
      ...params,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to execute swap');
  }

  /**
   * Create a limit order (auto-executed when price hits target)
   *
   * @param params - Limit order parameters
   * @returns Created limit order
   */
  async createLimitOrder(params: LimitOrderParams): Promise<LimitOrder> {
    const response = await this.client.request<LimitOrder>('POST', '/api/v1/limit-orders', {
      platform: 'jupiter',
      ...params,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to create limit order');
  }

  /**
   * Get all limit orders for the agent
   */
  async getLimitOrders(status?: 'pending' | 'filled' | 'cancelled'): Promise<LimitOrder[]> {
    const response = await this.client.request<LimitOrder[]>('GET', '/api/v1/limit-orders', {
      status,
    });

    return response.data || [];
  }

  /**
   * Cancel a limit order
   */
  async cancelLimitOrder(orderId: string): Promise<void> {
    const response = await this.client.request('DELETE', `/api/v1/limit-orders/${orderId}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to cancel order');
    }
  }

  /**
   * Get token price
   *
   * @param mint - Token mint address
   * @returns Price in USD
   */
  async getPrice(mint: string): Promise<number> {
    const response = await this.client.request<{ price: number }>('GET', `/api/v1/prices/${mint}`);

    if (response.success && response.data) {
      return response.data.price;
    }

    throw new Error(response.error?.message || 'Failed to get price');
  }

  /**
   * Get token info
   */
  async getTokenInfo(mint: string): Promise<TokenInfo> {
    const response = await this.client.request<TokenInfo>('GET', `/api/v1/tokens/${mint}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get token info');
  }

  /**
   * Get portfolio for a wallet
   *
   * @param wallet - Wallet address (optional, defaults to agent wallet)
   */
  async getPortfolio(wallet?: string): Promise<Portfolio> {
    const path = wallet ? `/api/v1/portfolio/${wallet}` : '/api/v1/portfolio';
    const response = await this.client.request<Portfolio>('GET', path);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to get portfolio');
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<Position[]> {
    const response = await this.client.request<Position[]>('GET', '/api/v1/positions', {
      type: 'SPOT',
      platform: 'solana',
    });

    return response.data || [];
  }
}

// Common Solana token addresses
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
} as const;
