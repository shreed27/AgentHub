/**
 * Orca DEX Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as orcaOps from '../db/operations/orca.js';

export const orcaRouter = Router();

// POST /api/v1/orca/swap - Execute Whirlpool swap
orcaRouter.post('/swap', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, inputMint, outputMint, amount, slippageBps, whirlpoolAddress } = req.body;

    if (!userWallet || !inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, inputMint, outputMint, amount',
      });
    }

    const swap = orcaOps.createSwap({
      userWallet,
      whirlpoolAddress,
      inputMint,
      outputMint,
      inputAmount: Number(amount),
      outputAmount: 0,
      slippageBps,
      priceImpact: 0,
      feeAmount: 0,
      status: 'pending',
    });

    logger.info({ swapId: swap.id, inputMint, outputMint }, 'Orca swap initiated');

    io?.emit('orca_swap_started', {
      type: 'orca_swap_started',
      timestamp: Date.now(),
      data: swap,
    });

    res.status(201).json({
      success: true,
      data: swap,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to execute Orca swap');
    res.status(500).json({
      success: false,
      error: 'Failed to execute Orca swap',
    });
  }
});

// POST /api/v1/orca/quote - Get Whirlpool quote
orcaRouter.post('/quote', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { inputMint, outputMint, amount, slippageBps } = req.body;

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
      priceImpactPct: '0.4',
      slippageBps: slippageBps || 50,
    };

    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get Orca quote');
    res.status(500).json({
      success: false,
      error: 'Failed to get Orca quote',
    });
  }
});

// GET /api/v1/orca/pools - List Whirlpools
orcaRouter.get('/pools', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { tokenA, tokenB, limit } = req.query;

    const pools = [
      {
        address: 'whirlpool-1',
        tokenMintA: 'So11111111111111111111111111111111111111112',
        tokenMintB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tickSpacing: 64,
        feeRate: 0.3,
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
    logger.error({ error }, 'Failed to list Orca pools');
    res.status(500).json({
      success: false,
      error: 'Failed to list Orca pools',
    });
  }
});

// POST /api/v1/orca/positions/create - Create position
orcaRouter.post('/positions/create', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, whirlpoolAddress, tickLowerIndex, tickUpperIndex, tokenAmountA, tokenAmountB, tokenAMint, tokenBMint } = req.body;

    if (!userWallet || !whirlpoolAddress || tickLowerIndex === undefined || tickUpperIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const position = orcaOps.createPosition({
      userWallet,
      positionAddress: `position-${Date.now()}`,
      whirlpoolAddress,
      tickLowerIndex,
      tickUpperIndex,
      liquidity: '0',
      tokenAMint: tokenAMint || '',
      tokenBMint: tokenBMint || '',
      tokenAAmount: Number(tokenAmountA) || 0,
      tokenBAmount: Number(tokenAmountB) || 0,
      feeOwedA: 0,
      feeOwedB: 0,
      rewardOwed0: 0,
      rewardOwed1: 0,
      rewardOwed2: 0,
      status: 'pending',
      openedAt: Date.now(),
    });

    logger.info({ positionId: position.id, whirlpoolAddress }, 'Orca position created');

    io?.emit('orca_position_created', {
      type: 'orca_position_created',
      timestamp: Date.now(),
      data: position,
    });

    res.status(201).json({
      success: true,
      data: position,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create Orca position');
    res.status(500).json({
      success: false,
      error: 'Failed to create Orca position',
    });
  }
});

// POST /api/v1/orca/positions/:id/increase - Increase liquidity
orcaRouter.post('/positions/:id/increase', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { amountA, amountB } = req.body;

    const position = orcaOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const updated = orcaOps.updatePosition(id, {
      tokenAAmount: position.tokenAAmount + (Number(amountA) || 0),
      tokenBAmount: position.tokenBAmount + (Number(amountB) || 0),
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

// POST /api/v1/orca/positions/:id/decrease - Decrease liquidity
orcaRouter.post('/positions/:id/decrease', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { amountA, amountB } = req.body;

    const position = orcaOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const updated = orcaOps.updatePosition(id, {
      tokenAAmount: Math.max(0, position.tokenAAmount - (Number(amountA) || 0)),
      tokenBAmount: Math.max(0, position.tokenBAmount - (Number(amountB) || 0)),
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

// POST /api/v1/orca/positions/:id/close - Close position
orcaRouter.post('/positions/:id/close', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const position = orcaOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const closed = orcaOps.closePosition(id);

    logger.info({ positionId: id }, 'Orca position closed');

    io?.emit('orca_position_closed', {
      type: 'orca_position_closed',
      timestamp: Date.now(),
      data: closed,
    });

    res.json({
      success: true,
      data: closed,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to close position');
    res.status(500).json({
      success: false,
      error: 'Failed to close position',
    });
  }
});

// POST /api/v1/orca/positions/:id/collect - Collect fees and rewards
orcaRouter.post('/positions/:id/collect', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const position = orcaOps.getPositionById(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    const collected = {
      feeA: position.feeOwedA,
      feeB: position.feeOwedB,
      reward0: position.rewardOwed0,
      reward1: position.rewardOwed1,
      reward2: position.rewardOwed2,
    };

    const updated = orcaOps.updatePosition(id, {
      feeOwedA: 0,
      feeOwedB: 0,
      rewardOwed0: 0,
      rewardOwed1: 0,
      rewardOwed2: 0,
    });

    logger.info({ positionId: id, collected }, 'Fees and rewards collected');

    io?.emit('orca_fees_collected', {
      type: 'orca_fees_collected',
      timestamp: Date.now(),
      data: { positionId: id, collected },
    });

    res.json({
      success: true,
      data: {
        position: updated,
        collected,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to collect fees');
    res.status(500).json({
      success: false,
      error: 'Failed to collect fees',
    });
  }
});

// GET /api/v1/orca/positions - List user positions
orcaRouter.get('/positions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, whirlpoolAddress } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const positions = orcaOps.getPositionsByWallet(wallet as string, {
      status: status as string | undefined,
      whirlpoolAddress: whirlpoolAddress as string | undefined,
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

// GET /api/v1/orca/swaps - Get swap history
orcaRouter.get('/swaps', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const swaps = orcaOps.getSwapsByWallet(wallet as string, limit ? Number(limit) : 50);

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

// GET /api/v1/orca/stats - Get position stats
orcaRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = orcaOps.getPositionStats(wallet as string);

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
