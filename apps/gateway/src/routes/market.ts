import { Router, Request, Response } from 'express';
import type { ServiceRegistry } from '../services/registry.js';

export const marketRouter = Router();

// GET /api/v1/market/prices/:mint - Get token price
marketRouter.get('/prices/:mint', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('agent-dex');
    const response = await client.get(`/api/v1/prices/${req.params.mint}`);

    return res.json({
      success: true,
      source: 'agent-dex',
      data: response.data.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch price from agent-dex');

    // Mock price data
    res.json({
      success: true,
      source: 'mock',
      data: {
        mint: req.params.mint,
        price: 100,
        symbol: 'TOKEN',
      },
    });
  }
});

// GET /api/v1/market/prices - Get multiple token prices
marketRouter.get('/prices', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;
  const { mints } = req.query;

  if (!mints) {
    return res.status(400).json({
      success: false,
      error: 'mints query parameter required',
    });
  }

  try {
    const client = serviceRegistry.getClient('agent-dex');
    const response = await client.get('/api/v1/prices', { params: { mints } });

    return res.json({
      success: true,
      source: 'agent-dex',
      data: response.data.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch prices from agent-dex');

    res.json({
      success: true,
      source: 'mock',
      data: {},
    });
  }
});

// GET /api/v1/market/trending - Get trending tokens
marketRouter.get('/trending', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('agent-dex');
    const response = await client.get('/api/v1/tokens/trending');

    return res.json({
      success: true,
      source: 'agent-dex',
      data: response.data.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch trending tokens');

    // Mock trending tokens
    const mockTrending = [
      { symbol: 'SOL', name: 'Solana', price: 100, change24h: 5.2 },
      { symbol: 'BONK', name: 'Bonk', price: 0.00001, change24h: 15.3 },
      { symbol: 'JUP', name: 'Jupiter', price: 0.8, change24h: -2.1 },
    ];

    res.json({
      success: true,
      source: 'mock',
      data: mockTrending,
    });
  }
});

// GET /api/v1/market/prediction-markets - Get prediction markets from CloddsBot
marketRouter.get('/prediction-markets', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('cloddsbot');
    const response = await client.get('/api/markets');

    return res.json({
      success: true,
      source: 'cloddsbot',
      data: response.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch prediction markets');

    // Mock prediction markets
    const mockMarkets = [
      {
        id: 'btc-100k-2025',
        platform: 'polymarket',
        question: 'Will Bitcoin reach $100k in 2025?',
        outcomes: [
          { name: 'Yes', price: 0.65 },
          { name: 'No', price: 0.35 },
        ],
        volume24h: 150000,
        liquidity: 500000,
      },
      {
        id: 'eth-10k-2025',
        platform: 'polymarket',
        question: 'Will Ethereum reach $10k in 2025?',
        outcomes: [
          { name: 'Yes', price: 0.35 },
          { name: 'No', price: 0.65 },
        ],
        volume24h: 75000,
        liquidity: 250000,
      },
    ];

    res.json({
      success: true,
      source: 'mock',
      data: mockMarkets,
    });
  }
});

// GET /api/v1/market/arbitrage - Get arbitrage opportunities
marketRouter.get('/arbitrage', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('cloddsbot');
    const response = await client.get('/api/arbitrage');

    return res.json({
      success: true,
      source: 'cloddsbot',
      data: response.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch arbitrage opportunities');

    // Mock arbitrage data
    const mockArbitrage = [
      {
        id: 'arb-1',
        token: 'BTC-100k',
        buyPlatform: 'Polymarket',
        buyPrice: 0.62,
        sellPlatform: 'Kalshi',
        sellPrice: 0.68,
        profitPercent: 9.7,
        liquidity: 50000,
        confidence: 85,
      },
    ];

    res.json({
      success: true,
      source: 'mock',
      data: mockArbitrage,
    });
  }
});

// GET /api/v1/market/osint/bounties - Get OSINT bounties
marketRouter.get('/osint/bounties', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('osint-market');
    const response = await client.get('/api/bounties', {
      params: req.query,
    });

    return res.json({
      success: true,
      source: 'osint-market',
      data: response.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch OSINT bounties');

    // Mock bounties
    const mockBounties = [
      {
        id: 'bounty-1',
        question: 'What is the team behind token XYZ?',
        reward: { token: 'SOL', amount: 1.5 },
        status: 'open',
        difficulty: 'medium',
        deadline: Date.now() + 86400000,
      },
    ];

    res.json({
      success: true,
      source: 'mock',
      data: mockBounties,
    });
  }
});

// GET /api/v1/market/agents - Get registered agents from ClawdNet
marketRouter.get('/agents', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('clawdnet');
    const response = await client.get('/api/agents', {
      params: req.query,
    });

    return res.json({
      success: true,
      source: 'clawdnet',
      data: response.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch ClawdNet agents');

    // Mock agents
    const mockAgents = [
      {
        id: 'agent-1',
        handle: '@trading-bot',
        name: 'Trading Bot',
        capabilities: ['trading', 'analysis'],
        skills: [
          { id: 'market-analysis', price: '0.01' },
          { id: 'trade-execution', price: '0.05' },
        ],
        reputation_score: 4.5,
        status: 'online',
      },
    ];

    res.json({
      success: true,
      source: 'mock',
      data: mockAgents,
    });
  }
});

// GET /api/v1/market/stats - Get market statistics
marketRouter.get('/stats', (req: Request, res: Response) => {
  // Mock market stats
  const stats = {
    totalVolume24h: 15000000,
    totalTrades24h: 12500,
    activePredictionMarkets: 350,
    activeArbitrageOpportunities: 12,
    topGainers: [
      { symbol: 'BONK', change: 25.5 },
      { symbol: 'WIF', change: 18.3 },
    ],
    topLosers: [
      { symbol: 'SHIB', change: -8.2 },
      { symbol: 'PEPE', change: -5.1 },
    ],
    sentiment: 'bullish',
    fearGreedIndex: 72,
  };

  res.json({
    success: true,
    data: stats,
  });
});
