import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from 'dotenv';
import pino from 'pino';

// Database
import { initializeDatabase, closeDatabase } from './db/index.js';

// Routes
import { agentsRouter } from './routes/agents.js';
import { executionRouter } from './routes/execution.js';
import { signalsRouter } from './routes/signals.js';
import { portfolioRouter } from './routes/portfolio.js';
import { marketRouter } from './routes/market.js';
import { healthRouter } from './routes/health.js';
import bountiesRouter from './routes/bounties.js';
import { integrationsRouter } from './routes/integrations.js';

// WebSocket
import { setupWebSocket } from './websocket/index.js';

// Services
import { ServiceRegistry } from './services/registry.js';

config();

// Initialize database
const db = initializeDatabase();

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
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

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request');
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
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io, db };
