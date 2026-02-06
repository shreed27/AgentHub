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
