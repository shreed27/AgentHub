import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from 'dotenv';
import pino from 'pino';

// Database
import { initializeDatabase, closeDatabase } from './db/index.js';
import { runAllSeeds } from './db/seed.js';

// Routes
import { agentsRouter } from './routes/agents.js';
import { executionRouter } from './routes/execution.js';
import { signalsRouter } from './routes/signals.js';
import { portfolioRouter } from './routes/portfolio.js';
import { marketRouter } from './routes/market.js';
import { healthRouter } from './routes/health.js';
import bountiesRouter from './routes/bounties.js';
import { integrationsRouter } from './routes/integrations.js';
import { limitOrdersRouter } from './routes/limitOrders.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { tradeLedgerRouter } from './routes/tradeLedger.js';
import { copyTradingRouter } from './routes/copyTrading.js';
import { automationRouter } from './routes/automation.js';
import { priceHistoryRouter } from './routes/priceHistory.js';
import { migrationsRouter } from './routes/migrations.js';

// New feature routes
import futuresRouter from './routes/futures.js';
import arbitrageRouter from './routes/arbitrage.js';
import backtestRouter from './routes/backtest.js';
import riskRouter from './routes/risk.js';
import swarmRouter from './routes/swarm.js';
import agentNetworkRouter from './routes/agentNetwork.js';
import skillsRouter from './routes/skills.js';
import survivalModeRouter from './routes/survivalMode.js';
import evmRouter from './routes/evm.js';

// Phase 1: Solana DEX integrations
import { raydiumRouter } from './routes/raydium.js';
import { orcaRouter } from './routes/orca.js';
import { meteoraRouter } from './routes/meteora.js';
import { driftRouter } from './routes/drift.js';
import { pumpfunRouter } from './routes/pumpfun.js';
import { dcaRouter } from './routes/dca.js';

// Phase 2: CEX Perpetuals
import { bybitRouter } from './routes/bybit.js';
import { hyperliquidRouter } from './routes/hyperliquid.js';
import { binanceFuturesRouter } from './routes/binanceFutures.js';

// Phase 3: Prediction Markets
import { polymarketRouter } from './routes/polymarket.js';
import { kalshiRouter } from './routes/kalshi.js';

// Phase 4: Advanced Trading Features
import { marketMakingRouter } from './routes/marketMaking.js';
import { botsRouter } from './routes/bots.js';
import { mlSignalsRouter } from './routes/mlSignals.js';
import { kellyRouter } from './routes/kelly.js';

// Phase 10-11: Infrastructure
import { channelsRouter } from './routes/channels.js';
import { memoryRouter } from './routes/memory.js';
import { acpRouter } from './routes/acp.js';
import { paymentsRouter } from './routes/payments.js';

// WebSocket
import { setupWebSocket } from './websocket/index.js';

// Services
import { ServiceRegistry } from './services/registry.js';
import { priceMonitor } from './services/priceMonitor.js';

// Middleware
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { optionalWalletMiddleware } from './middleware/walletAuth.js';

// Config
import { validateAndExit } from './config/validateEnv.js';

config();

// Validate environment variables on startup
validateAndExit();

// Initialize database
const db = initializeDatabase();

// Seed demo data if needed (for hackathon demos)
runAllSeeds();

const logger = pino({
  name: 'gateway',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  } : undefined,
});

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(optionalWalletMiddleware);

// Request logging with correlation ID
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
  }, 'Request');
  next();
});

// Initialize service registry
const serviceRegistry = new ServiceRegistry({
  cloddsbotUrl: process.env.CLODDSBOT_URL || 'http://localhost:18789',
  agentDexUrl: process.env.AGENT_DEX_URL || 'http://localhost:3001',
  opusXUrl: process.env.OPUS_X_URL || 'http://localhost:3000',
  openclawUrl: process.env.OPENCLAW_URL || 'http://localhost:3002',
  osintMarketUrl: process.env.OSINT_MARKET_URL || 'http://localhost:3003',
  clawdnetUrl: process.env.CLAWDNET_URL || 'http://localhost:3004',
});

// Make service registry and database available to routes
app.locals.serviceRegistry = serviceRegistry;
app.locals.logger = logger;
app.locals.db = db;

// API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/execution', executionRouter);
app.use('/api/v1/signals', signalsRouter);
app.use('/api/v1/portfolio', portfolioRouter);
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/bounties', bountiesRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/limit-orders', limitOrdersRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/trade-ledger', tradeLedgerRouter);
app.use('/api/v1/copy-trading', copyTradingRouter);
app.use('/api/v1/automation', automationRouter);
app.use('/api/v1/prices', priceHistoryRouter);
app.use('/api/v1/migrations', migrationsRouter);

// New feature routes
app.use('/api/v1/futures', futuresRouter);
app.use('/api/v1/arbitrage', arbitrageRouter);
app.use('/api/v1/backtest', backtestRouter);
app.use('/api/v1/risk', riskRouter);
app.use('/api/v1/swarm', swarmRouter);
app.use('/api/v1/agent-network', agentNetworkRouter);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/survival-mode', survivalModeRouter);
app.use('/api/v1/evm', evmRouter);

// Phase 1: Solana DEX integrations
app.use('/api/v1/raydium', raydiumRouter);
app.use('/api/v1/orca', orcaRouter);
app.use('/api/v1/meteora', meteoraRouter);
app.use('/api/v1/drift', driftRouter);
app.use('/api/v1/pumpfun', pumpfunRouter);
app.use('/api/v1/dca', dcaRouter);

// Phase 2: CEX Perpetuals
app.use('/api/v1/bybit', bybitRouter);
app.use('/api/v1/hyperliquid', hyperliquidRouter);
app.use('/api/v1/binance', binanceFuturesRouter);

// Phase 3: Prediction Markets
app.use('/api/v1/polymarket', polymarketRouter);
app.use('/api/v1/kalshi', kalshiRouter);

// Phase 4: Advanced Trading Features
app.use('/api/v1/market-making', marketMakingRouter);
app.use('/api/v1/bots', botsRouter);
app.use('/api/v1/ml-signals', mlSignalsRouter);
app.use('/api/v1/kelly', kellyRouter);

// Phase 10-11: Infrastructure
app.use('/api/v1/channels', channelsRouter);
app.use('/api/v1/memory', memoryRouter);
app.use('/api/v1/acp', acpRouter);
app.use('/api/v1/payments', paymentsRouter);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
  pingInterval: 10000,
  pingTimeout: 5000,
});

setupWebSocket(io, serviceRegistry, logger);
app.locals.io = io;

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
  }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    correlationId: req.correlationId,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
  });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

httpServer.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║     SUPER TRADING PLATFORM - UNIFIED API GATEWAY           ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  Mode: ${process.env.NODE_ENV || 'development'}                                    ║
╠════════════════════════════════════════════════════════════╣
║  Services:                                                 ║
║  • CloddsBot:    ${serviceRegistry.config.cloddsbotUrl.padEnd(35)}║
║  • AgentDEX:     ${serviceRegistry.config.agentDexUrl.padEnd(35)}║
║  • Opus-X:       ${serviceRegistry.config.opusXUrl.padEnd(35)}║
║  • OpenClaw:     ${serviceRegistry.config.openclawUrl.padEnd(35)}║
║  • OSINT Market: ${serviceRegistry.config.osintMarketUrl.padEnd(35)}║
║  • ClawdNet:     ${serviceRegistry.config.clawdnetUrl.padEnd(35)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Start the price monitor for limit order auto-execution
  priceMonitor.start(io, logger);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  priceMonitor.stop();
  httpServer.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  priceMonitor.stop();
  httpServer.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io, db };
