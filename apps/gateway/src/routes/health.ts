import { Router, Request, Response } from 'express';
import type { ServiceRegistry } from '../services/registry.js';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  const healthChecks = await serviceRegistry.checkAllHealth();
  const allHealthy = healthChecks.every(h => h.healthy);

  res.status(allHealthy ? 200 : 503).json({
    success: true,
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: healthChecks,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  res.json({ ready: true, timestamp: Date.now() });
});

healthRouter.get('/live', (req: Request, res: Response) => {
  res.json({ live: true, timestamp: Date.now() });
});
