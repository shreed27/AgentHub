/**
 * Binance Futures Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as binanceOps from '../db/operations/binance.js';

export const binanceFuturesRouter = Router();

// GET /api/v1/binance/balance - Account balance
binanceFuturesRouter.get('/balance', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    // Mock balance
    const balance = {
      wallet,
      totalWalletBalance: 10000,
      availableBalance: 8000,
      totalUnrealizedProfit: 150,
      totalMarginBalance: 2000,
      maxWithdrawAmount: 7500,
      asset: 'USDT',
    };

    res.json({ success: true, data: balance });
  } catch (error) {
    logger.error({ error }, 'Failed to get Binance balance');
    res.status(500).json({ success: false, error: 'Failed to get Binance balance' });
  }
});

// GET /api/v1/binance/positions - Open positions
binanceFuturesRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const positions = binanceOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      symbol: symbol as string | undefined,
    });

    res.json({ success: true, data: positions, count: positions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Binance positions');
    res.status(500).json({ success: false, error: 'Failed to get Binance positions' });
  }
});

// GET /api/v1/binance/orders - Open orders
binanceFuturesRouter.get('/orders', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const orders = binanceOps.getOrdersByWallet(wallet as string, {
      status: status as string | undefined,
      symbol: symbol as string | undefined,
    });

    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Binance orders');
    res.status(500).json({ success: false, error: 'Failed to get Binance orders' });
  }
});

// POST /api/v1/binance/orders/place - Place order
binanceFuturesRouter.post('/orders/place', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, symbol, side, orderType, quantity, price, stopPrice, leverage, reduceOnly, timeInForce } = req.body;

    if (!userWallet || !symbol || !side || !orderType || !quantity) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const order = binanceOps.createOrder({
      userWallet,
      symbol,
      side,
      orderType,
      quantity: Number(quantity),
      price: price ? Number(price) : undefined,
      stopPrice: stopPrice ? Number(stopPrice) : undefined,
      leverage: leverage || 10,
      reduceOnly: reduceOnly || false,
      timeInForce: timeInForce || 'GTC',
      status: 'pending',
      filledQuantity: 0,
    });

    logger.info({ orderId: order.id, symbol, side }, 'Binance order placed');

    io?.emit('binance_order_placed', { type: 'binance_order_placed', timestamp: Date.now(), data: order });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    logger.error({ error }, 'Failed to place Binance order');
    res.status(500).json({ success: false, error: 'Failed to place Binance order' });
  }
});

// POST /api/v1/binance/orders/cancel - Cancel order
binanceFuturesRouter.post('/orders/cancel', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing required field: orderId' });
    }

    const order = binanceOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const cancelled = binanceOps.cancelOrder(orderId);
    logger.info({ orderId }, 'Binance order cancelled');

    io?.emit('binance_order_cancelled', { type: 'binance_order_cancelled', timestamp: Date.now(), data: cancelled });

    res.json({ success: true, data: cancelled });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel Binance order');
    res.status(500).json({ success: false, error: 'Failed to cancel Binance order' });
  }
});

// GET /api/v1/binance/funding-rates - Funding rates
binanceFuturesRouter.get('/funding-rates', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { symbol } = req.query;

    // Mock funding rates
    const fundingRates = [
      { symbol: 'BTCUSDT', fundingRate: '0.00010000', fundingTime: Date.now(), markPrice: '45000.00' },
      { symbol: 'ETHUSDT', fundingRate: '0.00008000', fundingTime: Date.now(), markPrice: '2500.00' },
      { symbol: 'SOLUSDT', fundingRate: '0.00015000', fundingTime: Date.now(), markPrice: '100.00' },
    ];

    const data = symbol ? fundingRates.filter(f => f.symbol === symbol) : fundingRates;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get funding rates');
    res.status(500).json({ success: false, error: 'Failed to get funding rates' });
  }
});

// POST /api/v1/binance/positions/leverage - Set leverage
binanceFuturesRouter.post('/positions/leverage', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, symbol, leverage } = req.body;

    if (!userWallet || !symbol || !leverage) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (leverage < 1 || leverage > 125) {
      return res.status(400).json({ success: false, error: 'Leverage must be between 1 and 125' });
    }

    logger.info({ userWallet, symbol, leverage }, 'Binance leverage updated');
    res.json({ success: true, data: { symbol, leverage, maxNotionalValue: leverage * 1000000 } });
  } catch (error) {
    logger.error({ error }, 'Failed to set leverage');
    res.status(500).json({ success: false, error: 'Failed to set leverage' });
  }
});

// POST /api/v1/binance/positions/close - Close position
binanceFuturesRouter.post('/positions/close', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { positionId } = req.body;

    if (!positionId) {
      return res.status(400).json({ success: false, error: 'Missing required field: positionId' });
    }

    const position = binanceOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    const closed = binanceOps.closePosition(positionId);
    logger.info({ positionId }, 'Binance position closed');

    io?.emit('binance_position_closed', { type: 'binance_position_closed', timestamp: Date.now(), data: closed });

    res.json({ success: true, data: closed });
  } catch (error) {
    logger.error({ error }, 'Failed to close Binance position');
    res.status(500).json({ success: false, error: 'Failed to close Binance position' });
  }
});

// GET /api/v1/binance/stats - Account stats
binanceFuturesRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = binanceOps.getAccountStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get Binance stats');
    res.status(500).json({ success: false, error: 'Failed to get Binance stats' });
  }
});
