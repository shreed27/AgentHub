/**
 * Meteora DEX Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as meteoraOps from '../db/operations/meteora.js';

export const meteoraRouter = Router();

// POST /api/v1/meteora/swap - Execute DLMM swap
meteoraRouter.post('/swap', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, inputMint, outputMint, amount, slippageBps, lbPairAddress } = req.body;

    if (!userWallet || !inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, inputMint, outputMint, amount',
      });
    }

    const swap = meteoraOps.createSwap({
      userWallet,
      lbPairAddress,
      inputMint,
      outputMint,
      inputAmount: Number(amount),
      outputAmount: 0,
      slippageBps,
      priceImpact: 0,
      feeAmount: 0,
      status: 'pending',
    });

    logger.info({ swapId: swap.id, inputMint, outputMint }, 'Meteora swap initiated');

    io?.emit('meteora_swap_started', {
      type: 'meteora_swap_started',
      timestamp: Date.now(),
      data: swap,
    });

    res.status(201).json({
      success: true,
      data: swap,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to execute Meteora swap');
    res.status(500).json({
      success: false,
      error: 'Failed to execute Meteora swap',
    });
  }
});

// POST /api/v1/meteora/quote - Get DLMM quote
meteoraRouter.post('/quote', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { inputMint, outputMint, amount, lbPairAddress, slippageBps } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputMint, outputMint, amount',
      });
    }

    const quote = {
      inputMint,
      outputMint,
      inAmount: amount,
      outAmount: String(Number(amount) * 0.98),
      priceImpactPct: '0.3',
      slippageBps: slippageBps || 50,
      lbPairAddress,
      dynamicFee: 0.2,
    };

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Meteora quote');
    res.status(500).json({
      success: false,
      error: 'Failed to get Meteora quote',
    });
  }
});

// GET /api/v1/meteora/pools - List DLMM pools
meteoraRouter.get('/pools', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { tokenX, tokenY, limit } = req.query;

    const pools = [
      {
        address: 'dlmm-pool-1',
        tokenXMint: 'So11111111111111111111111111111111111111112',
        tokenYMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        binStep: 10,
        baseFee: 0.2,
        maxFee: 0.5,
        activeId: 1000,
        liquidity: '1000000000',
        price: 100,
        volume24h: 500000,
      },
    ];

    res.json({
      success: true,
      data: pools,
      count: pools.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list Meteora pools');
    res.status(500).json({
      success: false,
      error: 'Failed to list Meteora pools',
    });
  }
});

// POST /api/v1/meteora/positions/create - Create DLMM position
meteoraRouter.post('/positions/create', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, lbPairAddress, lowerBinId, upperBinId, totalXAmount, totalYAmount } = req.body;

    if (!userWallet || !lbPairAddress || lowerBinId === undefined || upperBinId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const position = meteoraOps.createPosition({
      userWallet,
      positionAddress: `position-${Date.now()}`,
      lbPairAddress,
      lowerBinId,
      upperBinId,
      totalXAmount: String(totalXAmount || 0),
      totalYAmount: String(totalYAmount || 0),
      feeX: 0,
      feeY: 0,
      rewardOne: 0,
      rewardTwo: 0,
      status: 'pending',
      openedAt: Date.now(),
    });

    logger.info({ positionId: position.id, lbPairAddress }, 'Meteora position created');

    io?.emit('meteora_position_created', {
      type: 'meteora_position_created',
      timestamp: Date.now(),
      data: position,
    });

    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create Meteora position');
    res.status(500).json({
      success: false,
      error: 'Failed to create Meteora position',
    });
  }
});

// POST /api/v1/meteora/positions/:id/add - Add liquidity
meteoraRouter.post('/positions/:id/add', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { amountX, amountY } = req.body;

    const position = meteoraOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const newX = BigInt(position.totalXAmount) + BigInt(amountX || 0);
    const newY = BigInt(position.totalYAmount) + BigInt(amountY || 0);

    const updated = meteoraOps.updatePosition(id, {
      totalXAmount: newX.toString(),
      totalYAmount: newY.toString(),
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to add liquidity');
    res.status(500).json({
      success: false,
      error: 'Failed to add liquidity',
    });
  }
});

// POST /api/v1/meteora/positions/:id/remove - Remove liquidity
meteoraRouter.post('/positions/:id/remove', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { amountX, amountY } = req.body;

    const position = meteoraOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const currentX = BigInt(position.totalXAmount);
    const currentY = BigInt(position.totalYAmount);
    const removeX = BigInt(amountX || 0);
    const removeY = BigInt(amountY || 0);

    const newX = currentX > removeX ? currentX - removeX : BigInt(0);
    const newY = currentY > removeY ? currentY - removeY : BigInt(0);

    const updated = meteoraOps.updatePosition(id, {
      totalXAmount: newX.toString(),
      totalYAmount: newY.toString(),
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to remove liquidity');
    res.status(500).json({
      success: false,
      error: 'Failed to remove liquidity',
    });
  }
});

// POST /api/v1/meteora/positions/:id/claim - Claim fees and rewards
meteoraRouter.post('/positions/:id/claim', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const position = meteoraOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const claimed = {
      feeX: position.feeX,
      feeY: position.feeY,
      rewardOne: position.rewardOne,
      rewardTwo: position.rewardTwo,
    };

    const updated = meteoraOps.updatePosition(id, {
      feeX: 0,
      feeY: 0,
      rewardOne: 0,
      rewardTwo: 0,
    });

    logger.info({ positionId: id, claimed }, 'Fees and rewards claimed');

    io?.emit('meteora_fees_claimed', {
      type: 'meteora_fees_claimed',
      timestamp: Date.now(),
      data: { positionId: id, claimed },
    });

    res.json({
      success: true,
      data: {
        position: updated,
        claimed,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to claim fees');
    res.status(500).json({
      success: false,
      error: 'Failed to claim fees',
    });
  }
});

// GET /api/v1/meteora/positions - List user positions
meteoraRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, lbPairAddress } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const positions = meteoraOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      lbPairAddress: lbPairAddress as string | undefined,
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

// GET /api/v1/meteora/swaps - Get swap history
meteoraRouter.get('/swaps', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const swaps = meteoraOps.getSwapsByWallet(wallet as string, limit ? Number(limit) : 50);

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

// GET /api/v1/meteora/stats - Get position stats
meteoraRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = meteoraOps.getPositionStats(wallet as string);

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
