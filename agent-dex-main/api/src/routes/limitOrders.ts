import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createLimitOrder, getActiveLimitOrders, cancelLimitOrder, getLimitOrderById } from '../db';

const router = Router();

// All limit order routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/limit-order
 * Place a limit order
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, targetPrice, slippageBps, side } = req.body;

    if (!inputMint || !outputMint || !amount || !targetPrice || !side) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Required: inputMint, outputMint, amount, targetPrice, side (buy/sell)',
      });
      return;
    }

    if (!['buy', 'sell'].includes(side)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'side must be "buy" or "sell"',
      });
      return;
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'targetPrice must be a positive number',
      });
      return;
    }

    const order = createLimitOrder({
      agentId: req.agent!.id,
      inputMint,
      outputMint,
      amount: amount.toString(),
      targetPrice,
      slippageBps,
      side,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

/**
 * GET /api/v1/limit-order
 * List active limit orders for the authenticated agent
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const orders = getActiveLimitOrders(req.agent!.id);

    res.json({
      success: true,
      data: {
        orders,
        count: orders.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

/**
 * DELETE /api/v1/limit-order/:id
 * Cancel a limit order
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = getLimitOrderById(id);
    if (!order) {
      res.status(404).json({ error: 'Not Found', message: 'Order not found' });
      return;
    }

    if (order.agent_id !== req.agent!.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your order' });
      return;
    }

    const cancelled = cancelLimitOrder(id, req.agent!.id);
    if (!cancelled) {
      res.status(400).json({ error: 'Bad Request', message: 'Order cannot be cancelled (already filled or cancelled)' });
      return;
    }

    res.json({
      success: true,
      message: 'Order cancelled',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

export default router;
