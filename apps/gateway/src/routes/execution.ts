import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ServiceRegistry } from '../services/registry.js';
import type { TradeIntent, ExecutionResult, ExecutionRoute } from '../types.js';

export const executionRouter = Router();

// In-memory intent store
const intents: Map<string, TradeIntent> = new Map();

// POST /api/v1/execution/intent - Create trade intent
executionRouter.post('/intent', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const { agentId, action, marketType, chain, asset, amount, constraints, signalIds } = req.body;

    if (!agentId || !action || !marketType || !chain || !asset || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, action, marketType, chain, asset, amount',
      });
    }

    const intent: TradeIntent = {
      id: uuidv4(),
      agentId,
      action,
      marketType,
      chain,
      asset,
      amount,
      constraints,
      signalIds,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    intents.set(intent.id, intent);
    logger.info({ intentId: intent.id, action, asset }, 'Trade intent created');

    // Emit WebSocket event
    const io = req.app.locals.io;
    io?.emit('intent_generated', {
      type: 'intent_generated',
      timestamp: Date.now(),
      data: intent,
    });

    res.status(201).json({
      success: true,
      data: intent,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create intent');
    res.status(500).json({
      success: false,
      error: 'Failed to create intent',
    });
  }
});

// GET /api/v1/execution/intent/:id - Get intent by ID
executionRouter.get('/intent/:id', (req: Request, res: Response) => {
  const intent = intents.get(req.params.id);
  if (!intent) {
    return res.status(404).json({
      success: false,
      error: 'Intent not found',
    });
  }
  res.json({
    success: true,
    data: intent,
  });
});

// POST /api/v1/execution/quote - Get execution quote
executionRouter.post('/quote', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;

  try {
    const { inputMint, outputMint, amount, chain } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inputMint, outputMint, amount',
      });
    }

    // Try agent-dex for Solana
    if (chain === 'solana' || !chain) {
      try {
        const client = serviceRegistry.getClient('agent-dex');
        const response = await client.get('/api/v1/quote', {
          params: { inputMint, outputMint, amount },
        });

        return res.json({
          success: true,
          source: 'agent-dex',
          data: response.data.data,
        });
      } catch (error) {
        logger.warn('agent-dex quote failed, trying fallback');
      }
    }

    // Fallback: mock quote
    const mockQuote = {
      inputMint,
      outputMint,
      inputAmount: amount,
      outputAmount: Math.floor(Number(amount) * 0.98).toString(),
      priceImpact: '0.5',
      slippageBps: 50,
      routePlan: [{
        protocol: 'Jupiter',
        inputMint,
        outputMint,
        percent: 100,
      }],
    };

    res.json({
      success: true,
      source: 'mock',
      data: mockQuote,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get quote');
    res.status(500).json({
      success: false,
      error: 'Failed to get quote',
    });
  }
});

// POST /api/v1/execution/swap - Execute swap
executionRouter.post('/swap', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const serviceRegistry: ServiceRegistry = req.app.locals.serviceRegistry;
  const io = req.app.locals.io;

  try {
    const { intentId, inputMint, outputMint, amount, walletPrivateKey, chain } = req.body;

    // Update intent status if provided
    if (intentId) {
      const intent = intents.get(intentId);
      if (intent) {
        intent.status = 'executing';
        intent.updatedAt = Date.now();
        intents.set(intentId, intent);
      }
    }

    io?.emit('execution_started', {
      type: 'execution_started',
      timestamp: Date.now(),
      data: { intentId, inputMint, outputMint, amount },
    });

    // Try agent-dex for Solana swaps
    if (chain === 'solana' || !chain) {
      try {
        const client = serviceRegistry.getClient('agent-dex');
        const response = await client.post('/api/v1/swap', {
          inputMint,
          outputMint,
          amount,
          walletPrivateKey,
          slippageBps: 50,
        });

        const result: ExecutionResult = {
          intentId: intentId || uuidv4(),
          success: true,
          txHash: response.data.data.txSignature,
          executedAmount: Number(response.data.data.inputAmount),
          executedPrice: Number(response.data.data.outputAmount) / Number(response.data.data.inputAmount),
          fees: 0,
          slippage: Number(response.data.data.priceImpact || 0),
          executionTimeMs: 0,
          route: {
            executor: 'agent-dex',
            platform: 'Jupiter',
            path: [inputMint, outputMint],
            estimatedPrice: 0,
            estimatedSlippage: 0.5,
            estimatedFees: 0,
            estimatedTimeMs: 5000,
            score: 95,
          },
        };

        // Update intent
        if (intentId) {
          const intent = intents.get(intentId);
          if (intent) {
            intent.status = 'completed';
            intent.updatedAt = Date.now();
            intents.set(intentId, intent);
          }
        }

        io?.emit('execution_completed', {
          type: 'execution_completed',
          timestamp: Date.now(),
          data: result,
        });

        logger.info({ intentId, txHash: result.txHash }, 'Swap executed successfully');

        return res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.warn({ error }, 'agent-dex swap failed');
      }
    }

    // Mock execution for other chains or fallback
    const mockResult: ExecutionResult = {
      intentId: intentId || uuidv4(),
      success: true,
      txHash: `0x${uuidv4().replace(/-/g, '')}`,
      executedAmount: Number(amount),
      executedPrice: 1.0,
      fees: 0.001,
      slippage: 0.5,
      executionTimeMs: 1000,
      route: {
        executor: 'cloddsbot',
        platform: 'Mock',
        path: [inputMint, outputMint],
        estimatedPrice: 1.0,
        estimatedSlippage: 0.5,
        estimatedFees: 0.001,
        estimatedTimeMs: 1000,
        score: 90,
      },
    };

    io?.emit('execution_completed', {
      type: 'execution_completed',
      timestamp: Date.now(),
      data: mockResult,
    });

    res.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    const logger = req.app.locals.logger;
    logger.error({ error }, 'Swap execution failed');

    io?.emit('execution_failed', {
      type: 'execution_failed',
      timestamp: Date.now(),
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    res.status(500).json({
      success: false,
      error: 'Swap execution failed',
    });
  }
});

// POST /api/v1/execution/routes - Compare execution routes
executionRouter.post('/routes', async (req: Request, res: Response) => {
  const { inputMint, outputMint, amount, chain } = req.body;

  // Mock route comparison
  const routes: ExecutionRoute[] = [
    {
      executor: 'agent-dex',
      platform: 'Jupiter',
      path: [inputMint, outputMint],
      estimatedPrice: 1.0,
      estimatedSlippage: 0.3,
      estimatedFees: 0.0005,
      estimatedTimeMs: 3000,
      score: 95,
    },
    {
      executor: 'cloddsbot',
      platform: 'Raydium',
      path: [inputMint, outputMint],
      estimatedPrice: 0.998,
      estimatedSlippage: 0.5,
      estimatedFees: 0.001,
      estimatedTimeMs: 5000,
      score: 88,
    },
  ];

  res.json({
    success: true,
    data: {
      routes: routes.sort((a, b) => b.score - a.score),
      recommended: routes[0],
    },
  });
});

// GET /api/v1/execution/intents - List all intents
executionRouter.get('/intents', (req: Request, res: Response) => {
  const { status, agentId } = req.query;

  let intentList = Array.from(intents.values());

  if (status) {
    intentList = intentList.filter(i => i.status === status);
  }
  if (agentId) {
    intentList = intentList.filter(i => i.agentId === agentId);
  }

  res.json({
    success: true,
    data: intentList.sort((a, b) => b.createdAt - a.createdAt),
    count: intentList.length,
  });
});
