/**
 * API Client for Super Trading Platform Gateway
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health
  async getHealth() {
    return this.request<{
      status: string;
      services: Array<{
        name: string;
        healthy: boolean;
        latencyMs?: number;
      }>;
    }>('GET', '/api/v1/health');
  }

  // Agents
  async getAgents() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      performance: {
        totalTrades: number;
        winRate: number;
        totalPnL: number;
        dailyPnL: number;
      };
    }>>('GET', '/api/v1/agents');
  }

  async createAgent(params: {
    name: string;
    type: string;
    strategyId?: string;
    walletAddress?: string;
    config?: Record<string, unknown>;
  }) {
    return this.request<{ id: string }>('POST', '/api/v1/agents', params);
  }

  async updateAgentStatus(agentId: string, status: string) {
    return this.request('PUT', `/api/v1/agents/${agentId}/status`, { status });
  }

  async killAgent(agentId: string) {
    return this.request('PUT', `/api/v1/agents/${agentId}/kill`);
  }

  // Execution
  async createIntent(params: {
    agentId: string;
    action: 'buy' | 'sell' | 'close';
    marketType: string;
    chain: string;
    asset: string;
    amount: number;
    constraints?: {
      maxSlippageBps?: number;
      stopLoss?: number;
      takeProfit?: number;
    };
  }) {
    return this.request<{ id: string }>('POST', '/api/v1/execution/intent', params);
  }

  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    chain?: string;
  }) {
    const queryParams = new URLSearchParams(params as Record<string, string>);
    return this.request<{
      inputAmount: string;
      outputAmount: string;
      priceImpact: string;
      routePlan: Array<{ protocol: string; percent: number }>;
    }>('POST', '/api/v1/execution/quote', params);
  }

  async executeSwap(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    walletPrivateKey?: string;
    chain?: string;
  }) {
    return this.request<{
      txHash: string;
      executedAmount: number;
      executedPrice: number;
    }>('POST', '/api/v1/execution/swap', params);
  }

  async getRoutes(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    chain?: string;
  }) {
    return this.request<{
      routes: Array<{
        executor: string;
        platform: string;
        estimatedPrice: number;
        estimatedSlippage: number;
        score: number;
      }>;
      recommended: { executor: string; platform: string };
    }>('POST', '/api/v1/execution/routes', params);
  }

  // Signals
  async getSignals(params?: {
    source?: string;
    type?: string;
    minConfidence?: number;
    limit?: number;
  }) {
    const queryParams = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<Array<{
      id: string;
      source: string;
      type: string;
      data: unknown;
      confidence: number;
      timestamp: number;
    }>>('GET', `/api/v1/signals${queryParams}`);
  }

  async getGodWallets() {
    return this.request<Array<{
      address: string;
      label: string;
      trustScore: number;
      totalTrades: number;
      winRate: number;
      recentBuys: Array<{
        tokenMint: string;
        tokenSymbol: string;
        amount: number;
        timestamp: number;
      }>;
    }>>('GET', '/api/v1/signals/god-wallets');
  }

  // Portfolio
  async getPositions(agentId?: string) {
    const queryParams = agentId ? `?agentId=${agentId}` : '';
    return this.request<{
      positions: Array<{
        id: string;
        token: string;
        tokenSymbol: string;
        chain: string;
        side: string;
        amount: number;
        entryPrice: number;
        currentPrice: number;
        unrealizedPnL: number;
        unrealizedPnLPercent: number;
      }>;
      summary: {
        totalPositions: number;
        totalUnrealizedPnL: number;
        totalValue: number;
      };
    }>('GET', `/api/v1/portfolio/positions${queryParams}`);
  }

  async getWalletPortfolio(walletAddress: string) {
    return this.request<{
      solBalance: number;
      solUsdValue: number;
      tokens: Array<{
        mint: string;
        symbol: string;
        balance: number;
        usdValue: number;
      }>;
      totalUsdValue: number;
    }>('GET', `/api/v1/portfolio/wallet/${walletAddress}`);
  }

  async getHoldings() {
    return this.request<Array<{
      token: string;
      symbol: string;
      amount: number;
      value: number;
      pnl: number;
    }>>('GET', '/api/v1/portfolio/holdings');
  }

  // Market
  async getTokenPrice(mint: string) {
    return this.request<{
      mint: string;
      price: number;
      symbol: string;
    }>('GET', `/api/v1/market/prices/${mint}`);
  }

  async getTrendingTokens() {
    return this.request<Array<{
      symbol: string;
      name: string;
      price: number;
      change24h: number;
    }>>('GET', '/api/v1/market/trending');
  }

  async getPredictionMarkets() {
    return this.request<Array<{
      id: string;
      platform: string;
      question: string;
      outcomes: Array<{ name: string; price: number }>;
      volume24h: number;
      liquidity: number;
    }>>('GET', '/api/v1/market/prediction-markets');
  }

  async getArbitrageOpportunities() {
    return this.request<Array<{
      id: string;
      token: string;
      buyPlatform: string;
      buyPrice: number;
      sellPlatform: string;
      sellPrice: number;
      profitPercent: number;
      confidence: number;
    }>>('GET', '/api/v1/market/arbitrage');
  }

  async getOsintBounties() {
    return this.request<Array<{
      id: string;
      question: string;
      reward: { token: string; amount: number };
      status: string;
      difficulty: string;
      deadline: number;
    }>>('GET', '/api/v1/market/osint/bounties');
  }

  async getMarketStats() {
    return this.request<{
      totalVolume24h: number;
      totalTrades24h: number;
      activePredictionMarkets: number;
      activeArbitrageOpportunities: number;
      topGainers: Array<{ symbol: string; change: number }>;
      topLosers: Array<{ symbol: string; change: number }>;
      sentiment: string;
      fearGreedIndex: number;
    }>('GET', '/api/v1/market/stats');
  }
}

export const api = new ApiClient(GATEWAY_URL);
export default api;
