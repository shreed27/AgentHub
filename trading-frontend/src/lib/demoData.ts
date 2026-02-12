/**
 * Demo/Mock Data for DAIN Trading Platform
 *
 * This data is used when backend services are unavailable,
 * allowing judges to see the full UI experience.
 */

// Demo mode flag
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  typeof window !== 'undefined' && window.localStorage?.getItem('dain_demo_mode') === 'true';

export const DEMO_WALLETS = {
  godWallets: [
    { address: '5yNvLh...2Fgh', label: 'Whale Alpha', trustScore: 94, emoji: '🐋' },
    { address: '8xKpLm...9Rjw', label: 'DeFi Legend', trustScore: 91, emoji: '🦈' },
    { address: '3mNcPr...5Tws', label: 'Smart Money', trustScore: 88, emoji: '🎯' },
    { address: '7rHvBn...1Kqx', label: 'Early Adopter', trustScore: 85, emoji: '🚀' },
  ],
};

export const DEMO_AGENTS = [
  {
    id: 'agent-001',
    name: 'Jupiter Sniper',
    type: 'dex-trader',
    status: 'active',
    strategy: 'momentum',
    performance: {
      totalTrades: 1247,
      winRate: 68.4,
      totalPnL: 12450.50,
      dailyPnL: 234.20,
    },
    lastAction: 'Bought 0.5 SOL of BONK',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'agent-002',
    name: 'Polymarket Oracle',
    type: 'prediction',
    status: 'active',
    strategy: 'sentiment',
    performance: {
      totalTrades: 89,
      winRate: 72.1,
      totalPnL: 3240.00,
      dailyPnL: 120.50,
    },
    lastAction: 'Bought YES on "Fed rate cut March 2024"',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'agent-003',
    name: 'Arbitrage Hunter',
    type: 'arbitrage',
    status: 'paused',
    strategy: 'cross-platform',
    performance: {
      totalTrades: 456,
      winRate: 94.2,
      totalPnL: 8920.30,
      dailyPnL: 0,
    },
    lastAction: 'Paused - low opportunity volume',
    createdAt: Date.now() - 86400000 * 45,
  },
  {
    id: 'agent-004',
    name: 'Whale Follower',
    type: 'copy-trading',
    status: 'active',
    strategy: 'whale-tracking',
    performance: {
      totalTrades: 234,
      winRate: 61.5,
      totalPnL: 5670.00,
      dailyPnL: 89.40,
    },
    lastAction: 'Following 5yNvLh...2Fgh',
    createdAt: Date.now() - 86400000 * 7,
  },
];

export const DEMO_SIGNALS = [
  {
    id: 'sig-001',
    type: 'whale',
    source: 'God Wallet',
    data: {
      wallet: '5yNvLh...2Fgh',
      action: 'BUY',
      token: 'BONK',
      amount: '125,000',
      usdValue: 2450,
    },
    confidence: 92,
    timestamp: Date.now() - 120000,
  },
  {
    id: 'sig-002',
    type: 'ai',
    source: 'Claude Analysis',
    data: {
      token: 'JUP',
      recommendation: 'ACCUMULATE',
      reasoning: 'Strong on-chain metrics, upcoming token unlock creates buying opportunity',
      priceTarget: 1.85,
    },
    confidence: 78,
    timestamp: Date.now() - 300000,
  },
  {
    id: 'sig-003',
    type: 'arbitrage',
    source: 'Cross-Platform Scanner',
    data: {
      token: 'PYTH',
      buyPlatform: 'Jupiter',
      sellPlatform: 'Raydium',
      spread: '0.8%',
      estimatedProfit: 45.20,
    },
    confidence: 95,
    timestamp: Date.now() - 60000,
  },
  {
    id: 'sig-004',
    type: 'social',
    source: 'Twitter Sentiment',
    data: {
      token: 'WIF',
      sentiment: 'bullish',
      mentions: 12500,
      change24h: '+340%',
    },
    confidence: 65,
    timestamp: Date.now() - 180000,
  },
];

export const DEMO_POSITIONS = [
  {
    id: 'pos-001',
    token: 'So11111111111111111111111111111111111111112',
    tokenSymbol: 'SOL',
    chain: 'solana',
    side: 'long',
    amount: 15.5,
    entryPrice: 98.20,
    currentPrice: 105.40,
    unrealizedPnL: 111.60,
    unrealizedPnLPercent: 7.33,
  },
  {
    id: 'pos-002',
    token: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    tokenSymbol: 'JUP',
    chain: 'solana',
    side: 'long',
    amount: 500,
    entryPrice: 1.45,
    currentPrice: 1.62,
    unrealizedPnL: 85.00,
    unrealizedPnLPercent: 11.72,
  },
  {
    id: 'pos-003',
    token: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    tokenSymbol: 'BONK',
    chain: 'solana',
    side: 'long',
    amount: 50000000,
    entryPrice: 0.000025,
    currentPrice: 0.000028,
    unrealizedPnL: 150.00,
    unrealizedPnLPercent: 12.00,
  },
];

export const DEMO_ARBITRAGE = [
  {
    id: 'arb-001',
    token: 'PYTH',
    buyPlatform: 'Jupiter',
    buyPrice: 0.412,
    sellPlatform: 'Raydium',
    sellPrice: 0.419,
    profitPercent: 1.7,
    confidence: 94,
    volume24h: 2450000,
    expiresIn: '45s',
  },
  {
    id: 'arb-002',
    token: 'JTO',
    buyPlatform: 'Orca',
    buyPrice: 2.85,
    sellPlatform: 'Jupiter',
    sellPrice: 2.89,
    profitPercent: 1.4,
    confidence: 88,
    volume24h: 1890000,
    expiresIn: '2m 10s',
  },
  {
    id: 'arb-003',
    token: 'WIF',
    buyPlatform: 'Raydium',
    buyPrice: 2.12,
    sellPlatform: 'Meteora',
    sellPrice: 2.15,
    profitPercent: 1.4,
    confidence: 82,
    volume24h: 5670000,
    expiresIn: '1m 30s',
  },
];

export const DEMO_COPY_TRADING = {
  configs: [
    {
      id: 'copy-001',
      userWallet: 'demo-wallet',
      targetWallet: '5yNvLh...2Fgh',
      targetLabel: 'Whale Alpha',
      enabled: true,
      dryRun: false,
      sizingMode: 'proportional',
      fixedSize: 0,
      proportionMultiplier: 0.1,
      maxPositionSize: 1000,
      stopLossPercent: 10,
      takeProfitPercent: 25,
      totalTrades: 47,
      totalPnl: 2340.50,
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'copy-002',
      userWallet: 'demo-wallet',
      targetWallet: '8xKpLm...9Rjw',
      targetLabel: 'DeFi Legend',
      enabled: false,
      dryRun: true,
      sizingMode: 'fixed',
      fixedSize: 100,
      proportionMultiplier: 1,
      maxPositionSize: 500,
      stopLossPercent: 15,
      takeProfitPercent: 30,
      totalTrades: 23,
      totalPnl: 890.20,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  history: [
    {
      id: 'trade-001',
      configId: 'copy-001',
      userWallet: 'demo-wallet',
      targetWallet: '5yNvLh...2Fgh',
      marketId: 'SOL/USDC',
      tokenId: 'SOL',
      outcome: 'win',
      side: 'buy',
      originalSize: 1000,
      copiedSize: 100,
      entryPrice: 98.50,
      exitPrice: 105.20,
      status: 'closed',
      pnl: 68.02,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      closedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'trade-002',
      configId: 'copy-001',
      userWallet: 'demo-wallet',
      targetWallet: '5yNvLh...2Fgh',
      marketId: 'JUP/USDC',
      tokenId: 'JUP',
      outcome: 'win',
      side: 'buy',
      originalSize: 500,
      copiedSize: 50,
      entryPrice: 1.42,
      exitPrice: 1.58,
      status: 'closed',
      pnl: 5.63,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      closedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  stats: {
    totalConfigs: 2,
    activeConfigs: 1,
    totalCopiedTrades: 70,
    successfulTrades: 48,
    totalPnl: 3230.70,
    successRate: 68.6,
    topPerformingTarget: { wallet: '5yNvLh...2Fgh', pnl: 2340.50 },
  },
};

export const DEMO_SURVIVAL_MODE = {
  status: {
    enabled: true,
    currentState: 'SURVIVAL',
    portfolioValue: 12450.50,
    portfolioChange: -8.5,
    healthRatio: 0.915,
    initialBalance: 13600,
    stateHistory: [
      { state: 'GROWTH', timestamp: Date.now() - 86400000 * 5, portfolioValue: 14960 },
      { state: 'SURVIVAL', timestamp: Date.now() - 86400000 * 2, portfolioValue: 12800 },
    ],
  },
  states: [
    { name: 'CRITICAL', threshold: 0.5, color: 'red', description: 'Full hibernation - preserve capital' },
    { name: 'DEFENSIVE', threshold: 0.85, color: 'orange', description: 'Positions reduced 50%' },
    { name: 'SURVIVAL', threshold: 1.0, color: 'yellow', description: 'Normal operations' },
    { name: 'GROWTH', threshold: 1.2, color: 'green', description: 'Aggressive mode unlocked' },
  ],
};

export const DEMO_LEADERBOARD = [
  {
    position: 1,
    walletAddress: '7xPqRm...3Ksw',
    rankTitle: 'Legendary Hunter',
    totalEarnings: 45600,
    bountiesCompleted: 234,
    successRate: 94.2,
    reputationScore: 4850,
    badges: [
      { id: 'first-blood', name: 'First Blood', icon: '🩸', rarity: 'common' },
      { id: 'whale-hunter', name: 'Whale Hunter', icon: '🐋', rarity: 'legendary' },
      { id: 'speed-demon', name: 'Speed Demon', icon: '⚡', rarity: 'rare' },
    ],
  },
  {
    position: 2,
    walletAddress: '4mNcKr...8Tjw',
    rankTitle: 'Master Hunter',
    totalEarnings: 38200,
    bountiesCompleted: 189,
    successRate: 91.5,
    reputationScore: 4120,
    badges: [
      { id: 'early-bird', name: 'Early Bird', icon: '🐦', rarity: 'rare' },
      { id: 'consistency', name: 'Consistent', icon: '🎯', rarity: 'epic' },
    ],
  },
  {
    position: 3,
    walletAddress: '9rHvBn...5Qpx',
    rankTitle: 'Expert Hunter',
    totalEarnings: 29800,
    bountiesCompleted: 156,
    successRate: 88.4,
    reputationScore: 3560,
    badges: [
      { id: 'defi-expert', name: 'DeFi Expert', icon: '💎', rarity: 'epic' },
    ],
  },
];

export const DEMO_BOUNTIES = [
  {
    id: 'bounty-001',
    question: 'Find the next 10x memecoin before it pumps',
    description: 'Analyze on-chain data, social sentiment, and wallet activity to identify undervalued memecoins',
    reward: { amount: 500, token: 'USDC' },
    poster_wallet: '5yNvLh...2Fgh',
    status: 'open',
    difficulty: 'hard',
    tags: ['memecoin', 'analysis', 'alpha'],
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'bounty-002',
    question: 'Track whale wallet 8xKp... recent activity pattern',
    description: 'Document all transactions in the last 7 days and identify trading patterns',
    reward: { amount: 200, token: 'USDC' },
    poster_wallet: '3mNcPr...5Tws',
    status: 'claimed',
    difficulty: 'medium',
    tags: ['whale-tracking', 'analysis'],
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'bounty-003',
    question: 'Predict Fed interest rate decision outcome',
    description: 'Provide analysis and probability estimate for next FOMC meeting outcome',
    reward: { amount: 1000, token: 'USDC' },
    poster_wallet: '7rHvBn...1Kqx',
    status: 'open',
    difficulty: 'expert',
    tags: ['macro', 'prediction', 'fed'],
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const DEMO_RISK_METRICS = {
  portfolioVaR: {
    daily95: 850.20,
    daily99: 1240.50,
    weekly95: 2100.30,
  },
  drawdown: {
    current: -8.5,
    max: -15.2,
    duration: 3,
  },
  exposure: {
    totalLong: 8500,
    totalShort: 0,
    netExposure: 8500,
    leverageRatio: 1.0,
  },
  circuitBreaker: {
    enabled: true,
    triggered: false,
    threshold: -20,
    cooldownMinutes: 60,
  },
};

export const DEMO_MARKET_STATS = {
  totalVolume24h: 125000000,
  totalTrades24h: 45600,
  activePredictionMarkets: 234,
  activeArbitrageOpportunities: 12,
  topGainers: [
    { symbol: 'WIF', change: 34.5 },
    { symbol: 'BONK', change: 22.1 },
    { symbol: 'POPCAT', change: 18.7 },
  ],
  topLosers: [
    { symbol: 'MYRO', change: -12.3 },
    { symbol: 'BOME', change: -8.9 },
    { symbol: 'SLERF', change: -6.2 },
  ],
  sentiment: 'bullish',
  fearGreedIndex: 72,
};

export const DEMO_SKILLS = [
  { id: 'arbitrage', name: 'Arbitrage Scanner', category: 'Trading', enabled: true, usageCount: 1250 },
  { id: 'copy-trading', name: 'Copy Trading', category: 'Trading', enabled: true, usageCount: 890 },
  { id: 'whale-tracking', name: 'Whale Tracking', category: 'Analytics', enabled: true, usageCount: 2340 },
  { id: 'ai-analysis', name: 'AI Token Analysis', category: 'AI', enabled: true, usageCount: 3450 },
  { id: 'backtest', name: 'Strategy Backtest', category: 'Tools', enabled: true, usageCount: 560 },
  { id: 'risk-management', name: 'Risk Management', category: 'Risk', enabled: true, usageCount: 780 },
  { id: 'jupiter-swap', name: 'Jupiter Swap', category: 'DEX', enabled: true, usageCount: 5670 },
  { id: 'limit-orders', name: 'Limit Orders', category: 'DEX', enabled: true, usageCount: 1230 },
  { id: 'portfolio-tracker', name: 'Portfolio Tracker', category: 'Analytics', enabled: true, usageCount: 4560 },
  { id: 'survival-mode', name: 'Survival Mode', category: 'Risk', enabled: true, usageCount: 340 },
  { id: 'signal-feed', name: 'Signal Feed', category: 'Trading', enabled: true, usageCount: 2890 },
  { id: 'automation', name: 'Trading Automation', category: 'Tools', enabled: true, usageCount: 670 },
];

// Helper to check if demo mode and return appropriate data
export function withDemoFallback<T>(
  apiPromise: Promise<{ success: boolean; data?: T; error?: string }>,
  demoData: T,
  forceDemo = false
): Promise<{ success: boolean; data: T; source?: string }> {
  if (DEMO_MODE || forceDemo) {
    return Promise.resolve({ success: true, data: demoData, source: 'demo' });
  }

  return apiPromise
    .then((result) => {
      if (result.success && result.data) {
        return { success: true, data: result.data, source: 'live' };
      }
      // API failed, fall back to demo data
      console.log('API unavailable, using demo data');
      return { success: true, data: demoData, source: 'demo' };
    })
    .catch(() => {
      console.log('API error, using demo data');
      return { success: true, data: demoData, source: 'demo' };
    });
}

// Demo mode banner component data
export const DEMO_BANNER = {
  message: 'Demo Mode - Showing sample data. Connect wallet and start services for live trading.',
  learnMoreUrl: '/docs/getting-started',
};
