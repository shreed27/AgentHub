/**
 * Raydium DEX Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as raydiumOps from '../db/operations/raydium.js';

export const raydiumRouter = Router();

// POST /api/v1/raydium/swap - Execute Raydium swap
raydiumRouter.post('/swap', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, inputMint, outputMint, amount, slippageBps, poolId } = req.body;

    if (!userWallet || !inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, inputMint, outputMint, amount',
      });
    }

    // Create pending swap record
    const swap = raydiumOps.createSwap({
      userWallet,
      poolId,
      inputMint,
      outputMint,
      inputAmount: Number(amount),
      outputAmount: 0,
      minOutputAmount: 0,
      priceImpact: 0,
      feeAmount: 0,
      status: 'pending',
    });

    logger.info({ swapId: swap.id, inputMint, outputMint }, 'Raydium swap initiated');

    io?.emit('raydium_swap_started', {
      type: 'raydium_swap_started',
      timestamp: Date.now(),
      data: swap,
    });

    res.status(201).json({
      success: true,
      data: swap,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to execute Raydium swap');
    res.status(500).json({
      success: false,
      error: 'Failed to execute Raydium swap',
    });
  }
});

// POST /api/v1/raydium/quote - Get Raydium quote
raydiumRouter.post('/quote', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { inputMint, outputMint, amount, poolId, slippageBps } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputMint, outputMint, amount',
      });
    }

    // Return mock quote (integrate with CloddsBot getRaydiumQuote in production)
    const quote = {
      inputMint,
      outputMint,
      inAmount: amount,
      outAmount: String(Number(amount) * 0.98),
      priceImpactPct: '0.5',
      slippageBps: slippageBps || 50,
      poolId,
    };

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Raydium quote');
    res.status(500).json({
      success: false,
      error: 'Failed to get Raydium quote',
    });
  }
});

// GET /api/v1/raydium/pools - List Raydium pools
raydiumRouter.get('/pools', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { type, tokenA, tokenB, limit } = req.query;

    // Return mock pools (integrate with CloddsBot listRaydiumPools in production)
    const pools = [
      {
        id: 'pool-1',
        type: 'CLMM',
        mintA: 'So11111111111111111111111111111111111111112',
        mintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        price: 100,
        tvl: 1000000,
        volume24h: 500000,
        feeRate: 0.25,
      },
    ];

    res.json({
      success: true,
      data: pools,
      count: pools.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list Raydium pools');
    res.status(500).json({
      success: false,
      error: 'Failed to list Raydium pools',
    });
  }
});

// POST /api/v1/raydium/clmm/position - Create CLMM position
raydiumRouter.post('/clmm/position', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, poolId, priceLower, priceUpper, baseAmount, tokenAMint, tokenBMint } = req.body;

    if (!userWallet || !poolId || priceLower === undefined || priceUpper === undefined || !baseAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const position = raydiumOps.createPosition({
      userWallet,
      poolId,
      positionType: 'clmm',
      priceLower,
      priceUpper,
      liquidity: '0',
      tokenAMint: tokenAMint || '',
      tokenBMint: tokenBMint || '',
      tokenAAmount: Number(baseAmount),
      tokenBAmount: 0,
      feeOwedA: 0,
      feeOwedB: 0,
      rewardOwed: 0,
      status: 'pending',
      openedAt: Date.now(),
    });

    logger.info({ positionId: position.id, poolId }, 'Raydium CLMM position created');

    io?.emit('raydium_position_created', {
      type: 'raydium_position_created',
      timestamp: Date.now(),
      data: position,
    });

    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create CLMM position');
    res.status(500).json({
      success: false,
      error: 'Failed to create CLMM position',
    });
  }
});

// POST /api/v1/raydium/clmm/increase - Increase liquidity
raydiumRouter.post('/clmm/increase', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { positionId, amount } = req.body;

    if (!positionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: positionId, amount',
      });
    }

    const position = raydiumOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const updated = raydiumOps.updatePosition(positionId, {
      tokenAAmount: position.tokenAAmount + Number(amount),
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to increase liquidity');
    res.status(500).json({
      success: false,
      error: 'Failed to increase liquidity',
    });
  }
});

// POST /api/v1/raydium/clmm/decrease - Decrease liquidity
raydiumRouter.post('/clmm/decrease', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { positionId, amount } = req.body;

    if (!positionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: positionId, amount',
      });
    }

    const position = raydiumOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const newAmount = Math.max(0, position.tokenAAmount - Number(amount));
    const updated = raydiumOps.updatePosition(positionId, {
      tokenAAmount: newAmount,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to decrease liquidity');
    res.status(500).json({
      success: false,
      error: 'Failed to decrease liquidity',
    });
  }
});

// GET /api/v1/raydium/clmm/positions - List user positions
raydiumRouter.get('/clmm/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, poolId } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const positions = raydiumOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      poolId: poolId as string | undefined,
    });

    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list positions');
    res.status(500).json({
      success: false,
      error: 'Failed to list positions',
    });
  }
});

// POST /api/v1/raydium/harvest - Harvest yields
raydiumRouter.post('/harvest', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { positionId, userWallet } = req.body;

    if (!positionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: positionId',
      });
    }

    const position = raydiumOps.getPositionById(positionId);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const harvestedFeeA = position.feeOwedA;
    const harvestedFeeB = position.feeOwedB;
    const harvestedReward = position.rewardOwed;

    const updated = raydiumOps.updatePosition(positionId, {
      feeOwedA: 0,
      feeOwedB: 0,
      rewardOwed: 0,
    });

    logger.info({ positionId, harvestedFeeA, harvestedFeeB, harvestedReward }, 'Yields harvested');

    io?.emit('raydium_harvest_completed', {
      type: 'raydium_harvest_completed',
      timestamp: Date.now(),
      data: { positionId, harvestedFeeA, harvestedFeeB, harvestedReward },
    });

    res.json({
      success: true,
      data: {
        position: updated,
        harvested: {
          feeA: harvestedFeeA,
          feeB: harvestedFeeB,
          reward: harvestedReward,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to harvest yields');
    res.status(500).json({
      success: false,
      error: 'Failed to harvest yields',
    });
  }
});

// GET /api/v1/raydium/swaps - Get swap history
raydiumRouter.get('/swaps', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const swaps = raydiumOps.getSwapsByWallet(wallet as string, limit ? Number(limit) : 50);

    res.json({
      success: true,
      data: swaps,
      count: swaps.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get swap history');
    res.status(500).json({
      success: false,
      error: 'Failed to get swap history',
    });
  }
});

// GET /api/v1/raydium/stats - Get position stats
raydiumRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = raydiumOps.getPositionStats(wallet as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});
