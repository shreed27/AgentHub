/**
 * Database Operations for DCA (Dollar Cost Averaging) Integration
 */

import { getDatabase, parseJSON, stringifyJSON } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface DcaPlan {
  id: string;
  userWallet: string;
  dcaPubkey?: string;
  inputMint: string;
  outputMint: string;
  inputMintSymbol?: string;
  outputMintSymbol?: string;
  totalInputAmount: number;
  inputAmountPerCycle: number;
  cycleFrequencySeconds: number;
  minOutputPerCycle?: number;
  maxOutputPerCycle?: number;
  cyclesCompleted: number;
  totalCycles?: number;
  totalOutputReceived: number;
  avgPrice?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  nextCycleAt?: number;
  startedAt: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DcaExecution {
  id: string;
  planId: string;
  cycleNumber: number;
  inputAmount: number;
  outputAmount: number;
  price: number;
  txSignature?: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
  executedAt: number;
  createdAt: number;
}

interface PlanRow {
  id: string;
  user_wallet: string;
  dca_pubkey: string | null;
  input_mint: string;
  output_mint: string;
  input_mint_symbol: string | null;
  output_mint_symbol: string | null;
  total_input_amount: number;
  input_amount_per_cycle: number;
  cycle_frequency_seconds: number;
  min_output_per_cycle: number | null;
  max_output_per_cycle: number | null;
  cycles_completed: number;
  total_cycles: number | null;
  total_output_received: number;
  avg_price: number | null;
  status: string;
  next_cycle_at: number | null;
  started_at: number;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface ExecutionRow {
  id: string;
  plan_id: string;
  cycle_number: number;
  input_amount: number;
  output_amount: number;
  price: number;
  tx_signature: string | null;
  status: string;
  error: string | null;
  executed_at: number;
  created_at: number;
}

function rowToPlan(row: PlanRow): DcaPlan {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    dcaPubkey: row.dca_pubkey || undefined,
    inputMint: row.input_mint,
    outputMint: row.output_mint,
    inputMintSymbol: row.input_mint_symbol || undefined,
    outputMintSymbol: row.output_mint_symbol || undefined,
    totalInputAmount: row.total_input_amount,
    inputAmountPerCycle: row.input_amount_per_cycle,
    cycleFrequencySeconds: row.cycle_frequency_seconds,
    minOutputPerCycle: row.min_output_per_cycle || undefined,
    maxOutputPerCycle: row.max_output_per_cycle || undefined,
    cyclesCompleted: row.cycles_completed,
    totalCycles: row.total_cycles || undefined,
    totalOutputReceived: row.total_output_received,
    avgPrice: row.avg_price || undefined,
    status: row.status as DcaPlan['status'],
    nextCycleAt: row.next_cycle_at || undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToExecution(row: ExecutionRow): DcaExecution {
  return {
    id: row.id,
    planId: row.plan_id,
    cycleNumber: row.cycle_number,
    inputAmount: row.input_amount,
    outputAmount: row.output_amount,
    price: row.price,
    txSignature: row.tx_signature || undefined,
    status: row.status as DcaExecution['status'],
    error: row.error || undefined,
    executedAt: row.executed_at,
    createdAt: row.created_at,
  };
}

// Plan Operations
export function createPlan(data: Omit<DcaPlan, 'id' | 'createdAt' | 'updatedAt'>): DcaPlan {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO dca_plans (
      id, user_wallet, dca_pubkey, input_mint, output_mint, input_mint_symbol, output_mint_symbol,
      total_input_amount, input_amount_per_cycle, cycle_frequency_seconds, min_output_per_cycle,
      max_output_per_cycle, cycles_completed, total_cycles, total_output_received, avg_price,
      status, next_cycle_at, started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.userWallet,
    data.dcaPubkey || null,
    data.inputMint,
    data.outputMint,
    data.inputMintSymbol || null,
    data.outputMintSymbol || null,
    data.totalInputAmount,
    data.inputAmountPerCycle,
    data.cycleFrequencySeconds,
    data.minOutputPerCycle || null,
    data.maxOutputPerCycle || null,
    data.cyclesCompleted || 0,
    data.totalCycles || null,
    data.totalOutputReceived || 0,
    data.avgPrice || null,
    data.status,
    data.nextCycleAt || null,
    data.startedAt,
    data.completedAt || null,
    now,
    now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getPlansByWallet(userWallet: string, filters?: { status?: string }): DcaPlan[] {
  const db = getDatabase();
  let query = 'SELECT * FROM dca_plans WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PlanRow[];
  return rows.map(rowToPlan);
}

export function getPlanById(id: string): DcaPlan | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM dca_plans WHERE id = ?');
  const row = stmt.get(id) as PlanRow | undefined;
  return row ? rowToPlan(row) : null;
}

export function getActivePlans(): DcaPlan[] {
  const db = getDatabase();
  const now = Date.now();
  const stmt = db.prepare(`
    SELECT * FROM dca_plans
    WHERE status = 'active' AND (next_cycle_at IS NULL OR next_cycle_at <= ?)
    ORDER BY next_cycle_at ASC
  `);
  const rows = stmt.all(now) as PlanRow[];
  return rows.map(rowToPlan);
}

export function updatePlan(id: string, updates: Partial<DcaPlan>): DcaPlan | null {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.dcaPubkey !== undefined) {
    fields.push('dca_pubkey = ?');
    params.push(updates.dcaPubkey);
  }
  if (updates.cyclesCompleted !== undefined) {
    fields.push('cycles_completed = ?');
    params.push(updates.cyclesCompleted);
  }
  if (updates.totalOutputReceived !== undefined) {
    fields.push('total_output_received = ?');
    params.push(updates.totalOutputReceived);
  }
  if (updates.avgPrice !== undefined) {
    fields.push('avg_price = ?');
    params.push(updates.avgPrice);
  }
  if (updates.status) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.nextCycleAt !== undefined) {
    fields.push('next_cycle_at = ?');
    params.push(updates.nextCycleAt);
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?');
    params.push(updates.completedAt);
  }

  if (fields.length === 0) return getPlanById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE dca_plans SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  return getPlanById(id);
}

export function pausePlan(id: string): DcaPlan | null {
  return updatePlan(id, { status: 'paused' });
}

export function resumePlan(id: string): DcaPlan | null {
  return updatePlan(id, { status: 'active', nextCycleAt: Date.now() });
}

export function cancelPlan(id: string): DcaPlan | null {
  return updatePlan(id, { status: 'cancelled', completedAt: Date.now() });
}

export function completePlan(id: string): DcaPlan | null {
  return updatePlan(id, { status: 'completed', completedAt: Date.now() });
}

// Execution Operations
export function createExecution(data: Omit<DcaExecution, 'id' | 'createdAt'>): DcaExecution {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO dca_executions (
      id, plan_id, cycle_number, input_amount, output_amount, price,
      tx_signature, status, error, executed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.planId,
    data.cycleNumber,
    data.inputAmount,
    data.outputAmount,
    data.price,
    data.txSignature || null,
    data.status,
    data.error || null,
    data.executedAt,
    now
  );

  return { id, ...data, createdAt: now };
}

export function getExecutionsByPlan(planId: string, limit = 50): DcaExecution[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM dca_executions WHERE plan_id = ? ORDER BY cycle_number DESC LIMIT ?');
  const rows = stmt.all(planId, limit) as ExecutionRow[];
  return rows.map(rowToExecution);
}

export function getExecutionById(id: string): DcaExecution | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM dca_executions WHERE id = ?');
  const row = stmt.get(id) as ExecutionRow | undefined;
  return row ? rowToExecution(row) : null;
}

export function updateExecutionStatus(id: string, status: DcaExecution['status'], txSignature?: string, error?: string): DcaExecution | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE dca_executions SET status = ?, tx_signature = ?, error = ? WHERE id = ?
  `);
  stmt.run(status, txSignature || null, error || null, id);

  return getExecutionById(id);
}

// Stats
export function getPlanStats(userWallet: string): {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalInputDeployed: number;
  totalOutputReceived: number;
  totalCyclesExecuted: number;
} {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(total_input_amount) as input_deployed,
      SUM(total_output_received) as output_received,
      SUM(cycles_completed) as cycles
    FROM dca_plans WHERE user_wallet = ?
  `);

  const row = stmt.get(userWallet) as {
    total: number;
    active: number;
    completed: number;
    input_deployed: number | null;
    output_received: number | null;
    cycles: number | null;
  };

  return {
    totalPlans: row.total,
    activePlans: row.active,
    completedPlans: row.completed,
    totalInputDeployed: row.input_deployed || 0,
    totalOutputReceived: row.output_received || 0,
    totalCyclesExecuted: row.cycles || 0,
  };
}
