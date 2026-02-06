import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ServiceRegistry } from '../services/registry.js';
import type { Agent, AgentConfig, AgentStatus } from '../types.js';

export const agentsRouter = Router();

// In-memory agent store (would be backed by orchestrator in production)
const agents: Map<string, Agent> = new Map();

// GET /api/v1/agents - List all agents
agentsRouter.get('/', (req: Request, res: Response) => {
  const agentList = Array.from(agents.values());
  res.json({
    success: true,
    data: agentList,
    count: agentList.length,
  });
});

// GET /api/v1/agents/:id - Get agent by ID
agentsRouter.get('/:id', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }
  res.json({
    success: true,
    data: agent,
  });
});

// POST /api/v1/agents - Create new agent
agentsRouter.post('/', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { name, type, strategyId, walletAddress, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    const agentConfig: AgentConfig = {
      maxPositionSize: config?.maxPositionSize ?? 1000,
      maxDailyLoss: config?.maxDailyLoss ?? 100,
      maxOpenPositions: config?.maxOpenPositions ?? 5,
      allowedMarkets: config?.allowedMarkets ?? ['dex'],
      allowedChains: config?.allowedChains ?? ['solana'],
      riskLevel: config?.riskLevel ?? 'moderate',
      autoExecute: config?.autoExecute ?? false,
    };

    const agent: Agent = {
      id: uuidv4(),
      name,
      type,
      status: 'active',
      strategyId,
      walletAddress,
      config: agentConfig,
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        dailyPnL: 0,
        avgTradeSize: 0,
        avgHoldTime: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    agents.set(agent.id, agent);
    logger.info({ agentId: agent.id, name: agent.name }, 'Agent created');

    // Emit WebSocket event
    const io = req.app.locals.io;
    io?.emit('agent_status_changed', {
      type: 'agent_status_changed',
      timestamp: Date.now(),
      data: { agent, action: 'created' },
    });

    res.status(201).json({
      success: true,
      data: agent,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create agent');
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
    });
  }
});

// PUT /api/v1/agents/:id/status - Update agent status
agentsRouter.put('/:id/status', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  const { status } = req.body;
  const validStatuses: AgentStatus[] = ['active', 'paused', 'stopped', 'error'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  agent.status = status;
  agent.updatedAt = Date.now();
  agents.set(agent.id, agent);

  logger.info({ agentId: agent.id, status }, 'Agent status updated');

  // Emit WebSocket event
  const io = req.app.locals.io;
  io?.emit('agent_status_changed', {
    type: 'agent_status_changed',
    timestamp: Date.now(),
    data: { agent, action: 'status_changed' },
  });

  res.json({
    success: true,
    data: agent,
  });
});

// PUT /api/v1/agents/:id/kill - Emergency kill switch
agentsRouter.put('/:id/kill', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  // Set to stopped
  agent.status = 'stopped';
  agent.updatedAt = Date.now();
  agents.set(agent.id, agent);

  logger.warn({ agentId: agent.id }, 'Agent killed via emergency switch');

  // Emit WebSocket event
  const io = req.app.locals.io;
  io?.emit('agent_status_changed', {
    type: 'agent_status_changed',
    timestamp: Date.now(),
    data: { agent, action: 'killed' },
  });

  res.json({
    success: true,
    message: 'Agent killed',
    data: agent,
  });
});

// DELETE /api/v1/agents/:id - Delete agent
agentsRouter.delete('/:id', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  agents.delete(req.params.id);
  logger.info({ agentId: req.params.id }, 'Agent deleted');

  // Emit WebSocket event
  const io = req.app.locals.io;
  io?.emit('agent_status_changed', {
    type: 'agent_status_changed',
    timestamp: Date.now(),
    data: { agentId: req.params.id, action: 'deleted' },
  });

  res.json({
    success: true,
    message: 'Agent deleted',
  });
});

// GET /api/v1/agents/:id/performance - Get agent performance
agentsRouter.get('/:id/performance', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  res.json({
    success: true,
    data: agent.performance,
  });
});
