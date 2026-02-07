/**
 * Trading Bots Routes
 */

import { Router, Request, Response } from 'express';
import * as botOps from '../db/operations/bots.js';

export const botsRouter = Router();

// POST /api/v1/bots - Create bot
botsRouter.post('/', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, name, strategyType, exchange, symbol, config } = req.body;

    if (!userWallet || !name || !strategyType || !exchange || !symbol) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const bot = botOps.createBot({
      userWallet,
      name,
      strategyType,
      exchange,
      symbol,
      config: config || {},
      status: 'stopped',
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
    });

    logger.info({ botId: bot.id, name, strategyType }, 'Trading bot created');
    io?.emit('bot_created', { type: 'bot_created', timestamp: Date.now(), data: bot });

    res.status(201).json({ success: true, data: bot });
  } catch (error) {
    logger.error({ error }, 'Failed to create bot');
    res.status(500).json({ success: false, error: 'Failed to create bot' });
  }
});

// GET /api/v1/bots - List bots
botsRouter.get('/', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, strategyType } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const bots = botOps.getBotsByWallet(wallet as string, {
      status: status as string | undefined,
      strategyType: strategyType as string | undefined,
    });

    res.json({ success: true, data: bots, count: bots.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get bots');
    res.status(500).json({ success: false, error: 'Failed to get bots' });
  }
});

// GET /api/v1/bots/strategies - Available strategies
botsRouter.get('/strategies', async (req: Request, res: Response) => {
  try {
    const strategies = botOps.getAvailableStrategies();
    res.json({ success: true, data: strategies });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get strategies' });
  }
});

// GET /api/v1/bots/:id - Get bot
botsRouter.get('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const bot = botOps.getBotById(id);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error) {
    logger.error({ error }, 'Failed to get bot');
    res.status(500).json({ success: false, error: 'Failed to get bot' });
  }
});

// PUT /api/v1/bots/:id - Update bot
botsRouter.put('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const updates = req.body;

    const bot = botOps.getBotById(id);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const updated = botOps.updateBot(id, updates);
    logger.info({ botId: id }, 'Bot updated');

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update bot');
    res.status(500).json({ success: false, error: 'Failed to update bot' });
  }
});

// POST /api/v1/bots/:id/start - Start bot
botsRouter.post('/:id/start', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const bot = botOps.getBotById(id);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const started = botOps.startBot(id);
    logger.info({ botId: id }, 'Bot started');

    io?.emit('bot_started', { type: 'bot_started', timestamp: Date.now(), data: started });

    res.json({ success: true, data: started });
  } catch (error) {
    logger.error({ error }, 'Failed to start bot');
    res.status(500).json({ success: false, error: 'Failed to start bot' });
  }
});

// POST /api/v1/bots/:id/stop - Stop bot
botsRouter.post('/:id/stop', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const bot = botOps.getBotById(id);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const stopped = botOps.stopBot(id);
    logger.info({ botId: id }, 'Bot stopped');

    io?.emit('bot_stopped', { type: 'bot_stopped', timestamp: Date.now(), data: stopped });

    res.json({ success: true, data: stopped });
  } catch (error) {
    logger.error({ error }, 'Failed to stop bot');
    res.status(500).json({ success: false, error: 'Failed to stop bot' });
  }
});

// POST /api/v1/bots/:id/pause - Pause bot
botsRouter.post('/:id/pause', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const bot = botOps.getBotById(id);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const paused = botOps.pauseBot(id);
    logger.info({ botId: id }, 'Bot paused');

    io?.emit('bot_paused', { type: 'bot_paused', timestamp: Date.now(), data: paused });

    res.json({ success: true, data: paused });
  } catch (error) {
    logger.error({ error }, 'Failed to pause bot');
    res.status(500).json({ success: false, error: 'Failed to pause bot' });
  }
});

// GET /api/v1/bots/:id/status - Get status
botsRouter.get('/:id/status', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const bot = botOps.getBotById(id);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const status = {
      botId: id,
      status: bot.status,
      isRunning: bot.status === 'running',
      totalTrades: bot.totalTrades,
      totalPnl: bot.totalPnl,
      winRate: bot.winRate,
      lastTradeAt: bot.lastTradeAt,
      startedAt: bot.startedAt,
      error: bot.error,
      uptime: bot.startedAt ? Date.now() - bot.startedAt : 0,
    };

    res.json({ success: true, data: status });
  } catch (error) {
    logger.error({ error }, 'Failed to get bot status');
    res.status(500).json({ success: false, error: 'Failed to get bot status' });
  }
});

// GET /api/v1/bots/:id/trades - Trade history
botsRouter.get('/:id/trades', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    const bot = botOps.getBotById(id);
    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    const trades = botOps.getTradesByBot(id, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({ success: true, data: trades, count: trades.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get trades');
    res.status(500).json({ success: false, error: 'Failed to get trades' });
  }
});

// GET /api/v1/bots/:id/performance - Performance metrics
botsRouter.get('/:id/performance', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const performance = botOps.getBotPerformance(id);

    if (!performance.bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: performance });
  } catch (error) {
    logger.error({ error }, 'Failed to get performance');
    res.status(500).json({ success: false, error: 'Failed to get performance' });
  }
});

// DELETE /api/v1/bots/:id - Delete bot
botsRouter.delete('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const bot = botOps.getBotById(id);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    if (bot.status === 'running') {
      return res.status(400).json({ success: false, error: 'Cannot delete running bot. Stop it first.' });
    }

    botOps.deleteBot(id);
    logger.info({ botId: id }, 'Bot deleted');

    res.json({ success: true, message: 'Bot deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete bot');
    res.status(500).json({ success: false, error: 'Failed to delete bot' });
  }
});

// GET /api/v1/bots/wallet/stats - Wallet bot stats
botsRouter.get('/wallet/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = botOps.getWalletBotStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get wallet stats');
    res.status(500).json({ success: false, error: 'Failed to get wallet stats' });
  }
});
