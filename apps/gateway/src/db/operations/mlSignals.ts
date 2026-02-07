/**
 * Database Operations for ML Signals and Models
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface MlModel {
  id: string;
  userWallet: string;
  name: string;
  modelType: string;
  symbol: string;
  features: string[];
  hyperparameters: Record<string, unknown>;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
  };
  status: 'training' | 'ready' | 'failed' | 'archived';
  trainedAt?: number;
  lastPrediction?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MlSignal {
  id: string;
  modelId: string;
  userWallet: string;
  symbol: string;
  signalType: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  features: Record<string, number>;
  metadata?: Record<string, unknown>;
  expiresAt?: number;
  createdAt: number;
}

interface ModelRow {
  id: string;
  user_wallet: string;
  name: string;
  model_type: string;
  symbol: string;
  features: string;
  hyperparameters: string;
  metrics: string;
  status: string;
  trained_at: number | null;
  last_prediction: number | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface SignalRow {
  id: string;
  model_id: string;
  user_wallet: string;
  symbol: string;
  signal_type: string;
  confidence: number;
  price: number;
  target_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  features: string;
  metadata: string | null;
  expires_at: number | null;
  created_at: number;
}

function rowToModel(row: ModelRow): MlModel {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    name: row.name,
    modelType: row.model_type,
    symbol: row.symbol,
    features: JSON.parse(row.features || '[]'),
    hyperparameters: JSON.parse(row.hyperparameters || '{}'),
    metrics: JSON.parse(row.metrics || '{}'),
    status: row.status as MlModel['status'],
    trainedAt: row.trained_at || undefined,
    lastPrediction: row.last_prediction || undefined,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSignal(row: SignalRow): MlSignal {
  return {
    id: row.id,
    modelId: row.model_id,
    userWallet: row.user_wallet,
    symbol: row.symbol,
    signalType: row.signal_type as 'buy' | 'sell' | 'hold',
    confidence: row.confidence,
    price: row.price,
    targetPrice: row.target_price || undefined,
    stopLoss: row.stop_loss || undefined,
    takeProfit: row.take_profit || undefined,
    features: JSON.parse(row.features || '{}'),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
  };
}

// Model Operations
export function createModel(data: Omit<MlModel, 'id' | 'createdAt' | 'updatedAt'>): MlModel {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO ml_models (
      id, user_wallet, name, model_type, symbol, features, hyperparameters, metrics,
      status, trained_at, last_prediction, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.name, data.modelType, data.symbol,
    JSON.stringify(data.features || []), JSON.stringify(data.hyperparameters || {}),
    JSON.stringify(data.metrics || {}), data.status || 'training',
    data.trainedAt || null, data.lastPrediction || null, data.error || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getModelsByWallet(userWallet: string, filters?: { status?: string; modelType?: string }): MlModel[] {
  const db = getDatabase();
  let query = 'SELECT * FROM ml_models WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.modelType) {
    query += ' AND model_type = ?';
    params.push(filters.modelType);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as ModelRow[];
  return rows.map(rowToModel);
}

export function getModelById(id: string): MlModel | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM ml_models WHERE id = ?');
  const row = stmt.get(id) as ModelRow | undefined;
  return row ? rowToModel(row) : null;
}

export function updateModel(id: string, updates: Partial<MlModel>): MlModel | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.features !== undefined) { fields.push('features = ?'); params.push(JSON.stringify(updates.features)); }
  if (updates.hyperparameters !== undefined) { fields.push('hyperparameters = ?'); params.push(JSON.stringify(updates.hyperparameters)); }
  if (updates.metrics !== undefined) { fields.push('metrics = ?'); params.push(JSON.stringify(updates.metrics)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.trainedAt !== undefined) { fields.push('trained_at = ?'); params.push(updates.trainedAt); }
  if (updates.lastPrediction !== undefined) { fields.push('last_prediction = ?'); params.push(updates.lastPrediction); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }

  if (fields.length === 0) return getModelById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE ml_models SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getModelById(id);
}

export function deleteModel(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM ml_models WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Signal Operations
export function createSignal(data: Omit<MlSignal, 'id' | 'createdAt'>): MlSignal {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO ml_signals (
      id, model_id, user_wallet, symbol, signal_type, confidence, price, target_price,
      stop_loss, take_profit, features, metadata, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.modelId, data.userWallet, data.symbol, data.signalType, data.confidence,
    data.price, data.targetPrice || null, data.stopLoss || null, data.takeProfit || null,
    JSON.stringify(data.features || {}), data.metadata ? JSON.stringify(data.metadata) : null,
    data.expiresAt || null, now
  );

  // Update model's last prediction time
  updateModel(data.modelId, { lastPrediction: now });

  return { id, ...data, createdAt: now };
}

export function getSignalsByWallet(userWallet: string, filters?: { symbol?: string; signalType?: string; limit?: number }): MlSignal[] {
  const db = getDatabase();
  let query = 'SELECT * FROM ml_signals WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.symbol) {
    query += ' AND symbol = ?';
    params.push(filters.symbol);
  }
  if (filters?.signalType) {
    query += ' AND signal_type = ?';
    params.push(filters.signalType);
  }

  query += ' ORDER BY created_at DESC';
  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as SignalRow[];
  return rows.map(rowToSignal);
}

export function getSignalsByModel(modelId: string, limit?: number): MlSignal[] {
  const db = getDatabase();
  let query = 'SELECT * FROM ml_signals WHERE model_id = ? ORDER BY created_at DESC';
  const params: unknown[] = [modelId];

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as SignalRow[];
  return rows.map(rowToSignal);
}

export function getLatestSignal(modelId: string): MlSignal | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM ml_signals WHERE model_id = ? ORDER BY created_at DESC LIMIT 1');
  const row = stmt.get(modelId) as SignalRow | undefined;
  return row ? rowToSignal(row) : null;
}

// Available Features
export function getAvailableFeatures(): { name: string; description: string; category: string }[] {
  return [
    // Price features
    { name: 'price', description: 'Current price', category: 'price' },
    { name: 'price_change_1h', description: '1-hour price change %', category: 'price' },
    { name: 'price_change_24h', description: '24-hour price change %', category: 'price' },
    { name: 'price_change_7d', description: '7-day price change %', category: 'price' },

    // Volume features
    { name: 'volume_24h', description: '24-hour trading volume', category: 'volume' },
    { name: 'volume_change', description: 'Volume change vs average', category: 'volume' },

    // Technical indicators
    { name: 'rsi_14', description: '14-period RSI', category: 'technical' },
    { name: 'macd', description: 'MACD line', category: 'technical' },
    { name: 'macd_signal', description: 'MACD signal line', category: 'technical' },
    { name: 'bb_upper', description: 'Bollinger Band upper', category: 'technical' },
    { name: 'bb_lower', description: 'Bollinger Band lower', category: 'technical' },
    { name: 'ema_20', description: '20-period EMA', category: 'technical' },
    { name: 'ema_50', description: '50-period EMA', category: 'technical' },
    { name: 'ema_200', description: '200-period EMA', category: 'technical' },
    { name: 'atr_14', description: '14-period ATR', category: 'technical' },

    // Market features
    { name: 'market_cap', description: 'Market capitalization', category: 'market' },
    { name: 'dominance', description: 'Market dominance %', category: 'market' },
    { name: 'fear_greed', description: 'Fear & Greed Index', category: 'sentiment' },

    // On-chain features
    { name: 'active_addresses', description: 'Active addresses', category: 'onchain' },
    { name: 'exchange_inflow', description: 'Exchange inflow', category: 'onchain' },
    { name: 'exchange_outflow', description: 'Exchange outflow', category: 'onchain' },
    { name: 'whale_transactions', description: 'Large transaction count', category: 'onchain' },
  ];
}

// Model Types
export function getModelTypes(): { type: string; name: string; description: string }[] {
  return [
    { type: 'lstm', name: 'LSTM', description: 'Long Short-Term Memory neural network for time series' },
    { type: 'transformer', name: 'Transformer', description: 'Attention-based model for sequence prediction' },
    { type: 'xgboost', name: 'XGBoost', description: 'Gradient boosted decision trees' },
    { type: 'random_forest', name: 'Random Forest', description: 'Ensemble of decision trees' },
    { type: 'svm', name: 'SVM', description: 'Support Vector Machine classifier' },
    { type: 'ensemble', name: 'Ensemble', description: 'Combination of multiple models' },
  ];
}

// Stats
export function getModelStats(userWallet: string): {
  totalModels: number;
  readyModels: number;
  totalSignals: number;
  avgAccuracy: number;
} {
  const db = getDatabase();

  const modelStmt = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
           AVG(json_extract(metrics, '$.accuracy')) as accuracy
    FROM ml_models WHERE user_wallet = ?
  `);
  const modelRow = modelStmt.get(userWallet) as { total: number; ready: number; accuracy: number | null };

  const signalStmt = db.prepare('SELECT COUNT(*) as count FROM ml_signals WHERE user_wallet = ?');
  const signalRow = signalStmt.get(userWallet) as { count: number };

  return {
    totalModels: modelRow.total,
    readyModels: modelRow.ready || 0,
    totalSignals: signalRow.count,
    avgAccuracy: modelRow.accuracy || 0,
  };
}
