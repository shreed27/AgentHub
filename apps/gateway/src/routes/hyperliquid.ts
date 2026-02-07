/**
 * Hyperliquid Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as hlOps from '../db/operations/hyperliquid.js';

export const hyperliquidRouter = Router();

// GET /api/v1/hyperliquid/balance - Account state
hyperliquidRouter.get('/balance', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    // Mock balance
    const balance = {
      wallet,
      accountValue: 10000,
      totalMarginUsed: 2000,
      totalPositionValue: 8000,
      withdrawable: 5000,
      crossMarginSummary: { accountValue: 10000, marginUsed: 2000 },
    };

    res.json({ success: true, data: balance });
  } catch (error) {
    logger.error({ error }, 'Failed to get Hyperliquid balance');
    res.status(500).json({ success: false, error: 'Failed to get Hyperliquid balance' });
  }
});

// GET /api/v1/hyperliquid/positions - Positions
hyperliquidRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, coin, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const positions = hlOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      coin: coin as string | undefined,
    });

    res.json({ success: true, data: positions, count: positions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Hyperliquid positions');
    res.status(500).json({ success: false, error: 'Failed to get Hyperliquid positions' });
  }
});

// GET /api/v1/hyperliquid/orders - Open orders
hyperliquidRouter.get('/orders', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, coin, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const orders = hlOps.getOrdersByWallet(wallet as string, {
      status: status as string | undefined,
      coin: coin as string | undefined,
    });

    res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get Hyperliquid orders');
    res.status(500).json({ success: false, error: 'Failed to get Hyperliquid orders' });
  }
});

// POST /api/v1/hyperliquid/orders/place - Place order
hyperliquidRouter.post('/orders/place', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, coin, side, orderType, size, limitPrice, triggerPrice, reduceOnly } = req.body;

    if (!userWallet || !coin || !side || !orderType || !size) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const order = hlOps.createOrder({
      userWallet,
      oid: `hl-${Date.now()}`,
      coin,
      side,
      orderType,
      size: Number(size),
      limitPrice: limitPrice ? Number(limitPrice) : undefined,
      triggerPrice: triggerPrice ? Number(triggerPrice) : undefined,
      reduceOnly: reduceOnly || false,
      status: 'open',
      filledSize: 0,
    });

    logger.info({ orderId: order.id, coin, side }, 'Hyperliquid order placed');

    io?.emit('hyperliquid_order_placed', { type: 'hyperliquid_order_placed', timestamp: Date.now(), data: order });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    logger.error({ error }, 'Failed to place Hyperliquid order');
    res.status(500).json({ success: false, error: 'Failed to place Hyperliquid order' });
  }
});

// POST /api/v1/hyperliquid/orders/cancel - Cancel order
hyperliquidRouter.post('/orders/cancel', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Missing required field: orderId' });
    }

    const order = hlOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const cancelled = hlOps.cancelOrder(orderId);
    logger.info({ orderId }, 'Hyperliquid order cancelled');

    io?.emit('hyperliquid_order_cancelled', { type: 'hyperliquid_order_cancelled', timestamp: Date.now(), data: cancelled });

    res.json({ success: true, data: cancelled });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel Hyperliquid order');
    res.status(500).json({ success: false, error: 'Failed to cancel Hyperliquid order' });
  }
});

// POST /api/v1/hyperliquid/orders/batch - Batch orders
hyperliquidRouter.post('/orders/batch', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, orders } = req.body;

    if (!userWallet || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, orders (array)' });
    }

    const createdOrders = orders.map((o: any, idx: number) => {
      return hlOps.createOrder({
        userWallet,
        oid: `hl-batch-${Date.now()}-${idx}`,
        coin: o.coin,
        side: o.side,
        orderType: o.orderType,
        size: Number(o.size),
        limitPrice: o.limitPrice ? Number(o.limitPrice) : undefined,
        triggerPrice: o.triggerPrice ? Number(o.triggerPrice) : undefined,
        reduceOnly: o.reduceOnly || false,
        status: 'open',
        filledSize: 0,
      });
    });

    logger.info({ count: createdOrders.length }, 'Hyperliquid batch orders placed');

    io?.emit('hyperliquid_batch_orders', { type: 'hyperliquid_batch_orders', timestamp: Date.now(), data: createdOrders });

    res.status(201).json({ success: true, data: createdOrders, count: createdOrders.length });
  } catch (error) {
    logger.error({ error }, 'Failed to place batch orders');
    res.status(500).json({ success: false, error: 'Failed to place batch orders' });
  }
});

// GET /api/v1/hyperliquid/funding-rates - Funding rates
hyperliquidRouter.get('/funding-rates', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { coin } = req.query;

    // Mock funding rates
    const fundingRates = [
      { coin: 'BTC', fundingRate: 0.0001, premium: 0.0001, timestamp: Date.now() },
      { coin: 'ETH', fundingRate: 0.00008, premium: 0.00005, timestamp: Date.now() },
      { coin: 'SOL', fundingRate: 0.00015, premium: 0.0001, timestamp: Date.now() },
    ];

    const data = coin ? fundingRates.filter(f => f.coin === coin) : fundingRates;
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get funding rates');
    res.status(500).json({ success: false, error: 'Failed to get funding rates' });
  }
});

// GET /api/v1/hyperliquid/orderbook - Order book
hyperliquidRouter.get('/orderbook', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { coin } = req.query;

    if (!coin) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: coin' });
    }

    // Mock orderbook
    const orderbook = {
      coin,
      bids: [
        { price: 100, size: 10, numOrders: 5 },
        { price: 99.5, size: 20, numOrders: 8 },
        { price: 99, size: 30, numOrders: 12 },
      ],
      asks: [
        { price: 100.5, size: 10, numOrders: 4 },
        { price: 101, size: 15, numOrders: 6 },
        { price: 101.5, size: 25, numOrders: 10 },
      ],
      timestamp: Date.now(),
    };

    res.json({ success: true, data: orderbook });
  } catch (error) {
    logger.error({ error }, 'Failed to get orderbook');
    res.status(500).json({ success: false, error: 'Failed to get orderbook' });
  }
});

// GET /api/v1/hyperliquid/markets - Markets
hyperliquidRouter.get('/markets', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    // Mock markets
    const markets = [
      { coin: 'BTC', name: 'Bitcoin', szDecimals: 4, maxLeverage: 50, markPrice: 45000, volume24h: 1000000000 },
      { coin: 'ETH', name: 'Ethereum', szDecimals: 3, maxLeverage: 50, markPrice: 2500, volume24h: 500000000 },
      { coin: 'SOL', name: 'Solana', szDecimals: 2, maxLeverage: 20, markPrice: 100, volume24h: 100000000 },
    ];

    res.json({ success: true, data: markets });
  } catch (error) {
    logger.error({ error }, 'Failed to get markets');
    res.status(500).json({ success: false, error: 'Failed to get markets' });
  }
});

// POST /api/v1/hyperliquid/vault/deposit - Vault deposit
hyperliquidRouter.post('/vault/deposit', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, vaultAddress, amount } = req.body;

    if (!userWallet || !vaultAddress || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    logger.info({ userWallet, vaultAddress, amount }, 'Hyperliquid vault deposit initiated');

    res.json({
      success: true,
      data: { userWallet, vaultAddress, amount, status: 'pending', timestamp: Date.now() },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to deposit to vault');
    res.status(500).json({ success: false, error: 'Failed to deposit to vault' });
  }
});

// POST /api/v1/hyperliquid/vault/withdraw - Vault withdraw
hyperliquidRouter.post('/vault/withdraw', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, vaultAddress, amount } = req.body;

    if (!userWallet || !vaultAddress || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    logger.info({ userWallet, vaultAddress, amount }, 'Hyperliquid vault withdrawal initiated');

    res.json({
      success: true,
      data: { userWallet, vaultAddress, amount, status: 'pending', timestamp: Date.now() },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to withdraw from vault');
    res.status(500).json({ success: false, error: 'Failed to withdraw from vault' });
  }
});

// GET /api/v1/hyperliquid/stats - Account stats
hyperliquidRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = hlOps.getAccountStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get Hyperliquid stats');
    res.status(500).json({ success: false, error: 'Failed to get Hyperliquid stats' });
  }
});
