/**
 * Agent Memory System Routes
 */

import { Router, Request, Response } from 'express';
import * as memoryOps from '../db/operations/memory.js';

export const memoryRouter = Router();

// POST /api/v1/memory/remember - Store memory
memoryRouter.post('/remember', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, agentId, key, memoryType, content, metadata, importance, expiresAt } = req.body;

    if (!userWallet || !key || !memoryType || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, key, memoryType, content' });
    }

    const validTypes = ['short_term', 'long_term', 'episodic', 'semantic', 'procedural'];
    if (!validTypes.includes(memoryType)) {
      return res.status(400).json({ success: false, error: 'Invalid memory type' });
    }

    const memory = memoryOps.remember({
      userWallet,
      agentId,
      key,
      memoryType,
      content,
      metadata,
      importance: importance !== undefined ? Number(importance) : 0.5,
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
    });

    logger.info({ memoryId: memory.id, key, memoryType }, 'Memory stored');

    res.status(201).json({ success: true, data: memory });
  } catch (error) {
    logger.error({ error }, 'Failed to store memory');
    res.status(500).json({ success: false, error: 'Failed to store memory' });
  }
});

// GET /api/v1/memory/recall/:key - Recall by key
memoryRouter.get('/recall/:key', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { key } = req.params;
    const { wallet, agentId } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const memory = memoryOps.recall(key, wallet as string, agentId as string | undefined);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    res.json({ success: true, data: memory });
  } catch (error) {
    logger.error({ error }, 'Failed to recall memory');
    res.status(500).json({ success: false, error: 'Failed to recall memory' });
  }
});

// GET /api/v1/memory/search - Search memories
memoryRouter.get('/search', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, agentId, memoryType, keyword, minImportance, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const memories = memoryOps.search(wallet as string, {
      agentId: agentId as string | undefined,
      memoryType: memoryType as string | undefined,
      keyword: keyword as string | undefined,
      minImportance: minImportance ? parseFloat(minImportance as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: memories, count: memories.length });
  } catch (error) {
    logger.error({ error }, 'Failed to search memories');
    res.status(500).json({ success: false, error: 'Failed to search memories' });
  }
});

// GET /api/v1/memory/type/:type - Get by type
memoryRouter.get('/type/:type', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { type } = req.params;
    const { wallet, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const validTypes = ['short_term', 'long_term', 'episodic', 'semantic', 'procedural'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid memory type' });
    }

    const memories = memoryOps.getByType(
      wallet as string,
      type as any,
      limit ? parseInt(limit as string, 10) : undefined
    );

    res.json({ success: true, data: memories, count: memories.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get memories by type');
    res.status(500).json({ success: false, error: 'Failed to get memories by type' });
  }
});

// PUT /api/v1/memory/:id - Update memory
memoryRouter.put('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const updates = req.body;

    const memory = memoryOps.getById(id);
    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const updated = memoryOps.update(id, updates);
    logger.info({ memoryId: id }, 'Memory updated');

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update memory');
    res.status(500).json({ success: false, error: 'Failed to update memory' });
  }
});

// DELETE /api/v1/memory/:id - Delete memory
memoryRouter.delete('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const memory = memoryOps.getById(id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    memoryOps.forget(id);
    logger.info({ memoryId: id }, 'Memory deleted');

    res.json({ success: true, message: 'Memory deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete memory');
    res.status(500).json({ success: false, error: 'Failed to delete memory' });
  }
});

// POST /api/v1/memory/consolidate - Consolidate memories
memoryRouter.post('/consolidate', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, agentId } = req.body;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: 'Missing required field: userWallet' });
    }

    const result = memoryOps.consolidate(userWallet, agentId);
    logger.info({ userWallet, ...result }, 'Memories consolidated');

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to consolidate memories');
    res.status(500).json({ success: false, error: 'Failed to consolidate memories' });
  }
});

// POST /api/v1/memory/cleanup - Clean up expired memories
memoryRouter.post('/cleanup', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const removed = memoryOps.cleanExpired();
    logger.info({ removed }, 'Expired memories cleaned up');

    res.json({ success: true, data: { removed } });
  } catch (error) {
    logger.error({ error }, 'Failed to clean up memories');
    res.status(500).json({ success: false, error: 'Failed to clean up memories' });
  }
});

// GET /api/v1/memory/stats - Memory stats
memoryRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, agentId } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = memoryOps.getMemoryStats(wallet as string, agentId as string | undefined);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get memory stats');
    res.status(500).json({ success: false, error: 'Failed to get memory stats' });
  }
});
