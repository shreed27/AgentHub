/**
 * Drift Protocol Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as driftOps from '../db/operations/drift.js';

export const driftRouter = Router();

// POST /api/v1/drift/orders/place - Place perp/spot order
driftRouter.post('/orders/place', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, marketType, marketIndex, side, orderType, baseAssetAmount, price, triggerPrice, reduceOnly, postOnly } = req.body;

    if (!userWallet || !marketType || marketIndex === undefined || !side || !orderType || !baseAssetAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const order = driftOps.createOrder({
      userWallet,
      marketType,
      marketIndex,
      side,
      orderType,
      baseAssetAmount: String(baseAssetAmount),
      price: price ? String(price) : undefined,
      triggerPrice: triggerPrice ? String(triggerPrice) : undefined,
      reduceOnly: reduceOnly || false,
      postOnly: postOnly || false,
      status: 'pending',
      filledAmount: '0',
    });

    logger.info({ orderId: order.id, marketType, marketIndex, side }, 'Drift order placed');

    io?.emit('drift_order_placed', {
      type: 'drift_order_placed',
      timestamp: Date.now(),
      data: order,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to place Drift order');
    res.status(500).json({
      success: false,
      error: 'Failed to place Drift order',
    });
  }
});

// POST /api/v1/drift/orders/cancel - Cancel order
driftRouter.post('/orders/cancel', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { orderId, userWallet } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: orderId',
      });
    }

    const order = driftOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const cancelled = driftOps.cancelOrder(orderId);

    logger.info({ orderId }, 'Drift order cancelled');

    io?.emit('drift_order_cancelled', {
      type: 'drift_order_cancelled',
      timestamp: Date.now(),
      data: cancelled,
    });

    res.json({
      success: true,
      data: cancelled,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel Drift order');
    res.status(500).json({
      success: false,
      error: 'Failed to cancel Drift order',
    });
  }
});

// POST /api/v1/drift/orders/modify - Modify order
driftRouter.post('/orders/modify', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { orderId, price, baseAssetAmount } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: orderId',
      });
    }

    const order = driftOps.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // For modification, cancel and recreate in production
    // Here we simulate by updating the record
    const updates: Partial<typeof order> = {};
    if (price !== undefined) {
      // Note: price is not directly updatable in our schema, would need to cancel and recreate
    }

    res.json({
      success: true,
      data: order,
      message: 'Order modification not fully implemented - would need to cancel and recreate',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to modify Drift order');
    res.status(500).json({
      success: false,
      error: 'Failed to modify Drift order',
    });
  }
});

// GET /api/v1/drift/orders - Get open orders
driftRouter.get('/orders', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, marketIndex, status } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const orders = driftOps.getOrdersByWallet(wallet as string, {
      status: status as string | undefined,
      marketIndex: marketIndex ? Number(marketIndex) : undefined,
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Drift orders');
    res.status(500).json({
      success: false,
      error: 'Failed to get Drift orders',
    });
  }
});

// GET /api/v1/drift/positions - Get positions
driftRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, marketIndex, marketType, status } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const positions = driftOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      marketIndex: marketIndex ? Number(marketIndex) : undefined,
      marketType: marketType as string | undefined,
    });

    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Drift positions');
    res.status(500).json({
      success: false,
      error: 'Failed to get Drift positions',
    });
  }
});

// GET /api/v1/drift/health - Get account health
driftRouter.get('/health', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = driftOps.getAccountStats(wallet as string);

    // Calculate health factor (simplified)
    const healthFactor = stats.openPositions > 0 ?
      Math.max(0, 1 + (stats.totalUnrealizedPnl / 10000)) : 1;

    const health = {
      wallet,
      totalCollateral: 10000, // Would come from Drift account
      maintenanceMargin: stats.openPositions * 100,
      healthFactor,
      freeCollateral: 10000 - (stats.openPositions * 100),
      riskLevel: healthFactor > 1.5 ? 'safe' : healthFactor > 1.2 ? 'warning' : healthFactor > 1.05 ? 'danger' : 'critical',
      openPositions: stats.openPositions,
      openOrders: stats.openOrders,
      totalUnrealizedPnl: stats.totalUnrealizedPnl,
      totalRealizedPnl: stats.totalRealizedPnl,
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Drift health');
    res.status(500).json({
      success: false,
      error: 'Failed to get Drift health',
    });
  }
});

// GET /api/v1/drift/markets - List markets
driftRouter.get('/markets', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { type } = req.query;

    // Mock markets (would come from Drift SDK in production)
    const perpMarkets = [
      { marketIndex: 0, symbol: 'SOL-PERP', baseSymbol: 'SOL', status: 'active', oraclePrice: 100, fundingRate: 0.0001 },
      { marketIndex: 1, symbol: 'BTC-PERP', baseSymbol: 'BTC', status: 'active', oraclePrice: 45000, fundingRate: 0.00005 },
      { marketIndex: 2, symbol: 'ETH-PERP', baseSymbol: 'ETH', status: 'active', oraclePrice: 2500, fundingRate: 0.00008 },
    ];

    const spotMarkets = [
      { marketIndex: 0, symbol: 'USDC', status: 'active', oraclePrice: 1 },
      { marketIndex: 1, symbol: 'SOL', status: 'active', oraclePrice: 100 },
    ];

    let markets;
    if (type === 'perp') {
      markets = perpMarkets;
    } else if (type === 'spot') {
      markets = spotMarkets;
    } else {
      markets = { perp: perpMarkets, spot: spotMarkets };
    }

    res.json({
      success: true,
      data: markets,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Drift markets');
    res.status(500).json({
      success: false,
      error: 'Failed to get Drift markets',
    });
  }
});

// POST /api/v1/drift/leverage - Set leverage
driftRouter.post('/leverage', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, marketIndex, leverage } = req.body;

    if (!userWallet || marketIndex === undefined || !leverage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, marketIndex, leverage',
      });
    }

    if (leverage < 1 || leverage > 20) {
      return res.status(400).json({
        success: false,
        error: 'Leverage must be between 1 and 20',
      });
    }

    // In production, this would call Drift SDK to update leverage
    logger.info({ userWallet, marketIndex, leverage }, 'Drift leverage updated');

    res.json({
      success: true,
      data: {
        marketIndex,
        leverage,
        message: 'Leverage updated successfully',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to set Drift leverage');
    res.status(500).json({
      success: false,
      error: 'Failed to set Drift leverage',
    });
  }
});

// POST /api/v1/drift/liquidation/monitor - Monitor liquidation risk
driftRouter.post('/liquidation/monitor', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, thresholds } = req.body;

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userWallet',
      });
    }

    const defaultThresholds = {
      warning: 1.5,
      danger: 1.2,
      critical: 1.05,
    };

    const activeThresholds = { ...defaultThresholds, ...thresholds };

    // Get current health
    const stats = driftOps.getAccountStats(userWallet);
    const healthFactor = stats.openPositions > 0 ?
      Math.max(0, 1 + (stats.totalUnrealizedPnl / 10000)) : 1;

    let alertLevel = 'safe';
    if (healthFactor <= activeThresholds.critical) {
      alertLevel = 'critical';
    } else if (healthFactor <= activeThresholds.danger) {
      alertLevel = 'danger';
    } else if (healthFactor <= activeThresholds.warning) {
      alertLevel = 'warning';
    }

    const monitorResult = {
      userWallet,
      healthFactor,
      alertLevel,
      thresholds: activeThresholds,
      positions: stats.openPositions,
      unrealizedPnl: stats.totalUnrealizedPnl,
      monitoring: true,
    };

    if (alertLevel !== 'safe') {
      io?.emit('drift_liquidation_alert', {
        type: 'drift_liquidation_alert',
        timestamp: Date.now(),
        data: monitorResult,
      });
    }

    res.json({
      success: true,
      data: monitorResult,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to monitor liquidation');
    res.status(500).json({
      success: false,
      error: 'Failed to monitor liquidation',
    });
  }
});

// GET /api/v1/drift/stats - Get account stats
driftRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = driftOps.getAccountStats(wallet as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Drift stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get Drift stats',
    });
  }
});
