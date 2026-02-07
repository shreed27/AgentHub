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

  // Bounties
  async getBounties(params?: {
    status?: string;
    difficulty?: string;
    tags?: string;
    page?: number;
    per_page?: number;
  }) {
    const queryParams = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<{
      bounties: Array<{
        id: string;
        question: string;
        description?: string;
        reward: { amount: number; token: string };
        poster_wallet: string;
        status: string;
        difficulty: string;
        tags: string[];
        deadline: string;
        created_at: string;
      }>;
      total: number;
      page: number;
      per_page: number;
    }>('GET', `/api/v1/bounties${queryParams}`);
  }

  async getBountyById(id: string) {
    return this.request<{
      bounty: {
        id: string;
        question: string;
        description?: string;
        reward: { amount: number; token: string };
        poster_wallet: string;
        status: string;
        difficulty: string;
        tags: string[];
        deadline: string;
        created_at: string;
      };
      claim: {
        id: string;
        hunter_wallet: string;
        claimed_at: string;
        expires_at: string;
      } | null;
      submission: {
        id: string;
        hunter_wallet: string;
        solution: string;
        confidence: number;
        status: string;
      } | null;
    }>('GET', `/api/v1/bounties/${id}`);
  }

  async createBounty(params: {
    question: string;
    description?: string;
    reward: { amount: number; token: string };
    difficulty?: string;
    tags?: string[];
    deadline?: string;
    poster_wallet: string;
    escrow_tx?: string;
  }) {
    return this.request<{
      created: boolean;
      bounty_id: string;
      bounty: unknown;
      escrow_status: string;
      deposit_instructions?: {
        recipient: string;
        amount: number;
        token: string;
        fee: string;
        note: string;
      };
    }>('POST', '/api/v1/bounties', params);
  }

  async claimBounty(bountyId: string, hunterWallet: string) {
    return this.request<{
      success: boolean;
      claim: {
        id: string;
        bounty_id: string;
        hunter_wallet: string;
        claimed_at: string;
        expires_at: string;
      };
      message: string;
    }>('POST', `/api/v1/bounties/${bountyId}/claim`, { hunter_wallet: hunterWallet });
  }

  async submitSolution(bountyId: string, params: {
    solution: string;
    confidence?: number;
    hunter_wallet: string;
  }) {
    return this.request<{
      success: boolean;
      submission: unknown;
      message: string;
    }>('POST', `/api/v1/bounties/${bountyId}/submit`, params);
  }

  async resolveBounty(bountyId: string, params: {
    approved: boolean;
    poster_wallet: string;
  }) {
    return this.request<{
      success: boolean;
      status: string;
      payout_tx?: string;
      message: string;
    }>('POST', `/api/v1/bounties/${bountyId}/resolve`, params);
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

  // Integrations
  async getAvailablePlatforms() {
    return this.request<{
      messaging: Array<{
        id: string;
        name: string;
        icon: string;
        category: string;
        description: string;
        connected: boolean;
        status: string;
      }>;
      exchange: Array<{
        id: string;
        name: string;
        icon: string;
        category: string;
        description: string;
        connected: boolean;
        status: string;
      }>;
      prediction: Array<{
        id: string;
        name: string;
        icon: string;
        category: string;
        description: string;
        connected: boolean;
        status: string;
      }>;
      notificationEvents: Array<{
        id: string;
        name: string;
        description: string;
      }>;
    }>('GET', '/api/v1/integrations');
  }

  async getConnectedPlatforms() {
    return this.request<Array<{
      id: string;
      userId: string;
      platform: string;
      category: string;
      config?: Record<string, unknown>;
      status: string;
      lastConnectedAt?: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
      name: string;
      icon: string;
      description: string;
    }>>('GET', '/api/v1/integrations/connected');
  }

  async connectPlatform(
    platform: string,
    credentials: Record<string, unknown>,
    config?: Record<string, unknown>
  ) {
    return this.request<{
      id: string;
      platform: string;
      category: string;
      status: string;
      lastConnectedAt?: number;
    }>('POST', `/api/v1/integrations/${platform}/connect`, { credentials, config });
  }

  async disconnectPlatform(platform: string) {
    return this.request<{ message: string }>('POST', `/api/v1/integrations/${platform}/disconnect`);
  }

  async testPlatformConnection(platform: string, credentials?: Record<string, unknown>) {
    return this.request<{
      platform: string;
      testResult: 'passed' | 'failed';
      message: string;
      latencyMs?: number;
    }>('POST', `/api/v1/integrations/${platform}/test`, credentials ? { credentials } : undefined);
  }

  async getPlatformStatus(platform: string) {
    return this.request<{
      platform: string;
      connected: boolean;
      status: string;
      health: string;
      lastConnectedAt?: number;
      lastError?: string;
      latencyMs?: number;
    }>('GET', `/api/v1/integrations/${platform}/status`);
  }

  async sendTestNotification(platform: string) {
    return this.request<{
      sent: boolean;
      message: string;
    }>('POST', `/api/v1/integrations/${platform}/test-notification`);
  }

  // Notification Settings
  async getNotificationSettings() {
    return this.request<Record<string, Record<string, { enabled: boolean; config?: Record<string, unknown> }>>>('GET', '/api/v1/integrations/notifications/settings');
  }

  async updateNotificationSettings(settings: Record<string, Record<string, { enabled: boolean; config?: Record<string, unknown> }>>) {
    return this.request<{ message: string }>('PUT', '/api/v1/integrations/notifications/settings', { settings });
  }

  // ==================== Limit Orders ====================

  async getLimitOrders(walletAddress: string, status?: string) {
    const params = new URLSearchParams({ walletAddress });
    if (status) params.set('status', status);
    return this.request<{
      data: Array<{
        id: string;
        walletAddress: string;
        inputMint: string;
        outputMint: string;
        inputAmount: number;
        targetPrice: number;
        direction: 'above' | 'below';
        status: string;
        expiresAt?: number;
        createdAt: number;
        slippageBps: number;
      }>;
      total: number;
    }>('GET', `/api/v1/limit-orders?${params}`);
  }

  async createLimitOrder(params: {
    walletAddress: string;
    inputMint: string;
    outputMint: string;
    inputAmount: number;
    targetPrice: number;
    direction: 'above' | 'below';
    expiresAt?: number;
    slippageBps?: number;
  }) {
    return this.request<{ data: unknown }>('POST', '/api/v1/limit-orders', params);
  }

  async cancelLimitOrder(orderId: string) {
    return this.request<{ message: string }>('DELETE', `/api/v1/limit-orders/${orderId}`);
  }

  async getLimitOrderStats(walletAddress: string) {
    return this.request<{
      data: {
        active: number;
        executed: number;
        cancelled: number;
        expired: number;
        totalVolume: number;
      };
    }>('GET', `/api/v1/limit-orders/stats?walletAddress=${walletAddress}`);
  }

  // ==================== Leaderboard & Reputation ====================

  async getLeaderboard(params?: { sortBy?: string; limit?: number; offset?: number }) {
    const queryParams = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<{
      data: {
        hunters: Array<{
          rank: number;
          walletAddress: string;
          rank: string;
          totalEarnings: number;
          bountiesCompleted: number;
          successRate: number;
          reputationScore: number;
          badges: Array<{ id: string; name: string; icon: string; rarity: string }>;
        }>;
        total: number;
      };
    }>('GET', `/api/v1/leaderboard${queryParams}`);
  }

  async getHunterReputation(walletAddress: string) {
    return this.request<{
      data: {
        walletAddress: string;
        rank: string;
        totalEarnings: number;
        bountiesCompleted: number;
        bountiesAttempted: number;
        successRate: number;
        specializations: string[];
        badges: Array<{ id: string; name: string; icon: string; rarity: string; earnedAt: number }>;
        streakCurrent: number;
        streakBest: number;
        reputationScore: number;
        nextRank?: { name: string; requiredScore: number; pointsNeeded: number; progress: number };
      };
    }>('GET', `/api/v1/leaderboard/reputation/${walletAddress}`);
  }

  async getBadges() {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
        rarity: string;
      }>;
    }>('GET', '/api/v1/leaderboard/badges');
  }

  async getRanks() {
    return this.request<{
      data: Array<{
        name: string;
        minScore: number;
        icon: string;
      }>;
    }>('GET', '/api/v1/leaderboard/ranks');
  }

  // ==================== Trade Ledger ====================

  async getTradeLedger(params: {
    walletAddress?: string;
    agentId?: string;
    token?: string;
    action?: string;
    decisionSource?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.set(key, String(value));
    });
    return this.request<{
      data: {
        entries: Array<{
          id: string;
          walletAddress: string;
          action: string;
          token: string;
          tokenSymbol?: string;
          chain: string;
          amount: number;
          price: number;
          decisionSource: string;
          reasoning?: string;
          confidence?: number;
          txSignature?: string;
          fees: number;
          slippage: number;
          pnl?: number;
          createdAt: number;
        }>;
        total: number;
      };
    }>('GET', `/api/v1/trade-ledger?${queryParams}`);
  }

  async getTradeLedgerStats(walletAddress: string, startTime?: number) {
    const params = new URLSearchParams({ walletAddress });
    if (startTime) params.set('startTime', String(startTime));
    return this.request<{
      data: {
        totalTrades: number;
        totalVolume: number;
        totalFees: number;
        totalPnl: number;
        winCount: number;
        lossCount: number;
        winRate: number;
        avgTradeSize: number;
        bySource: Record<string, number>;
        byAction: Record<string, number>;
      };
    }>('GET', `/api/v1/trade-ledger/stats?${params}`);
  }

  async getRecentDecisions(walletAddress: string, limit?: number) {
    const params = new URLSearchParams({ walletAddress });
    if (limit) params.set('limit', String(limit));
    return this.request<{
      data: Array<{
        id: string;
        action: string;
        token: string;
        decisionSource: string;
        reasoning: string;
        confidence: number;
        createdAt: number;
      }>;
    }>('GET', `/api/v1/trade-ledger/decisions?${params}`);
  }

  async getConfidenceCalibration(walletAddress: string) {
    return this.request<{
      data: {
        ranges: Array<{ min: number; max: number; count: number; winRate: number }>;
        avgConfidence: number;
        calibrationScore: number;
      };
    }>('GET', `/api/v1/trade-ledger/calibration?walletAddress=${walletAddress}`);
  }

  // ==================== Copy Trading ====================

  async getCopyTradingConfigs(userWallet: string) {
    return this.request<{
      data: Array<{
        id: string;
        userWallet: string;
        targetWallet: string;
        targetLabel?: string;
        enabled: boolean;
        allocationPercent: number;
        maxPositionSize?: number;
        stopLossPercent?: number;
        takeProfitPercent?: number;
        totalTrades: number;
        totalPnl: number;
      }>;
    }>('GET', `/api/v1/copy-trading/configs?userWallet=${userWallet}`);
  }

  async createCopyTradingConfig(params: {
    userWallet: string;
    targetWallet: string;
    targetLabel?: string;
    allocationPercent?: number;
    maxPositionSize?: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
  }) {
    return this.request<{ data: unknown }>('POST', '/api/v1/copy-trading/configs', params);
  }

  async updateCopyTradingConfig(configId: string, params: Record<string, unknown>) {
    return this.request<{ data: unknown }>('PUT', `/api/v1/copy-trading/configs/${configId}`, params);
  }

  async deleteCopyTradingConfig(configId: string) {
    return this.request<{ message: string }>('DELETE', `/api/v1/copy-trading/configs/${configId}`);
  }

  async toggleCopyTradingConfig(configId: string, enabled: boolean) {
    return this.request<{ data: unknown }>('POST', `/api/v1/copy-trading/configs/${configId}/toggle`, { enabled });
  }

  async getCopyTradingHistory(params: { userWallet?: string; configId?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.set(key, String(value));
    });
    return this.request<{
      data: Array<{
        id: string;
        configId: string;
        originalTx: string;
        copiedTx?: string;
        targetWallet: string;
        action: string;
        token: string;
        originalAmount: number;
        copiedAmount?: number;
        status: string;
        pnl?: number;
        createdAt: number;
      }>;
    }>('GET', `/api/v1/copy-trading/history?${queryParams}`);
  }

  async getCopyTradingStats(userWallet: string) {
    return this.request<{
      data: {
        totalConfigs: number;
        activeConfigs: number;
        totalCopiedTrades: number;
        successfulTrades: number;
        totalPnl: number;
        successRate: number;
        topPerformingTarget?: { wallet: string; pnl: number };
      };
    }>('GET', `/api/v1/copy-trading/stats?userWallet=${userWallet}`);
  }

  // ==================== Automation ====================

  async getAutomationRules(userWallet: string) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        description?: string;
        ruleType: string;
        triggerConfig: Record<string, unknown>;
        actionConfig: Record<string, unknown>;
        enabled: boolean;
        lastTriggeredAt?: number;
        nextTriggerAt?: number;
        triggerCount: number;
      }>;
    }>('GET', `/api/v1/automation/rules?userWallet=${userWallet}`);
  }

  async createAutomationRule(params: {
    userWallet: string;
    name: string;
    description?: string;
    ruleType: string;
    triggerConfig: Record<string, unknown>;
    actionConfig: Record<string, unknown>;
    maxTriggers?: number;
    expiresAt?: number;
  }) {
    return this.request<{ data: unknown }>('POST', '/api/v1/automation/rules', params);
  }

  async updateAutomationRule(ruleId: string, params: Record<string, unknown>) {
    return this.request<{ data: unknown }>('PUT', `/api/v1/automation/rules/${ruleId}`, params);
  }

  async deleteAutomationRule(ruleId: string) {
    return this.request<{ message: string }>('DELETE', `/api/v1/automation/rules/${ruleId}`);
  }

  async toggleAutomationRule(ruleId: string, enabled: boolean) {
    return this.request<{ data: unknown }>('POST', `/api/v1/automation/rules/${ruleId}/toggle`, { enabled });
  }

  async getAutomationHistory(params: { userWallet?: string; ruleId?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.set(key, String(value));
    });
    return this.request<{
      data: Array<{
        id: string;
        ruleId: string;
        triggeredAt: number;
        actionTaken: string;
        result: string;
        error?: string;
      }>;
    }>('GET', `/api/v1/automation/history?${queryParams}`);
  }

  async getAutomationStats(userWallet: string) {
    return this.request<{
      data: {
        totalRules: number;
        activeRules: number;
        totalTriggers: number;
        successfulTriggers: number;
        failedTriggers: number;
        byType: Record<string, number>;
      };
    }>('GET', `/api/v1/automation/stats?userWallet=${userWallet}`);
  }

  // ==================== Price History ====================

  async getPriceHistory(token: string, params?: { interval?: string; startTime?: number; endTime?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }
    return this.request<{
      data: {
        token: string;
        interval: string;
        candles: Array<{
          timestamp: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>;
        priceChange: number;
        priceChangePercent: number;
      };
    }>('GET', `/api/v1/prices/${token}/history?${queryParams}`);
  }

  async getPriceStats(token: string, params?: { interval?: string; period?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }
    return this.request<{
      data: {
        token: string;
        high: number;
        low: number;
        open: number;
        close: number;
        avgPrice: number;
        totalVolume: number;
        priceChange: number;
        priceChangePercent: number;
        volatility: number;
      };
    }>('GET', `/api/v1/prices/${token}/stats?${queryParams}`);
  }

  async getLatestPrice(token: string) {
    return this.request<{
      data: {
        token: string;
        price: number;
        timestamp: number;
        high24h: number;
        low24h: number;
        volume: number;
      };
    }>('GET', `/api/v1/prices/${token}/latest`);
  }

  async getBatchPrices(tokens: string[]) {
    return this.request<{
      data: Array<{
        token: string;
        price: number | null;
        timestamp: number | null;
        available: boolean;
      }>;
    }>('GET', `/api/v1/prices/batch?tokens=${tokens.join(',')}`);
  }

  // ==================== Migrations ====================

  async getMigrations(params?: { type?: string; minRankingScore?: number; minGodWalletCount?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }
    return this.request<{
      data: {
        migrations: Array<{
          id: string;
          oldMint: string;
          newMint: string;
          oldSymbol?: string;
          newSymbol?: string;
          migrationType: string;
          detectedAt: number;
          rankingScore: number;
          godWalletCount: number;
          volume24h: number;
          marketCap: number;
        }>;
        total: number;
      };
    }>('GET', `/api/v1/migrations?${queryParams}`);
  }

  async getTopMigrations(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request<{
      data: Array<{
        id: string;
        oldMint: string;
        newMint: string;
        newSymbol?: string;
        migrationType: string;
        rankingScore: number;
        godWalletCount: number;
      }>;
    }>('GET', `/api/v1/migrations/top${params}`);
  }

  async getMigrationsByGodWalletActivity(params?: { minWalletCount?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }
    return this.request<{
      data: Array<{
        id: string;
        newSymbol?: string;
        migrationType: string;
        godWalletCount: number;
        rankingScore: number;
      }>;
    }>('GET', `/api/v1/migrations/god-wallet-activity?${queryParams}`);
  }

  async getMigrationStats() {
    return this.request<{
      data: {
        total: number;
        last24h: number;
        last7d: number;
        byType: Record<string, number>;
        avgRankingScore: number;
        avgGodWalletCount: number;
      };
    }>('GET', '/api/v1/migrations/stats');
  }
}

export const api = new ApiClient(GATEWAY_URL);
export default api;
