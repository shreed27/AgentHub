import { Request, Response, NextFunction } from 'express';
import { getAgentByApiKey, Agent } from '../db';

// Extend Express Request to include agent
declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}

/**
 * Middleware to authenticate requests using API key.
 * Expects: Authorization: Bearer adx_xxxxx
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
    });
    return;
  }

  const apiKey = authHeader.slice(7).trim();

  if (!apiKey.startsWith('adx_')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key format',
    });
    return;
  }

  const agent = getAgentByApiKey(apiKey);
  if (!agent) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  req.agent = agent;
  next();
}

/**
 * Optional auth — sets req.agent if valid key provided, but doesn't block.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7).trim();
    if (apiKey.startsWith('adx_')) {
      const agent = getAgentByApiKey(apiKey);
      if (agent) {
        req.agent = agent;
      }
    }
  }

  next();
}
