/**
 * Agent Control Protocol (ACP) Routes
 */

import { Router, Request, Response } from 'express';
import * as acpOps from '../db/operations/acp.js';

export const acpRouter = Router();

// ========== Agent Operations ==========

// POST /api/v1/acp/agents/register - Register agent
acpRouter.post('/agents/register', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, name, agentType, capabilities, endpoint, metadata } = req.body;

    if (!userWallet || !name || !agentType) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, name, agentType' });
    }

    const agent = acpOps.registerAgent({
      userWallet,
      name,
      agentType,
      capabilities: capabilities || [],
      status: 'online',
      endpoint,
      metadata,
      lastHeartbeat: Date.now(),
    });

    logger.info({ agentId: agent.id, name, agentType }, 'Agent registered');
    io?.emit('acp_agent_registered', { type: 'acp_agent_registered', timestamp: Date.now(), data: agent });

    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    logger.error({ error }, 'Failed to register agent');
    res.status(500).json({ success: false, error: 'Failed to register agent' });
  }
});

// GET /api/v1/acp/agents - List agents
acpRouter.get('/agents', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, agentType } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const agents = acpOps.getAgents(wallet as string, {
      status: status as string | undefined,
      agentType: agentType as string | undefined,
    });

    res.json({ success: true, data: agents, count: agents.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get agents');
    res.status(500).json({ success: false, error: 'Failed to get agents' });
  }
});

// GET /api/v1/acp/agents/:id - Get agent
acpRouter.get('/agents/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const agent = acpOps.getAgentById(id);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    logger.error({ error }, 'Failed to get agent');
    res.status(500).json({ success: false, error: 'Failed to get agent' });
  }
});

// POST /api/v1/acp/agents/:id/heartbeat - Agent heartbeat
acpRouter.post('/agents/:id/heartbeat', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;

    const agent = acpOps.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const updated = acpOps.heartbeat(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to process heartbeat');
    res.status(500).json({ success: false, error: 'Failed to process heartbeat' });
  }
});

// DELETE /api/v1/acp/agents/:id - Unregister agent
acpRouter.delete('/agents/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const agent = acpOps.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    acpOps.unregisterAgent(id);
    logger.info({ agentId: id }, 'Agent unregistered');

    io?.emit('acp_agent_unregistered', { type: 'acp_agent_unregistered', timestamp: Date.now(), agentId: id });

    res.json({ success: true, message: 'Agent unregistered' });
  } catch (error) {
    logger.error({ error }, 'Failed to unregister agent');
    res.status(500).json({ success: false, error: 'Failed to unregister agent' });
  }
});

// ========== Task Operations ==========

// POST /api/v1/acp/tasks/enqueue - Add task
acpRouter.post('/tasks/enqueue', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, agentId, taskType, priority, payload } = req.body;

    if (!userWallet || !taskType || !payload) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, taskType, payload' });
    }

    const task = acpOps.enqueueTask({
      userWallet,
      agentId,
      taskType,
      priority: priority || 'medium',
      payload,
      status: 'pending',
    });

    logger.info({ taskId: task.id, taskType, priority }, 'Task enqueued');
    io?.emit('acp_task_enqueued', { type: 'acp_task_enqueued', timestamp: Date.now(), data: task });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    logger.error({ error }, 'Failed to enqueue task');
    res.status(500).json({ success: false, error: 'Failed to enqueue task' });
  }
});

// GET /api/v1/acp/tasks - List tasks
acpRouter.get('/tasks', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, agentId, priority } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const tasks = acpOps.getTasks(wallet as string, {
      status: status as string | undefined,
      agentId: agentId as string | undefined,
      priority: priority as string | undefined,
    });

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get tasks');
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
});

// GET /api/v1/acp/tasks/:id - Get task
acpRouter.get('/tasks/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const task = acpOps.getTaskById(id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    logger.error({ error }, 'Failed to get task');
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// POST /api/v1/acp/tasks/:id/assign - Assign task
acpRouter.post('/tasks/:id/assign', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, error: 'Missing required field: agentId' });
    }

    const task = acpOps.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const assigned = acpOps.assignTask(id, agentId);
    logger.info({ taskId: id, agentId }, 'Task assigned');

    io?.emit('acp_task_assigned', { type: 'acp_task_assigned', timestamp: Date.now(), data: assigned });

    res.json({ success: true, data: assigned });
  } catch (error) {
    logger.error({ error }, 'Failed to assign task');
    res.status(500).json({ success: false, error: 'Failed to assign task' });
  }
});

// POST /api/v1/acp/tasks/:id/start - Start task
acpRouter.post('/tasks/:id/start', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const task = acpOps.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const started = acpOps.startTask(id);
    logger.info({ taskId: id }, 'Task started');

    io?.emit('acp_task_started', { type: 'acp_task_started', timestamp: Date.now(), data: started });

    res.json({ success: true, data: started });
  } catch (error) {
    logger.error({ error }, 'Failed to start task');
    res.status(500).json({ success: false, error: 'Failed to start task' });
  }
});

// POST /api/v1/acp/tasks/:id/complete - Complete task
acpRouter.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;
    const { result } = req.body;

    const task = acpOps.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const completed = acpOps.completeTask(id, result || {});
    logger.info({ taskId: id }, 'Task completed');

    io?.emit('acp_task_completed', { type: 'acp_task_completed', timestamp: Date.now(), data: completed });

    res.json({ success: true, data: completed });
  } catch (error) {
    logger.error({ error }, 'Failed to complete task');
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
});

// POST /api/v1/acp/tasks/:id/fail - Fail task
acpRouter.post('/tasks/:id/fail', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;
    const { error: errorMsg } = req.body;

    const task = acpOps.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const failed = acpOps.failTask(id, errorMsg || 'Unknown error');
    logger.info({ taskId: id, error: errorMsg }, 'Task failed');

    io?.emit('acp_task_failed', { type: 'acp_task_failed', timestamp: Date.now(), data: failed });

    res.json({ success: true, data: failed });
  } catch (error) {
    logger.error({ error }, 'Failed to fail task');
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// ========== Message Operations ==========

// POST /api/v1/acp/messages/send - Send message
acpRouter.post('/messages/send', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, fromAgent, toAgent, messageType, topic, payload } = req.body;

    if (!userWallet || !messageType || !payload) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, messageType, payload' });
    }

    const message = acpOps.sendMessage({
      userWallet,
      fromAgent,
      toAgent,
      messageType,
      topic,
      payload,
    });

    logger.info({ messageId: message.id, messageType, topic }, 'ACP message sent');
    io?.emit('acp_message', { type: 'acp_message', timestamp: Date.now(), data: message });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error({ error }, 'Failed to send message');
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// POST /api/v1/acp/messages/broadcast - Broadcast message
acpRouter.post('/messages/broadcast', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, fromAgent, topic, payload } = req.body;

    if (!userWallet || !topic || !payload) {
      return res.status(400).json({ success: false, error: 'Missing required fields: userWallet, topic, payload' });
    }

    const message = acpOps.broadcast(userWallet, topic, payload, fromAgent);

    logger.info({ messageId: message.id, topic }, 'ACP broadcast sent');
    io?.emit('acp_broadcast', { type: 'acp_broadcast', timestamp: Date.now(), data: message });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error({ error }, 'Failed to broadcast message');
    res.status(500).json({ success: false, error: 'Failed to broadcast message' });
  }
});

// GET /api/v1/acp/messages - Get messages
acpRouter.get('/messages', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, fromAgent, toAgent, messageType, topic, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const messages = acpOps.getMessages(wallet as string, {
      fromAgent: fromAgent as string | undefined,
      toAgent: toAgent as string | undefined,
      messageType: messageType as string | undefined,
      topic: topic as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: messages, count: messages.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get messages');
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// GET /api/v1/acp/stats - ACP stats
acpRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = acpOps.getAcpStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get ACP stats');
    res.status(500).json({ success: false, error: 'Failed to get ACP stats' });
  }
});
