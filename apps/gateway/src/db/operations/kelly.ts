/**
 * Database Operations for Kelly Criterion Position Sizing
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface KellyCalculation {
  id: string;
  userWallet: string;
  symbol: string;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  kellyFraction: number;
  halfKelly: number;
  quarterKelly: number;
  recommendedSize: number;
  bankroll: number;
  maxRisk: number;
  trades: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface CalculationRow {
  id: string;
  user_wallet: string;
  symbol: string;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  kelly_fraction: number;
  half_kelly: number;
  quarter_kelly: number;
  recommended_size: number;
  bankroll: number;
  max_risk: number;
  trades: number;
  metadata: string | null;
  created_at: number;
}

function rowToCalculation(row: CalculationRow): KellyCalculation {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    symbol: row.symbol,
    winRate: row.win_rate,
    avgWin: row.avg_win,
    avgLoss: row.avg_loss,
    kellyFraction: row.kelly_fraction,
    halfKelly: row.half_kelly,
    quarterKelly: row.quarter_kelly,
    recommendedSize: row.recommended_size,
    bankroll: row.bankroll,
    maxRisk: row.max_risk,
    trades: row.trades,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
  };
}

// Kelly Criterion Calculation Functions
export function calculateKelly(winRate: number, avgWin: number, avgLoss: number): number {
  // Kelly formula: f* = (bp - q) / b
  // where b = avgWin/avgLoss, p = winRate, q = 1 - winRate
  if (avgLoss === 0) return 0;

  const b = avgWin / avgLoss;
  const p = winRate;
  const q = 1 - winRate;

  const kelly = (b * p - q) / b;

  // Cap kelly at 0-1 range
  return Math.max(0, Math.min(1, kelly));
}

export function calculateDynamicKelly(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  confidenceLevel: number = 0.5
): {
  fullKelly: number;
  halfKelly: number;
  quarterKelly: number;
  recommendedFraction: number;
} {
  const fullKelly = calculateKelly(winRate, avgWin, avgLoss);

  // Adjust based on confidence level (0-1)
  const adjustedKelly = fullKelly * confidenceLevel;

  return {
    fullKelly,
    halfKelly: fullKelly * 0.5,
    quarterKelly: fullKelly * 0.25,
    recommendedFraction: adjustedKelly,
  };
}

// Store Kelly Calculation
export function storeCalculation(data: Omit<KellyCalculation, 'id' | 'createdAt'>): KellyCalculation {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO kelly_calculations (
      id, user_wallet, symbol, win_rate, avg_win, avg_loss, kelly_fraction,
      half_kelly, quarter_kelly, recommended_size, bankroll, max_risk, trades, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.symbol, data.winRate, data.avgWin, data.avgLoss,
    data.kellyFraction, data.halfKelly, data.quarterKelly, data.recommendedSize,
    data.bankroll, data.maxRisk, data.trades, data.metadata ? JSON.stringify(data.metadata) : null, now
  );

  return { id, ...data, createdAt: now };
}

export function getCalculationsByWallet(userWallet: string, filters?: { symbol?: string; limit?: number }): KellyCalculation[] {
  const db = getDatabase();
  let query = 'SELECT * FROM kelly_calculations WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.symbol) {
    query += ' AND symbol = ?';
    params.push(filters.symbol);
  }

  query += ' ORDER BY created_at DESC';
  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as CalculationRow[];
  return rows.map(rowToCalculation);
}

export function getLatestCalculation(userWallet: string, symbol: string): KellyCalculation | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM kelly_calculations
    WHERE user_wallet = ? AND symbol = ?
    ORDER BY created_at DESC LIMIT 1
  `);
  const row = stmt.get(userWallet, symbol) as CalculationRow | undefined;
  return row ? rowToCalculation(row) : null;
}

// Calculate Kelly from Trade History
export function calculateFromTrades(
  trades: { pnl: number; side: 'buy' | 'sell' }[],
  bankroll: number,
  maxRisk: number = 0.1
): {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  kellyFraction: number;
  halfKelly: number;
  quarterKelly: number;
  recommendedSize: number;
} {
  if (trades.length < 10) {
    // Not enough data for reliable Kelly calculation
    return {
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      kellyFraction: 0,
      halfKelly: 0,
      quarterKelly: 0,
      recommendedSize: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const winRate = wins.length / trades.length;
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0)) / losses.length : 0;

  const kelly = calculateKelly(winRate, avgWin, avgLoss);
  const halfKelly = kelly * 0.5;
  const quarterKelly = kelly * 0.25;

  // Use half Kelly as recommended (more conservative)
  // Cap at max risk
  const recommendedFraction = Math.min(halfKelly, maxRisk);
  const recommendedSize = bankroll * recommendedFraction;

  return {
    winRate,
    avgWin,
    avgLoss,
    kellyFraction: kelly,
    halfKelly,
    quarterKelly,
    recommendedSize,
  };
}

// Monte Carlo Kelly Simulation
export function monteCarloKelly(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  bankroll: number,
  kellyFraction: number,
  numSimulations: number = 1000,
  numTrades: number = 100
): {
  avgFinalBankroll: number;
  medianFinalBankroll: number;
  worstCase: number;
  bestCase: number;
  bustProbability: number;
  profitProbability: number;
} {
  const finalBankrolls: number[] = [];
  let bustCount = 0;
  let profitCount = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    let currentBankroll = bankroll;

    for (let trade = 0; trade < numTrades; trade++) {
      const positionSize = currentBankroll * kellyFraction;

      // Simulate win or loss
      if (Math.random() < winRate) {
        currentBankroll += positionSize * (avgWin / positionSize);
      } else {
        currentBankroll -= positionSize * (avgLoss / positionSize);
      }

      // Check for bust
      if (currentBankroll <= 0) {
        bustCount++;
        currentBankroll = 0;
        break;
      }
    }

    finalBankrolls.push(currentBankroll);
    if (currentBankroll > bankroll) profitCount++;
  }

  finalBankrolls.sort((a, b) => a - b);

  return {
    avgFinalBankroll: finalBankrolls.reduce((a, b) => a + b, 0) / numSimulations,
    medianFinalBankroll: finalBankrolls[Math.floor(numSimulations / 2)],
    worstCase: finalBankrolls[Math.floor(numSimulations * 0.05)], // 5th percentile
    bestCase: finalBankrolls[Math.floor(numSimulations * 0.95)], // 95th percentile
    bustProbability: bustCount / numSimulations,
    profitProbability: profitCount / numSimulations,
  };
}

// Get historical Kelly calculations for a wallet
export function getKellyHistory(userWallet: string, symbol?: string): {
  calculations: KellyCalculation[];
  avgKelly: number;
  avgRecommendedSize: number;
  totalCalculations: number;
} {
  const calculations = getCalculationsByWallet(userWallet, { symbol, limit: 100 });

  if (calculations.length === 0) {
    return {
      calculations: [],
      avgKelly: 0,
      avgRecommendedSize: 0,
      totalCalculations: 0,
    };
  }

  const avgKelly = calculations.reduce((sum, c) => sum + c.kellyFraction, 0) / calculations.length;
  const avgRecommendedSize = calculations.reduce((sum, c) => sum + c.recommendedSize, 0) / calculations.length;

  return {
    calculations,
    avgKelly,
    avgRecommendedSize,
    totalCalculations: calculations.length,
  };
}
