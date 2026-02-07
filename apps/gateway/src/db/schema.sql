-- Super Trading Platform Gateway Database Schema
-- SQLite with WAL mode for better concurrency

-- Agents table - stores agent configurations and performance metrics
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'trading', 'research', 'alerts')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'error')),
  strategy_id TEXT,
  wallet_address TEXT,
  config TEXT NOT NULL, -- JSON blob for AgentConfig
  performance TEXT NOT NULL, -- JSON blob for AgentPerformance
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- Bounties table - bounty records with escrow information
CREATE TABLE IF NOT EXISTS bounties (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  reward_amount REAL NOT NULL,
  reward_token TEXT NOT NULL CHECK (reward_token IN ('SOL', 'USDC')),
  poster_wallet TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'submitted', 'completed', 'expired', 'cancelled')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  deadline TEXT NOT NULL,
  escrow_tx TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_poster ON bounties(poster_wallet);
CREATE INDEX IF NOT EXISTS idx_bounties_difficulty ON bounties(difficulty);

-- Bounty claims - active claims on bounties
CREATE TABLE IF NOT EXISTS bounty_claims (
  id TEXT PRIMARY KEY,
  bounty_id TEXT NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  hunter_wallet TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE(bounty_id, hunter_wallet)
);

CREATE INDEX IF NOT EXISTS idx_claims_bounty ON bounty_claims(bounty_id);
CREATE INDEX IF NOT EXISTS idx_claims_hunter ON bounty_claims(hunter_wallet);

-- Bounty submissions - submitted solutions
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id TEXT PRIMARY KEY,
  bounty_id TEXT NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  hunter_wallet TEXT NOT NULL,
  solution TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 80,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_bounty ON bounty_submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON bounty_submissions(status);

-- Signals table - signal history with TTL support
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('osint', 'whale', 'ai', 'arbitrage', 'social', 'onchain', 'god_wallet')),
  type TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob
  confidence REAL NOT NULL DEFAULT 50,
  timestamp INTEGER NOT NULL,
  expires_at INTEGER,
  metadata TEXT -- JSON blob
);

CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_expires ON signals(expires_at) WHERE expires_at IS NOT NULL;

-- Positions table - open trading positions
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  token TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('solana', 'base', 'ethereum', 'arbitrum', 'polygon')),
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  amount REAL NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL NOT NULL,
  unrealized_pnl REAL NOT NULL DEFAULT 0,
  unrealized_pnl_percent REAL NOT NULL DEFAULT 0,
  stop_loss REAL,
  take_profit REAL,
  take_profit_levels TEXT, -- JSON array
  opened_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_positions_agent ON positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_positions_token ON positions(token);
CREATE INDEX IF NOT EXISTS idx_positions_chain ON positions(chain);

-- Trade intents - execution intents
CREATE TABLE IF NOT EXISTS trade_intents (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  strategy_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'close')),
  market_type TEXT NOT NULL CHECK (market_type IN ('dex', 'prediction_market', 'futures')),
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  constraints TEXT, -- JSON blob for TradeConstraints
  signal_ids TEXT, -- JSON array
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'routing', 'executing', 'completed', 'failed', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intents_agent ON trade_intents(agent_id);
CREATE INDEX IF NOT EXISTS idx_intents_status ON trade_intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_created ON trade_intents(created_at DESC);

-- Execution results - trade history
CREATE TABLE IF NOT EXISTS execution_results (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  tx_hash TEXT,
  order_id TEXT,
  executed_amount REAL NOT NULL,
  executed_price REAL NOT NULL,
  fees REAL NOT NULL DEFAULT 0,
  slippage REAL NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  route TEXT NOT NULL, -- JSON blob for ExecutionRoute
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_results_intent ON execution_results(intent_id);
CREATE INDEX IF NOT EXISTS idx_results_success ON execution_results(success);
CREATE INDEX IF NOT EXISTS idx_results_created ON execution_results(created_at DESC);

-- Escrow transactions - for bounty escrow tracking
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id TEXT PRIMARY KEY,
  bounty_id TEXT REFERENCES bounties(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'payout', 'refund')),
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  amount REAL NOT NULL,
  token TEXT NOT NULL,
  fee_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_escrow_bounty ON escrow_transactions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_escrow_type ON escrow_transactions(type);

-- User integrations table - stores connected platforms and credentials
CREATE TABLE IF NOT EXISTS user_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('messaging', 'exchange', 'prediction')),
  credentials_encrypted TEXT,
  config TEXT, -- JSON blob for platform-specific settings
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_connected_at INTEGER,
  last_error TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON user_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON user_integrations(status);

-- Integration notification settings - per-platform notification preferences
CREATE TABLE IF NOT EXISTS integration_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('trade_executed', 'signal_received', 'whale_alert', 'price_alert', 'agent_status', 'bounty_update')),
  enabled INTEGER DEFAULT 1,
  config TEXT, -- JSON blob for event-specific settings (e.g., quiet hours)
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE(user_id, platform, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON integration_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_platform ON integration_notifications(platform);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON integration_notifications(event_type);

-- ==================== New Feature Tables ====================

-- Limit Orders table - for automated order execution
CREATE TABLE IF NOT EXISTS limit_orders (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  wallet_address TEXT NOT NULL,
  input_mint TEXT NOT NULL,
  output_mint TEXT NOT NULL,
  input_amount REAL NOT NULL,
  target_price REAL NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'executed', 'cancelled', 'expired')),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  triggered_at INTEGER,
  executed_at INTEGER,
  tx_signature TEXT,
  slippage_bps INTEGER DEFAULT 100
);

CREATE INDEX IF NOT EXISTS idx_limit_orders_wallet ON limit_orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_limit_orders_status ON limit_orders(status);
CREATE INDEX IF NOT EXISTS idx_limit_orders_expires ON limit_orders(expires_at) WHERE expires_at IS NOT NULL;

-- Hunter Reputation table - track hunter performance and achievements
CREATE TABLE IF NOT EXISTS hunter_reputation (
  wallet_address TEXT PRIMARY KEY,
  rank TEXT NOT NULL DEFAULT 'Novice' CHECK (rank IN ('Novice', 'Apprentice', 'Investigator', 'Detective', 'Expert', 'Master', 'Legend')),
  total_earnings REAL NOT NULL DEFAULT 0,
  bounties_completed INTEGER NOT NULL DEFAULT 0,
  bounties_attempted INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  avg_completion_time_hours REAL,
  specializations TEXT DEFAULT '[]', -- JSON array of tags
  badges TEXT DEFAULT '[]', -- JSON array of badge objects
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  reputation_score REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hunter_reputation_rank ON hunter_reputation(rank);
CREATE INDEX IF NOT EXISTS idx_hunter_reputation_score ON hunter_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_hunter_reputation_earnings ON hunter_reputation(total_earnings DESC);

-- Trade Ledger table - immutable decision audit trail
CREATE TABLE IF NOT EXISTS trade_ledger (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'close', 'open_position', 'close_position', 'adjust_sl', 'adjust_tp')),
  token TEXT NOT NULL,
  token_symbol TEXT,
  chain TEXT NOT NULL,
  amount REAL NOT NULL,
  price REAL NOT NULL,
  decision_source TEXT NOT NULL CHECK (decision_source IN ('manual', 'ai', 'signal', 'copy_trade', 'automation', 'limit_order')),
  reasoning TEXT, -- AI reasoning or decision rationale
  confidence REAL, -- 0-100
  signal_ids TEXT, -- JSON array of contributing signal IDs
  position_id TEXT,
  tx_signature TEXT,
  fees REAL DEFAULT 0,
  slippage REAL DEFAULT 0,
  pnl REAL, -- realized PnL if closing
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON trade_ledger(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ledger_agent ON trade_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_ledger_token ON trade_ledger(token);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON trade_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_source ON trade_ledger(decision_source);

-- Copy Trading Configurations table
CREATE TABLE IF NOT EXISTS copy_trading_configs (
  id TEXT PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  target_wallet TEXT NOT NULL,
  target_label TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  allocation_percent REAL NOT NULL DEFAULT 10, -- percentage of portfolio to allocate
  max_position_size REAL, -- max USD per trade
  min_position_size REAL DEFAULT 10, -- min USD per trade
  follow_sells INTEGER DEFAULT 1,
  follow_buys INTEGER DEFAULT 1,
  delay_seconds INTEGER DEFAULT 0, -- delay before copying
  stop_loss_percent REAL, -- auto SL
  take_profit_percent REAL, -- auto TP
  max_daily_trades INTEGER DEFAULT 20,
  trades_today INTEGER DEFAULT 0,
  last_trade_at INTEGER,
  total_trades INTEGER DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_wallet, target_wallet)
);

CREATE INDEX IF NOT EXISTS idx_copy_trading_user ON copy_trading_configs(user_wallet);
CREATE INDEX IF NOT EXISTS idx_copy_trading_target ON copy_trading_configs(target_wallet);
CREATE INDEX IF NOT EXISTS idx_copy_trading_enabled ON copy_trading_configs(enabled);

-- Copy Trading History table
CREATE TABLE IF NOT EXISTS copy_trading_history (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES copy_trading_configs(id),
  original_tx TEXT NOT NULL,
  copied_tx TEXT,
  target_wallet TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  token TEXT NOT NULL,
  original_amount REAL NOT NULL,
  copied_amount REAL,
  original_price REAL NOT NULL,
  copied_price REAL,
  slippage REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
  skip_reason TEXT,
  pnl REAL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_copy_history_config ON copy_trading_history(config_id);
CREATE INDEX IF NOT EXISTS idx_copy_history_status ON copy_trading_history(status);

-- Automation Rules table (Cron-like scheduling)
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('scheduled', 'price_trigger', 'condition', 'recurring')),
  trigger_config TEXT NOT NULL, -- JSON: cron expression, price conditions, etc.
  action_config TEXT NOT NULL, -- JSON: what to do when triggered
  enabled INTEGER NOT NULL DEFAULT 1,
  last_triggered_at INTEGER,
  next_trigger_at INTEGER,
  trigger_count INTEGER DEFAULT 0,
  max_triggers INTEGER, -- null = unlimited
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_user ON automation_rules(user_wallet);
CREATE INDEX IF NOT EXISTS idx_automation_enabled ON automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_type ON automation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_automation_next ON automation_rules(next_trigger_at) WHERE enabled = 1;

-- Automation History table
CREATE TABLE IF NOT EXISTS automation_history (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES automation_rules(id),
  triggered_at INTEGER NOT NULL,
  trigger_reason TEXT,
  action_taken TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'skipped')),
  result_data TEXT, -- JSON: execution details
  error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_history_rule ON automation_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_history_triggered ON automation_history(triggered_at DESC);

-- Price History table (OHLCV data)
CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  token_mint TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('1m', '5m', '15m', '1h', '4h', '1d')),
  timestamp INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL DEFAULT 0,
  UNIQUE(token_mint, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_token ON price_history(token_mint);
CREATE INDEX IF NOT EXISTS idx_price_history_interval ON price_history(interval);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);

-- Migration Detection table
CREATE TABLE IF NOT EXISTS token_migrations (
  id TEXT PRIMARY KEY,
  old_mint TEXT NOT NULL,
  new_mint TEXT NOT NULL,
  old_symbol TEXT,
  new_symbol TEXT,
  migration_type TEXT NOT NULL CHECK (migration_type IN ('pump_to_raydium', 'bonding_curve', 'upgrade', 'rebrand', 'other')),
  detected_at INTEGER NOT NULL,
  ranking_score REAL DEFAULT 0,
  god_wallet_count INTEGER DEFAULT 0,
  volume_24h REAL DEFAULT 0,
  market_cap REAL DEFAULT 0,
  metadata TEXT, -- JSON for additional data
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_migrations_detected ON token_migrations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_ranking ON token_migrations(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_old_mint ON token_migrations(old_mint);
CREATE INDEX IF NOT EXISTS idx_migrations_new_mint ON token_migrations(new_mint);
