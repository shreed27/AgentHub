import express from 'express';
import cors from 'cors';
import { globalRateLimit } from './middleware/rateLimit';
import { optionalAuth } from './middleware/auth';
import quoteRoutes from './routes/quote';
import swapRoutes from './routes/swap';
import pricesRoutes from './routes/prices';
import portfolioRoutes from './routes/portfolio';
import limitOrderRoutes from './routes/limitOrders';
import agentRoutes from './routes/agents';
import systemRoutes from './routes/system';
import { startLimitOrderChecker } from './services/limitOrderChecker';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Global middleware
app.use(cors());
app.use(express.json());
app.use(globalRateLimit);
app.use(optionalAuth);

// API routes
app.use('/api/v1/quote', quoteRoutes);
app.use('/api/v1/swap', swapRoutes);
app.use('/api/v1/prices', pricesRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/limit-order', limitOrderRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1', systemRoutes);

// Root API info
app.get('/api', (_req, res) => {
  res.json({
    name: 'AgentDEX API',
    version: '1.0.0',
    description: 'The first DEX built for AI agents on Solana',
    docs: '/',
    endpoints: {
      quote: 'GET /api/v1/quote?inputMint=&outputMint=&amount=',
      swap: 'POST /api/v1/swap',
      prices: 'GET /api/v1/prices?mints=SOL,USDC',
      pricesSingle: 'GET /api/v1/prices/:mint',
      portfolio: 'GET /api/v1/portfolio/:wallet',
      history: 'GET /api/v1/portfolio/:wallet/history',
      limitOrder: 'POST /api/v1/limit-order',
      listOrders: 'GET /api/v1/limit-order',
      cancelOrder: 'DELETE /api/v1/limit-order/:id',
      register: 'POST /api/v1/agents/register',
      agentInfo: 'GET /api/v1/agents/me',
      health: 'GET /api/v1/health',
      trending: 'GET /api/v1/tokens/trending',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found. See /api for available endpoints.',
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🤖 AgentDEX API v1.0.0                 ║
  ║   Running on http://localhost:${PORT}       ║
  ║   Docs: http://localhost:${PORT}/api        ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  // Start limit order checker
  startLimitOrderChecker();
});

export default app;
