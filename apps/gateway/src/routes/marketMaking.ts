/**
 * Market Making Strategy Routes
 */

import { Router, Request, Response } from 'express';
import * as mmOps from '../db/operations/marketMaking.js';

export const marketMakingRouter = Router();

// POST /api/v1/market-making/strategies - Create strategy
marketMakingRouter.post('/strategies', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const {
      userWallet, name, exchange, symbol, baseAsset, quoteAsset, spread, minSpread, maxSpread,
      orderSize, maxInventory, inventorySkew, rebalanceThreshold, refreshInterval, config
    } = req.body;

    if (!userWallet || !name || !exchange || !symbol || !baseAsset || !quoteAsset || !spread || !orderSize || !maxInventory) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const strategy = mmOps.createStrategy({
      userWallet,
      name,
      exchange,
      symbol,
      baseAsset,
      quoteAsset,
      spread: Number(spread),
      minSpread: minSpread ? Number(minSpread) : 0.001,
      maxSpread: maxSpread ? Number(maxSpread) : 0.05,
      orderSize: Number(orderSize),
      maxInventory: Number(maxInventory),
      inventorySkew: inventorySkew ? Number(inventorySkew) : 0,
      rebalanceThreshold: rebalanceThreshold ? Number(rebalanceThreshold) : 0.1,
      refreshInterval: refreshInterval ? Number(refreshInterval) : 5000,
      status: 'paused',
      config: config || {},
      currentInventory: 0,
      totalPnl: 0,
      totalVolume: 0,
      totalTrades: 0,
    });

    logger.info({ strategyId: strategy.id, name, symbol }, 'Market making strategy created');
    io?.emit('mm_strategy_created', { type: 'mm_strategy_created', timestamp: Date.now(), data: strategy });

    res.status(201).json({ success: true, data: strategy });
  } catch (error) {
    logger.error({ error }, 'Failed to create market making strategy');
    res.status(500).json({ success: false, error: 'Failed to create strategy' });
  }
});

// GET /api/v1/market-making/strategies - List strategies
marketMakingRouter.get('/strategies', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, exchange } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const strategies = mmOps.getStrategiesByWallet(wallet as string, {
      status: status as string | undefined,
      exchange: exchange as string | undefined,
    });

    res.json({ success: true, data: strategies, count: strategies.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get strategies');
    res.status(500).json({ success: false, error: 'Failed to get strategies' });
  }
});

// GET /api/v1/market-making/strategies/:id - Get strategy
marketMakingRouter.get('/strategies/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const strategy = mmOps.getStrategyById(id);

    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    res.json({ success: true, data: strategy });
  } catch (error) {
    logger.error({ error }, 'Failed to get strategy');
    res.status(500).json({ success: false, error: 'Failed to get strategy' });
  }
});

// PUT /api/v1/market-making/strategies/:id - Update strategy
marketMakingRouter.put('/strategies/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const updates = req.body;

    const strategy = mmOps.getStrategyById(id);
    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    const updated = mmOps.updateStrategy(id, updates);
    logger.info({ strategyId: id }, 'Market making strategy updated');

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update strategy');
    res.status(500).json({ success: false, error: 'Failed to update strategy' });
  }
});

// POST /api/v1/market-making/strategies/:id/start - Start strategy
marketMakingRouter.post('/strategies/:id/start', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const strategy = mmOps.getStrategyById(id);
    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    const started = mmOps.startStrategy(id);
    logger.info({ strategyId: id }, 'Market making strategy started');

    io?.emit('mm_strategy_started', { type: 'mm_strategy_started', timestamp: Date.now(), data: started });

    res.json({ success: true, data: started });
  } catch (error) {
    logger.error({ error }, 'Failed to start strategy');
    res.status(500).json({ success: false, error: 'Failed to start strategy' });
  }
});

// POST /api/v1/market-making/strategies/:id/stop - Stop strategy
marketMakingRouter.post('/strategies/:id/stop', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const strategy = mmOps.getStrategyById(id);
    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    const stopped = mmOps.stopStrategy(id);
    logger.info({ strategyId: id }, 'Market making strategy stopped');

    io?.emit('mm_strategy_stopped', { type: 'mm_strategy_stopped', timestamp: Date.now(), data: stopped });

    res.json({ success: true, data: stopped });
  } catch (error) {
    logger.error({ error }, 'Failed to stop strategy');
    res.status(500).json({ success: false, error: 'Failed to stop strategy' });
  }
});

// GET /api/v1/market-making/strategies/:id/status - Get strategy status
marketMakingRouter.get('/strategies/:id/status', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const stats = mmOps.getStrategyStats(id);

    if (!stats.strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get strategy status');
    res.status(500).json({ success: false, error: 'Failed to get strategy status' });
  }
});

// GET /api/v1/market-making/strategies/:id/inventory - Get inventory
marketMakingRouter.get('/strategies/:id/inventory', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const strategy = mmOps.getStrategyById(id);

    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    const inventory = {
      strategyId: id,
      baseAsset: strategy.baseAsset,
      quoteAsset: strategy.quoteAsset,
      currentInventory: strategy.currentInventory,
      maxInventory: strategy.maxInventory,
      inventorySkew: strategy.inventorySkew,
      utilizationPct: (strategy.currentInventory / strategy.maxInventory) * 100,
    };

    res.json({ success: true, data: inventory });
  } catch (error) {
    logger.error({ error }, 'Failed to get inventory');
    res.status(500).json({ success: false, error: 'Failed to get inventory' });
  }
});

// GET /api/v1/market-making/strategies/:id/pnl - Get P&L
marketMakingRouter.get('/strategies/:id/pnl', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const strategy = mmOps.getStrategyById(id);

    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    const pnl = {
      strategyId: id,
      totalPnl: strategy.totalPnl,
      totalVolume: strategy.totalVolume,
      totalTrades: strategy.totalTrades,
      avgPnlPerTrade: strategy.totalTrades > 0 ? strategy.totalPnl / strategy.totalTrades : 0,
      runningTime: strategy.startedAt ? Date.now() - strategy.startedAt : 0,
    };

    res.json({ success: true, data: pnl });
  } catch (error) {
    logger.error({ error }, 'Failed to get P&L');
    res.status(500).json({ success: false, error: 'Failed to get P&L' });
  }
});

// DELETE /api/v1/market-making/strategies/:id - Delete strategy
marketMakingRouter.delete('/strategies/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const strategy = mmOps.getStrategyById(id);

    if (!strategy) {
      return res.status(404).json({ success: false, error: 'Strategy not found' });
    }

    if (strategy.status === 'active') {
      return res.status(400).json({ success: false, error: 'Cannot delete active strategy. Stop it first.' });
    }

    mmOps.deleteStrategy(id);
    logger.info({ strategyId: id }, 'Market making strategy deleted');

    res.json({ success: true, message: 'Strategy deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete strategy');
    res.status(500).json({ success: false, error: 'Failed to delete strategy' });
  }
});

// GET /api/v1/market-making/stats - Wallet stats
marketMakingRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = mmOps.getWalletStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});
