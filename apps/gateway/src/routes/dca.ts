/**
 * DCA (Dollar Cost Averaging) Integration Routes
 */

import { Router, Request, Response } from 'express';
import * as dcaOps from '../db/operations/dca.js';

export const dcaRouter = Router();

// POST /api/v1/dca/plans - Create DCA plan
dcaRouter.post('/plans', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const {
      userWallet,
      inputMint,
      outputMint,
      inputMintSymbol,
      outputMintSymbol,
      totalInputAmount,
      inputAmountPerCycle,
      cycleFrequencySeconds,
      minOutputPerCycle,
      maxOutputPerCycle,
      totalCycles,
    } = req.body;

    if (!userWallet || !inputMint || !outputMint || !totalInputAmount || !inputAmountPerCycle || !cycleFrequencySeconds) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const now = Date.now();
    const plan = dcaOps.createPlan({
      userWallet,
      inputMint,
      outputMint,
      inputMintSymbol,
      outputMintSymbol,
      totalInputAmount: Number(totalInputAmount),
      inputAmountPerCycle: Number(inputAmountPerCycle),
      cycleFrequencySeconds: Number(cycleFrequencySeconds),
      minOutputPerCycle: minOutputPerCycle ? Number(minOutputPerCycle) : undefined,
      maxOutputPerCycle: maxOutputPerCycle ? Number(maxOutputPerCycle) : undefined,
      cyclesCompleted: 0,
      totalCycles: totalCycles ? Number(totalCycles) : undefined,
      totalOutputReceived: 0,
      status: 'active',
      nextCycleAt: now + Number(cycleFrequencySeconds) * 1000,
      startedAt: now,
    });

    logger.info({ planId: plan.id, inputMint, outputMint }, 'DCA plan created');

    io?.emit('dca_plan_created', {
      type: 'dca_plan_created',
      timestamp: Date.now(),
      data: plan,
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create DCA plan');
    res.status(500).json({
      success: false,
      error: 'Failed to create DCA plan',
    });
  }
});

// GET /api/v1/dca/plans - List DCA plans
dcaRouter.get('/plans', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const plans = dcaOps.getPlansByWallet(wallet as string, {
      status: status as string | undefined,
    });

    res.json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list DCA plans');
    res.status(500).json({
      success: false,
      error: 'Failed to list DCA plans',
    });
  }
});

// GET /api/v1/dca/plans/:id - Get DCA plan
dcaRouter.get('/plans/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get DCA plan');
    res.status(500).json({
      success: false,
      error: 'Failed to get DCA plan',
    });
  }
});

// POST /api/v1/dca/plans/:id/execute - Manual execute cycle
dcaRouter.post('/plans/:id/execute', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'DCA plan is not active',
      });
    }

    // Create execution record
    const now = Date.now();
    const cycleNumber = plan.cyclesCompleted + 1;
    const outputAmount = plan.inputAmountPerCycle * 0.98; // Mock swap result
    const price = plan.inputAmountPerCycle / outputAmount;

    const execution = dcaOps.createExecution({
      planId: id,
      cycleNumber,
      inputAmount: plan.inputAmountPerCycle,
      outputAmount,
      price,
      status: 'pending',
      executedAt: now,
    });

    // Update plan
    const newTotalOutput = plan.totalOutputReceived + outputAmount;
    const newCyclesCompleted = plan.cyclesCompleted + 1;
    const newAvgPrice = (plan.inputAmountPerCycle * newCyclesCompleted) / newTotalOutput;

    const isComplete = plan.totalCycles && newCyclesCompleted >= plan.totalCycles;

    const updatedPlan = dcaOps.updatePlan(id, {
      cyclesCompleted: newCyclesCompleted,
      totalOutputReceived: newTotalOutput,
      avgPrice: newAvgPrice,
      nextCycleAt: isComplete ? undefined : now + plan.cycleFrequencySeconds * 1000,
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? now : undefined,
    });

    logger.info({ planId: id, cycleNumber, outputAmount }, 'DCA cycle executed');

    io?.emit('dca_cycle_executed', {
      type: 'dca_cycle_executed',
      timestamp: Date.now(),
      data: { plan: updatedPlan, execution },
    });

    res.json({
      success: true,
      data: {
        plan: updatedPlan,
        execution,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to execute DCA cycle');
    res.status(500).json({
      success: false,
      error: 'Failed to execute DCA cycle',
    });
  }
});

// POST /api/v1/dca/plans/:id/pause - Pause DCA plan
dcaRouter.post('/plans/:id/pause', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    if (plan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'DCA plan is not active',
      });
    }

    const paused = dcaOps.pausePlan(id);

    logger.info({ planId: id }, 'DCA plan paused');

    io?.emit('dca_plan_paused', {
      type: 'dca_plan_paused',
      timestamp: Date.now(),
      data: paused,
    });

    res.json({
      success: true,
      data: paused,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to pause DCA plan');
    res.status(500).json({
      success: false,
      error: 'Failed to pause DCA plan',
    });
  }
});

// POST /api/v1/dca/plans/:id/resume - Resume DCA plan
dcaRouter.post('/plans/:id/resume', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    if (plan.status !== 'paused') {
      return res.status(400).json({
        success: false,
        error: 'DCA plan is not paused',
      });
    }

    const resumed = dcaOps.resumePlan(id);

    logger.info({ planId: id }, 'DCA plan resumed');

    io?.emit('dca_plan_resumed', {
      type: 'dca_plan_resumed',
      timestamp: Date.now(),
      data: resumed,
    });

    res.json({
      success: true,
      data: resumed,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to resume DCA plan');
    res.status(500).json({
      success: false,
      error: 'Failed to resume DCA plan',
    });
  }
});

// DELETE /api/v1/dca/plans/:id - Cancel DCA plan
dcaRouter.delete('/plans/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    if (plan.status === 'completed' || plan.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'DCA plan is already completed or cancelled',
      });
    }

    const cancelled = dcaOps.cancelPlan(id);

    logger.info({ planId: id }, 'DCA plan cancelled');

    io?.emit('dca_plan_cancelled', {
      type: 'dca_plan_cancelled',
      timestamp: Date.now(),
      data: cancelled,
    });

    res.json({
      success: true,
      data: cancelled,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel DCA plan');
    res.status(500).json({
      success: false,
      error: 'Failed to cancel DCA plan',
    });
  }
});

// GET /api/v1/dca/plans/:id/history - Get execution history
dcaRouter.get('/plans/:id/history', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { limit } = req.query;

    const plan = dcaOps.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'DCA plan not found',
      });
    }

    const executions = dcaOps.getExecutionsByPlan(id, limit ? Number(limit) : 50);

    res.json({
      success: true,
      data: executions,
      count: executions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get DCA history');
    res.status(500).json({
      success: false,
      error: 'Failed to get DCA history',
    });
  }
});

// GET /api/v1/dca/stats - Get user DCA stats
dcaRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: wallet',
      });
    }

    const stats = dcaOps.getPlanStats(wallet as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get DCA stats');
    res.status(500).json({
      success: false,
      error: 'Failed to get DCA stats',
    });
  }
});
