import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ServiceRegistry } from '../services/registry.js';
import type { Position } from '../types.js';

export const portfolioRouter = Router();

// In-memory position store
const positions: Map<string, Position> = new Map();

// GET /api/v1/portfolio/positions - Get all positions
portfolioRouter.get('/positions', (req: Request, res: Response) => {
  const { agentId } = req.query;

  let positionList = Array.from(positions.values());

  if (agentId) {
    positionList = positionList.filter(p => p.agentId === agentId);
  }

  // Calculate totals
  const totalUnrealizedPnL = positionList.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalValue = positionList.reduce((sum, p) => sum + (p.amount * p.currentPrice), 0);

  res.json({
    success: true,
    data: {
      positions: positionList,
      summary: {
        totalPositions: positionList.length,
        totalUnrealizedPnL,
        totalValue,
      },
    },
  });
});

// GET /api/v1/portfolio/positions/:id - Get position by ID
portfolioRouter.get('/positions/:id', (req: Request, res: Response) => {
  const position = positions.get(req.params.id);
  if (!position) {
    return res.status(404).json({
      success: false,
      error: 'Position not found',
    });
  }
  res.json({
    success: true,
    data: position,
  });
});

// POST /api/v1/portfolio/positions - Create position
portfolioRouter.post('/positions', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { agentId, token, tokenSymbol, chain, side, amount, entryPrice, stopLoss, takeProfit, takeProfitLevels } = req.body;

    if (!agentId || !token || !chain || !side || !amount || !entryPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const position: Position = {
      id: uuidv4(),
      agentId,
      token,
      tokenSymbol: tokenSymbol || token.slice(0, 6),
      chain,
      side,
      amount,
      entryPrice,
      currentPrice: entryPrice,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      stopLoss,
      takeProfit,
      takeProfitLevels,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    };

    positions.set(position.id, position);
    logger.info({ positionId: position.id, token, side, amount }, 'Position opened');

    io?.emit('position_opened', {
      type: 'position_opened',
      timestamp: Date.now(),
      data: position,
    });

    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create position');
    res.status(500).json({
      success: false,
      error: 'Failed to create position',
    });
  }
});

// PUT /api/v1/portfolio/positions/:id - Update position
portfolioRouter.put('/positions/:id', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  const position = positions.get(req.params.id);
  if (!position) {
    return res.status(404).json({
      success: false,
      error: 'Position not found',
    });
  }

  const { currentPrice, stopLoss, takeProfit, takeProfitLevels } = req.body;

  if (currentPrice !== undefined) {
    position.currentPrice = currentPrice;
    const priceDiff = currentPrice - position.entryPrice;
    position.unrealizedPnL = position.side === 'long'
      ? priceDiff * position.amount
      : -priceDiff * position.amount;
    position.unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100;
    if (position.side === 'short') {
      position.unrealizedPnLPercent = -position.unrealizedPnLPercent;
    }
  }

  if (stopLoss !== undefined) position.stopLoss = stopLoss;
  if (takeProfit !== undefined) position.takeProfit = takeProfit;
  if (takeProfitLevels !== undefined) position.takeProfitLevels = takeProfitLevels;

  position.updatedAt = Date.now();
  positions.set(position.id, position);

  io?.emit('price_update', {
    type: 'price_update',
    timestamp: Date.now(),
    data: { positionId: position.id, currentPrice: position.currentPrice, unrealizedPnL: position.unrealizedPnL },
  });

  res.json({
    success: true,
    data: position,
  });
});

// DELETE /api/v1/portfolio/positions/:id - Close position
portfolioRouter.delete('/positions/:id', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  const position = positions.get(req.params.id);
  if (!position) {
    return res.status(404).json({
      success: false,
      error: 'Position not found',
    });
  }

  positions.delete(req.params.id);
  logger.info({ positionId: req.params.id, pnl: position.unrealizedPnL }, 'Position closed');

  io?.emit('position_closed', {
    type: 'position_closed',
    timestamp: Date.now(),
    data: {
      position,
      realizedPnL: position.unrealizedPnL,
      closedAt: Date.now(),
    },
  });

  res.json({
    success: true,
    message: 'Position closed',
    data: {
      position,
      realizedPnL: position.unrealizedPnL,
    },
  });
});

// GET /api/v1/portfolio/wallet/:address - Get wallet portfolio from agent-dex
portfolioRouter.get('/wallet/:address', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('agent-dex');
    const response = await client.get(`/api/v1/portfolio/${req.params.address}`);

    return res.json({
      success: true,
      source: 'agent-dex',
      data: response.data.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch wallet portfolio from agent-dex');

    // Mock portfolio data
    const mockPortfolio = {
      solBalance: 5.5,
      solUsdValue: 550,
      tokens: [
        { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', balance: 5.5, usdValue: 550 },
        { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', balance: 1000, usdValue: 1000 },
      ],
      totalUsdValue: 1550,
    };

    res.json({
      success: true,
      source: 'mock',
      data: mockPortfolio,
    });
  }
});

// GET /api/v1/portfolio/history/:address - Get trade history
portfolioRouter.get('/history/:address', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const client = serviceRegistry.getClient('agent-dex');
    const response = await client.get(`/api/v1/portfolio/${req.params.address}/history`);

    return res.json({
      success: true,
      source: 'agent-dex',
      data: response.data.data,
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch trade history');

    res.json({
      success: true,
      source: 'mock',
      data: [],
    });
  }
});

// GET /api/v1/portfolio/holdings - Get current holdings snapshot
portfolioRouter.get('/holdings', (req: Request, res: Response) => {
  const io = req.app.locals.io;

  // Get positions grouped by token
  const positionList = Array.from(positions.values());
  const holdings = new Map<string, { token: string; symbol: string; amount: number; value: number; pnl: number }>();

  for (const p of positionList) {
    const existing = holdings.get(p.token);
    if (existing) {
      existing.amount += p.amount;
      existing.value += p.amount * p.currentPrice;
      existing.pnl += p.unrealizedPnL;
    } else {
      holdings.set(p.token, {
        token: p.token,
        symbol: p.tokenSymbol,
        amount: p.amount,
        value: p.amount * p.currentPrice,
        pnl: p.unrealizedPnL,
      });
    }
  }

  const holdingsArray = Array.from(holdings.values());

  io?.emit('holdings_snapshot', {
    type: 'holdings_snapshot',
    timestamp: Date.now(),
    data: holdingsArray,
  });

  res.json({
    success: true,
    data: holdingsArray,
  });
});
