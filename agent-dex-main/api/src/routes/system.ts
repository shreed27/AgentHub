import { Router, Request, Response } from 'express';
import { getStats } from '../db';
import { getTrendingTokens } from '../services/jupiter';

const router = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  const stats = getStats();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      stats,
    },
  });
});

/**
 * GET /api/v1/tokens/trending
 * Get trending tokens
 */
router.get('/tokens/trending', async (_req: Request, res: Response) => {
  try {
    const tokens = await getTrendingTokens();
    res.json({
      success: true,
      data: {
        tokens,
        count: tokens.length,
      },
    });
  } catch (err: any) {
    res.status(502).json({ error: 'Failed', message: err.message });
  }
});

export default router;
