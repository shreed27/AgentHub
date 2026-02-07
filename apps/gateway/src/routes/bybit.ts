/**
 * Bybit Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as bybitOps from '../db/operations/bybit.js';

export const bybitRouter = Router();

// GET /api/v1/bybit/balance - Account balance
bybitRouter.get('/balance', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    // Mock balance (integrate with Bybit API in production)
    const balance = {
      wallet,
      totalEquity: 10000,
      availableBalance: 8000,
      usedMargin: 2000,
      unrealisedPnl: 150,
      coin: 'USDT',
    };

    res.json({ success: true, data: balance });
  } catch (error) {
    logger.error({ error }, 'Failed to get Bybit balance');
    res.status(500).json({ success: false, error: 'Failed to get Bybit balance' });
  }
});

// GET /api/v1/bybit/positions - Open positions
bybitRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const positions = bybitOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      symbol: symbol as string | undefined,
    });

    res.json({ success: true, data: positions, count: positions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Bybit positions');
    res.status(500).json({ success: false, error: 'Failed to get Bybit positions' });
  }
});

// GET /api/v1/bybit/orders - Open orders
bybitRouter.get('/orders', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const orders = bybitOps.getOrdersByWallet(wallet as string, {
      status: status as string | undefined,
      symbol: symbol as string | undefined,
    });

    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Bybit orders');
    res.status(500).json({ success: false, error: 'Failed to get Bybit orders' });
  }
});

// POST /api/v1/bybit/orders/place - Place order
bybitRouter.post('/orders/place', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, symbol, side, orderType, qty, price, stopLoss, takeProfit, timeInForce, reduceOnly, closeOnTrigger, leverage } = req.body;

    if (!userWallet || !symbol || !side || !orderType || !qty) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const order = bybitOps.createOrder({
      userWallet,
      orderId: `bybit-${Date.now()}`,
      symbol,
      side,
      orderType,
      qty: Number(qty),
      price: price ? Number(price) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      timeInForce: timeInForce || 'GTC',
      reduceOnly: reduceOnly || false,
      closeOnTrigger: closeOnTrigger || false,
      status: 'New',
      cumExecQty: 0,
      cumExecValue: 0,
    });

    logger.info({ orderId: order.id, symbol, side }, 'Bybit order placed');

    io?.emit('bybit_order_placed', { type: 'bybit_order_placed', timestamp: Date.now(), data: order });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    logger.error({ error }, 'Failed to place Bybit order');
    res.status(500).json({ success: false, error: 'Failed to place Bybit order' });
  }
});

// POST /api/v1/bybit/orders/cancel - Cancel order
bybitRouter.post('/orders/cancel', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing required field: orderId' });
    }

    const order = bybitOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const cancelled = bybitOps.cancelOrder(orderId);
    logger.info({ orderId }, 'Bybit order cancelled');

    io?.emit('bybit_order_cancelled', { type: 'bybit_order_cancelled', timestamp: Date.now(), data: cancelled });

    res.json({ success: true, data: cancelled });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel Bybit order');
    res.status(500).json({ success: false, error: 'Failed to cancel Bybit order' });
  }
});

// POST /api/v1/bybit/orders/modify - Modify order
bybitRouter.post('/orders/modify', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { orderId, price, qty } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing required field: orderId' });
    }

    // Note: actual modification would require canceling and recreating
    const order = bybitOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: order, message: 'Order modification requires cancel and recreate' });
  } catch (error) {
    logger.error({ error }, 'Failed to modify Bybit order');
    res.status(500).json({ success: false, error: 'Failed to modify Bybit order' });
  }
});

// GET /api/v1/bybit/funding-rates - Funding rates
bybitRouter.get('/funding-rates', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { symbol } = req.query;

    // Mock funding rates
    const fundingRates = [
      { symbol: 'BTCUSDT', fundingRate: 0.0001, fundingRateTimestamp: Date.now(), markPrice: 45000 },
      { symbol: 'ETHUSDT', fundingRate: 0.00008, fundingRateTimestamp: Date.now(), markPrice: 2500 },
      { symbol: 'SOLUSDT', fundingRate: 0.00015, fundingRateTimestamp: Date.now(), markPrice: 100 },
    ];

    const data = symbol ? fundingRates.filter(f => f.symbol === symbol) : fundingRates;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get funding rates');
    res.status(500).json({ success: false, error: 'Failed to get funding rates' });
  }
});

// POST /api/v1/bybit/positions/close - Close position
bybitRouter.post('/positions/close', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { positionId } = req.body;

    if (!positionId) {
      return res.status(400).json({ success: false, error: 'Missing required field: positionId' });
    }

    const position = bybitOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    const closed = bybitOps.closePosition(positionId);
    logger.info({ positionId }, 'Bybit position closed');

    io?.emit('bybit_position_closed', { type: 'bybit_position_closed', timestamp: Date.now(), data: closed });

    res.json({ success: true, data: closed });
  } catch (error) {
    logger.error({ error }, 'Failed to close Bybit position');
    res.status(500).json({ success: false, error: 'Failed to close Bybit position' });
  }
});

// POST /api/v1/bybit/positions/leverage - Set leverage
bybitRouter.post('/positions/leverage', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, symbol, leverage } = req.body;

    if (!userWallet || !symbol || !leverage) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (leverage < 1 || leverage > 100) {
      return res.status(400).json({ success: false, error: 'Leverage must be between 1 and 100' });
    }

    logger.info({ userWallet, symbol, leverage }, 'Bybit leverage updated');
    res.json({ success: true, data: { symbol, leverage } });
  } catch (error) {
    logger.error({ error }, 'Failed to set leverage');
    res.status(500).json({ success: false, error: 'Failed to set leverage' });
  }
});

// POST /api/v1/bybit/positions/tp-sl - Set TP/SL
bybitRouter.post('/positions/tp-sl', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { positionId, takeProfit, stopLoss } = req.body;

    if (!positionId) {
      return res.status(400).json({ success: false, error: 'Missing required field: positionId' });
    }

    const position = bybitOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    const updated = bybitOps.updatePosition(positionId, {
      takeProfit: takeProfit ? Number(takeProfit) : position.takeProfit,
      stopLoss: stopLoss ? Number(stopLoss) : position.stopLoss,
    });

    logger.info({ positionId, takeProfit, stopLoss }, 'Bybit TP/SL updated');
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to set TP/SL');
    res.status(500).json({ success: false, error: 'Failed to set TP/SL' });
  }
});

// GET /api/v1/bybit/stats - Account stats
bybitRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = bybitOps.getAccountStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get Bybit stats');
    res.status(500).json({ success: false, error: 'Failed to get Bybit stats' });
  }
});
