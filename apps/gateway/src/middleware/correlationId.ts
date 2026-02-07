import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID middleware for request tracing
 * Adds a unique correlation ID to each request for distributed tracing
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // Attach to request for use in handlers
  req.correlationId = correlationId;

  // Set response header for client tracing
  res.setHeader('x-correlation-id', correlationId);

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
