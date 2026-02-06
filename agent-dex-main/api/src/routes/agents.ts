import { Router, Request, Response } from 'express';
import { registerAgent, getAgentKeypair } from '../db';
import { authMiddleware } from '../middleware/auth';
import { registerRateLimit } from '../middleware/rateLimit';
import { connection } from '../services/jupiter';

const router = Router();

/**
 * POST /api/v1/agents/register
 * Register a new agent — creates a Solana keypair and returns an API key
 */
router.post('/register', registerRateLimit, async (req: Request, res: Response) => {
  try {
    const { name } = req.body || {};
    const { agent, keypair } = registerAgent(name);

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        apiKey: agent.api_key,
        wallet: {
          publicKey: agent.public_key,
        },
        name: agent.name,
        message: 'Store your API key securely — it cannot be retrieved later.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration Failed', message: err.message });
  }
});

/**
 * GET /api/v1/agents/me
 * Get authenticated agent info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = req.agent!;

    // Get SOL balance
    let solBalance = 0;
    try {
      const { PublicKey } = await import('@solana/web3.js');
      const lamports = await connection.getBalance(new PublicKey(agent.public_key));
      solBalance = lamports / 1e9;
    } catch {
      // Balance unavailable
    }

    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        wallet: agent.public_key,
        solBalance,
        tradeCount: agent.trade_count,
        createdAt: agent.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

export default router;
