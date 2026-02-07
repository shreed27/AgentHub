/**
 * X402 Payments Routes
 */

import { Router, Request, Response } from 'express';
import * as paymentOps from '../db/operations/payments.js';

export const paymentsRouter = Router();

// ========== Payment Operations ==========

// POST /api/v1/payments/x402/create - Create payment
paymentsRouter.post('/x402/create', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, recipientWallet, amount, currency, paymentType, description, reference, metadata, expiresAt } = req.body;

    if (!userWallet || !recipientWallet || !amount || !currency || !paymentType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const payment = paymentOps.createPayment({
      userWallet,
      recipientWallet,
      amount: Number(amount),
      currency,
      paymentType,
      description,
      reference: reference || `pay-${Date.now()}`,
      metadata,
      status: 'pending',
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
    });

    logger.info({ paymentId: payment.id, amount, currency }, 'Payment created');
    io?.emit('payment_created', { type: 'payment_created', timestamp: Date.now(), data: payment });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    logger.error({ error }, 'Failed to create payment');
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});

// POST /api/v1/payments/x402/verify - Verify payment
paymentsRouter.post('/x402/verify', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { paymentId, reference } = req.body;

    if (!paymentId && !reference) {
      return res.status(400).json({ success: false, error: 'Missing required field: paymentId or reference' });
    }

    let payment: ReturnType<typeof paymentOps.getPaymentById> = null;
    if (paymentId) {
      payment = paymentOps.getPaymentById(paymentId);
    } else if (reference) {
      payment = paymentOps.getPaymentByReference(reference);
    }

    if (!payment) {
      return res.json({ success: true, data: { valid: false, reason: 'Payment not found' } });
    }

    const verification = paymentOps.verifyPayment(payment.id);
    res.json({ success: true, data: verification });
  } catch (error) {
    logger.error({ error }, 'Failed to verify payment');
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

// POST /api/v1/payments/x402/complete - Complete payment
paymentsRouter.post('/x402/complete', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { paymentId, txHash } = req.body;

    if (!paymentId || !txHash) {
      return res.status(400).json({ success: false, error: 'Missing required fields: paymentId, txHash' });
    }

    const payment = paymentOps.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const completed = paymentOps.completePayment(paymentId, txHash);
    logger.info({ paymentId, txHash }, 'Payment completed');

    io?.emit('payment_completed', { type: 'payment_completed', timestamp: Date.now(), data: completed });

    res.json({ success: true, data: completed });
  } catch (error) {
    logger.error({ error }, 'Failed to complete payment');
    res.status(500).json({ success: false, error: 'Failed to complete payment' });
  }
});

// GET /api/v1/payments/x402/history - Payment history
paymentsRouter.get('/x402/history', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, paymentType, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const payments = paymentOps.getPaymentsByWallet(wallet as string, {
      status: status as string | undefined,
      paymentType: paymentType as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: payments, count: payments.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get payment history');
    res.status(500).json({ success: false, error: 'Failed to get payment history' });
  }
});

// GET /api/v1/payments/x402/:id - Get payment
paymentsRouter.get('/x402/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const payment = paymentOps.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    logger.error({ error }, 'Failed to get payment');
    res.status(500).json({ success: false, error: 'Failed to get payment' });
  }
});

// POST /api/v1/payments/x402/:id/refund - Refund payment
paymentsRouter.post('/x402/:id/refund', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const payment = paymentOps.getPaymentById(id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Can only refund completed payments' });
    }

    const refunded = paymentOps.refundPayment(id);
    logger.info({ paymentId: id }, 'Payment refunded');

    io?.emit('payment_refunded', { type: 'payment_refunded', timestamp: Date.now(), data: refunded });

    res.json({ success: true, data: refunded });
  } catch (error) {
    logger.error({ error }, 'Failed to refund payment');
    res.status(500).json({ success: false, error: 'Failed to refund payment' });
  }
});

// ========== Subscription Operations ==========

// POST /api/v1/payments/subscriptions - Create subscription
paymentsRouter.post('/subscriptions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, recipientWallet, name, amount, currency, interval, expiresAt } = req.body;

    if (!userWallet || !recipientWallet || !name || !amount || !currency || !interval) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const validIntervals = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ success: false, error: 'Invalid interval' });
    }

    const subscription = paymentOps.createSubscription({
      userWallet,
      recipientWallet,
      name,
      amount: Number(amount),
      currency,
      interval,
      status: 'active',
      totalPayments: 0,
      totalPaid: 0,
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
    });

    logger.info({ subscriptionId: subscription.id, name, interval }, 'Subscription created');
    io?.emit('subscription_created', { type: 'subscription_created', timestamp: Date.now(), data: subscription });

    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to create subscription');
    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  }
});

// GET /api/v1/payments/subscriptions - List subscriptions
paymentsRouter.get('/subscriptions', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const subscriptions = paymentOps.getSubscriptionsByWallet(wallet as string, {
      status: status as string | undefined,
    });

    res.json({ success: true, data: subscriptions, count: subscriptions.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get subscriptions');
    res.status(500).json({ success: false, error: 'Failed to get subscriptions' });
  }
});

// GET /api/v1/payments/subscriptions/:id - Get subscription
paymentsRouter.get('/subscriptions/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const subscription = paymentOps.getSubscriptionById(id);

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    logger.error({ error }, 'Failed to get subscription');
    res.status(500).json({ success: false, error: 'Failed to get subscription' });
  }
});

// POST /api/v1/payments/subscriptions/:id/pause - Pause subscription
paymentsRouter.post('/subscriptions/:id/pause', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;

    const subscription = paymentOps.getSubscriptionById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const paused = paymentOps.pauseSubscription(id);
    logger.info({ subscriptionId: id }, 'Subscription paused');

    res.json({ success: true, data: paused });
  } catch (error) {
    logger.error({ error }, 'Failed to pause subscription');
    res.status(500).json({ success: false, error: 'Failed to pause subscription' });
  }
});

// POST /api/v1/payments/subscriptions/:id/resume - Resume subscription
paymentsRouter.post('/subscriptions/:id/resume', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;

    const subscription = paymentOps.getSubscriptionById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const resumed = paymentOps.resumeSubscription(id);
    logger.info({ subscriptionId: id }, 'Subscription resumed');

    res.json({ success: true, data: resumed });
  } catch (error) {
    logger.error({ error }, 'Failed to resume subscription');
    res.status(500).json({ success: false, error: 'Failed to resume subscription' });
  }
});

// POST /api/v1/payments/subscriptions/:id/cancel - Cancel subscription
paymentsRouter.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;

    const subscription = paymentOps.getSubscriptionById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const cancelled = paymentOps.cancelSubscription(id);
    logger.info({ subscriptionId: id }, 'Subscription cancelled');

    res.json({ success: true, data: cancelled });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel subscription');
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// GET /api/v1/payments/stats - Payment stats
paymentsRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = paymentOps.getPaymentStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get payment stats');
    res.status(500).json({ success: false, error: 'Failed to get payment stats' });
  }
});
