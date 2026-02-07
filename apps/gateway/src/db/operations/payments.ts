/**
 * Database Operations for X402 Payments
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface X402Payment {
  id: string;
  userWallet: string;
  recipientWallet: string;
  amount: number;
  currency: string;
  paymentType: 'service' | 'subscription' | 'tip' | 'bounty' | 'trade';
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  txHash?: string;
  error?: string;
  expiresAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentSubscription {
  id: string;
  userWallet: string;
  recipientWallet: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  nextPayment?: number;
  lastPayment?: number;
  totalPayments: number;
  totalPaid: number;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface PaymentRow {
  id: string;
  user_wallet: string;
  recipient_wallet: string;
  amount: number;
  currency: string;
  payment_type: string;
  description: string | null;
  reference: string | null;
  metadata: string | null;
  status: string;
  tx_hash: string | null;
  error: string | null;
  expires_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface SubscriptionRow {
  id: string;
  user_wallet: string;
  recipient_wallet: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  status: string;
  next_payment: number | null;
  last_payment: number | null;
  total_payments: number;
  total_paid: number;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

function rowToPayment(row: PaymentRow): X402Payment {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    recipientWallet: row.recipient_wallet,
    amount: row.amount,
    currency: row.currency,
    paymentType: row.payment_type as X402Payment['paymentType'],
    description: row.description || undefined,
    reference: row.reference || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    status: row.status as X402Payment['status'],
    txHash: row.tx_hash || undefined,
    error: row.error || undefined,
    expiresAt: row.expires_at || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSubscription(row: SubscriptionRow): PaymentSubscription {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    recipientWallet: row.recipient_wallet,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    interval: row.interval as PaymentSubscription['interval'],
    status: row.status as PaymentSubscription['status'],
    nextPayment: row.next_payment || undefined,
    lastPayment: row.last_payment || undefined,
    totalPayments: row.total_payments,
    totalPaid: row.total_paid,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Payment Operations
export function createPayment(data: Omit<X402Payment, 'id' | 'createdAt' | 'updatedAt'>): X402Payment {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO x402_payments (
      id, user_wallet, recipient_wallet, amount, currency, payment_type, description,
      reference, metadata, status, tx_hash, error, expires_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.recipientWallet, data.amount, data.currency,
    data.paymentType, data.description || null, data.reference || null,
    data.metadata ? JSON.stringify(data.metadata) : null, data.status || 'pending',
    data.txHash || null, data.error || null, data.expiresAt || null, data.completedAt || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPaymentsByWallet(userWallet: string, filters?: { status?: string; paymentType?: string; limit?: number }): X402Payment[] {
  const db = getDatabase();
  let query = 'SELECT * FROM x402_payments WHERE (user_wallet = ? OR recipient_wallet = ?)';
  const params: unknown[] = [userWallet, userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.paymentType) {
    query += ' AND payment_type = ?';
    params.push(filters.paymentType);
  }

  query += ' ORDER BY created_at DESC';
  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PaymentRow[];
  return rows.map(rowToPayment);
}

export function getPaymentById(id: string): X402Payment | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM x402_payments WHERE id = ?');
  const row = stmt.get(id) as PaymentRow | undefined;
  return row ? rowToPayment(row) : null;
}

export function getPaymentByReference(reference: string): X402Payment | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM x402_payments WHERE reference = ?');
  const row = stmt.get(reference) as PaymentRow | undefined;
  return row ? rowToPayment(row) : null;
}

export function updatePayment(id: string, updates: Partial<X402Payment>): X402Payment | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.txHash !== undefined) { fields.push('tx_hash = ?'); params.push(updates.txHash); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }
  if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); params.push(updates.completedAt); }

  if (fields.length === 0) return getPaymentById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE x402_payments SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getPaymentById(id);
}

export function completePayment(id: string, txHash: string): X402Payment | null {
  return updatePayment(id, { status: 'completed', txHash, completedAt: Date.now() });
}

export function failPayment(id: string, error: string): X402Payment | null {
  return updatePayment(id, { status: 'failed', error });
}

export function refundPayment(id: string): X402Payment | null {
  return updatePayment(id, { status: 'refunded' });
}

// Verify a payment (check if valid and not expired)
export function verifyPayment(id: string): { valid: boolean; payment: X402Payment | null; reason?: string } {
  const payment = getPaymentById(id);

  if (!payment) {
    return { valid: false, payment: null, reason: 'Payment not found' };
  }

  if (payment.status !== 'completed') {
    return { valid: false, payment, reason: `Payment status is ${payment.status}` };
  }

  if (payment.expiresAt && payment.expiresAt < Date.now()) {
    return { valid: false, payment, reason: 'Payment has expired' };
  }

  return { valid: true, payment };
}

// Subscription Operations
export function createSubscription(data: Omit<PaymentSubscription, 'id' | 'createdAt' | 'updatedAt'>): PaymentSubscription {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  // Calculate next payment date
  const nextPayment = calculateNextPayment(now, data.interval);

  const stmt = db.prepare(`
    INSERT INTO payment_subscriptions (
      id, user_wallet, recipient_wallet, name, amount, currency, interval, status,
      next_payment, last_payment, total_payments, total_paid, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.recipientWallet, data.name, data.amount, data.currency,
    data.interval, data.status || 'active', nextPayment, data.lastPayment || null,
    data.totalPayments || 0, data.totalPaid || 0, data.expiresAt || null, now, now
  );

  return { id, ...data, nextPayment, createdAt: now, updatedAt: now };
}

export function getSubscriptionsByWallet(userWallet: string, filters?: { status?: string }): PaymentSubscription[] {
  const db = getDatabase();
  let query = 'SELECT * FROM payment_subscriptions WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as SubscriptionRow[];
  return rows.map(rowToSubscription);
}

export function getSubscriptionById(id: string): PaymentSubscription | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM payment_subscriptions WHERE id = ?');
  const row = stmt.get(id) as SubscriptionRow | undefined;
  return row ? rowToSubscription(row) : null;
}

export function updateSubscription(id: string, updates: Partial<PaymentSubscription>): PaymentSubscription | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.nextPayment !== undefined) { fields.push('next_payment = ?'); params.push(updates.nextPayment); }
  if (updates.lastPayment !== undefined) { fields.push('last_payment = ?'); params.push(updates.lastPayment); }
  if (updates.totalPayments !== undefined) { fields.push('total_payments = ?'); params.push(updates.totalPayments); }
  if (updates.totalPaid !== undefined) { fields.push('total_paid = ?'); params.push(updates.totalPaid); }

  if (fields.length === 0) return getSubscriptionById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE payment_subscriptions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getSubscriptionById(id);
}

export function pauseSubscription(id: string): PaymentSubscription | null {
  return updateSubscription(id, { status: 'paused' });
}

export function resumeSubscription(id: string): PaymentSubscription | null {
  const sub = getSubscriptionById(id);
  if (!sub) return null;

  const nextPayment = calculateNextPayment(Date.now(), sub.interval);
  return updateSubscription(id, { status: 'active', nextPayment });
}

export function cancelSubscription(id: string): PaymentSubscription | null {
  return updateSubscription(id, { status: 'cancelled' });
}

// Process a subscription payment
export function processSubscriptionPayment(id: string, txHash: string): { subscription: PaymentSubscription | null; payment: X402Payment | null } {
  const sub = getSubscriptionById(id);
  if (!sub || sub.status !== 'active') {
    return { subscription: sub, payment: null };
  }

  // Create payment record
  const payment = createPayment({
    userWallet: sub.userWallet,
    recipientWallet: sub.recipientWallet,
    amount: sub.amount,
    currency: sub.currency,
    paymentType: 'subscription',
    description: `Subscription: ${sub.name}`,
    reference: `sub-${id}-${sub.totalPayments + 1}`,
    status: 'completed',
    txHash,
    completedAt: Date.now(),
  });

  // Update subscription
  const nextPayment = calculateNextPayment(Date.now(), sub.interval);
  const updated = updateSubscription(id, {
    lastPayment: Date.now(),
    nextPayment,
    totalPayments: sub.totalPayments + 1,
    totalPaid: sub.totalPaid + sub.amount,
  });

  return { subscription: updated, payment };
}

function calculateNextPayment(fromDate: number, interval: PaymentSubscription['interval']): number {
  const date = new Date(fromDate);

  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.getTime();
}

// Get due subscriptions (for processing)
export function getDueSubscriptions(): PaymentSubscription[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM payment_subscriptions
    WHERE status = 'active' AND next_payment <= ?
    ORDER BY next_payment
  `);
  const rows = stmt.all(Date.now()) as SubscriptionRow[];
  return rows.map(rowToSubscription);
}

// Stats
export function getPaymentStats(userWallet: string): {
  totalPayments: number;
  totalSent: number;
  totalReceived: number;
  pendingPayments: number;
  activeSubscriptions: number;
  monthlyRecurring: number;
} {
  const db = getDatabase();

  const sentStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total FROM x402_payments
    WHERE user_wallet = ? AND status = 'completed'
  `);
  const sentRow = sentStmt.get(userWallet) as { count: number; total: number | null };

  const receivedStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total FROM x402_payments
    WHERE recipient_wallet = ? AND status = 'completed'
  `);
  const receivedRow = receivedStmt.get(userWallet) as { count: number; total: number | null };

  const pendingStmt = db.prepare(`
    SELECT COUNT(*) as count FROM x402_payments
    WHERE user_wallet = ? AND status = 'pending'
  `);
  const pendingRow = pendingStmt.get(userWallet) as { count: number };

  const subStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(CASE WHEN interval = 'monthly' THEN amount ELSE 0 END) as monthly
    FROM payment_subscriptions WHERE user_wallet = ? AND status = 'active'
  `);
  const subRow = subStmt.get(userWallet) as { count: number; monthly: number | null };

  return {
    totalPayments: sentRow.count + receivedRow.count,
    totalSent: sentRow.total || 0,
    totalReceived: receivedRow.total || 0,
    pendingPayments: pendingRow.count,
    activeSubscriptions: subRow.count,
    monthlyRecurring: subRow.monthly || 0,
  };
}
