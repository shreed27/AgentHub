/**
 * Bounty System Routes
 *
 * Adapted from osint-market for Express gateway
 * Endpoints:
 * - POST /api/v1/bounties - Create bounty
 * - GET /api/v1/bounties - List bounties
 * - GET /api/v1/bounties/:id - Get bounty details
 * - POST /api/v1/bounties/:id/claim - Claim bounty
 * - POST /api/v1/bounties/:id/submit - Submit solution
 * - POST /api/v1/bounties/:id/resolve - Resolve submission
 */

import { Router, Request, Response } from 'express';
import { processDeposit, processPayout, processRefund, FEE_STRUCTURE } from '../services/escrow';
import { ESCROW_WALLET } from '../services/solana';

const router = Router();

// Supported tokens
const SUPPORTED_TOKENS = ['SOL', 'USDC'];

// In-memory storage (replace with database in production)
const bounties = new Map<string, Bounty>();
const claims = new Map<string, Claim>();
const submissions = new Map<string, Submission>();

// Types
export type BountyStatus = 'open' | 'claimed' | 'submitted' | 'completed' | 'expired' | 'cancelled';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Reward {
  amount: number;
  token: 'SOL' | 'USDC';
}

export interface Bounty {
  id: string;
  question: string;
  description?: string;
  reward: Reward;
  poster_wallet: string;
  status: BountyStatus;
  difficulty: Difficulty;
  tags: string[];
  deadline: string;
  escrow_tx?: string;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  bounty_id: string;
  hunter_wallet: string;
  claimed_at: string;
  expires_at: string;
}

export interface Submission {
  id: string;
  bounty_id: string;
  hunter_wallet: string;
  solution: string;
  confidence: number;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// Sanitize input to prevent XSS
function sanitize(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /api/v1/bounties - List bounties
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status = 'open', difficulty, tags, page = '1', per_page = '20' } = req.query;

    let filteredBounties = Array.from(bounties.values());

    // Filter by status
    if (status && status !== 'all') {
      filteredBounties = filteredBounties.filter(b => b.status === status);
    }

    // Filter by difficulty
    if (difficulty) {
      filteredBounties = filteredBounties.filter(b => b.difficulty === difficulty);
    }

    // Filter by tags
    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
      filteredBounties = filteredBounties.filter(b =>
        b.tags.some(t => tagList.includes(t.toLowerCase()))
      );
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const perPage = parseInt(per_page as string) || 20;
    const offset = (pageNum - 1) * perPage;

    const paginatedBounties = filteredBounties.slice(offset, offset + perPage);

    res.json({
      bounties: paginatedBounties,
      total: filteredBounties.length,
      page: pageNum,
      per_page: perPage,
    });
  } catch (error) {
    console.error('[Bounties] List error:', error);
    res.status(500).json({ error: 'Failed to list bounties' });
  }
});

/**
 * POST /api/v1/bounties - Create bounty
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { question, description, reward, difficulty, tags, deadline, escrow_tx, poster_wallet } = req.body;

    // Validate required fields
    if (!question || question.trim().length < 10) {
      return res.status(400).json({
        error: 'Question is required and must be at least 10 characters'
      });
    }

    if (!reward || !reward.amount || !reward.token) {
      return res.status(400).json({
        error: 'Reward is required with amount and token (e.g., {"amount": 0.5, "token": "SOL"})'
      });
    }

    // Validate token type
    if (!SUPPORTED_TOKENS.includes(reward.token)) {
      return res.status(400).json({
        error: `Unsupported token: ${reward.token}. Supported tokens: ${SUPPORTED_TOKENS.join(', ')}`
      });
    }

    // Validate minimum bounty (0.1 SOL)
    if (reward.token === 'SOL' && reward.amount < FEE_STRUCTURE.minimumSol) {
      return res.status(400).json({
        error: `Minimum bounty is ${FEE_STRUCTURE.minimumSol} SOL`
      });
    }

    // Get poster wallet from header or body
    const walletAddress = req.headers['x-wallet-address'] as string || poster_wallet;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Missing x-wallet-address header or poster_wallet in body'
      });
    }

    // Apply defaults
    const bountyDeadline = deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const bountyDifficulty = difficulty || 'medium';
    const now = new Date().toISOString();

    // Create bounty
    const bounty: Bounty = {
      id: generateId(),
      question: sanitize(question),
      description: description ? sanitize(description) : undefined,
      reward,
      poster_wallet: walletAddress,
      status: 'open',
      difficulty: bountyDifficulty,
      tags: (tags || []).map((t: string) => sanitize(t)),
      deadline: bountyDeadline,
      created_at: now,
      updated_at: now,
    };

    // If escrow_tx provided, verify the deposit
    if (escrow_tx) {
      const depositResult = await processDeposit(bounty.id, reward, walletAddress, escrow_tx);

      if (!depositResult.success) {
        return res.status(400).json({
          created: false,
          error: 'Deposit verification failed. Bounty was not created.',
          escrow_error: depositResult.error,
          deposit_instructions: {
            recipient: ESCROW_WALLET.toBase58(),
            amount: reward.amount,
            token: reward.token,
            fee: `${FEE_STRUCTURE.creation}% creation fee`,
            note: 'Please send the deposit first, then create the bounty with the transaction signature.',
          },
        });
      }

      bounty.escrow_tx = escrow_tx;
      bounties.set(bounty.id, bounty);

      return res.status(201).json({
        created: true,
        bounty_id: bounty.id,
        bounty,
        escrow_status: 'confirmed',
        escrow_tx,
        net_amount: depositResult.netAmount,
        fee_amount: depositResult.feeAmount,
      });
    }

    // No escrow_tx - save bounty and return deposit instructions
    bounties.set(bounty.id, bounty);

    res.status(201).json({
      created: true,
      bounty_id: bounty.id,
      bounty,
      escrow_status: 'pending',
      deposit_instructions: {
        recipient: ESCROW_WALLET.toBase58(),
        amount: reward.amount,
        token: reward.token,
        fee: `${FEE_STRUCTURE.creation}% creation fee (${reward.amount * FEE_STRUCTURE.creation / 100} ${reward.token})`,
        note: 'Send deposit to recipient address, then call PUT /api/v1/bounties/{id}/confirm with the transaction signature',
      },
    });
  } catch (error) {
    console.error('[Bounties] Create error:', error);
    res.status(500).json({ error: 'Failed to create bounty' });
  }
});

/**
 * GET /api/v1/bounties/:id - Get bounty details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bounty = bounties.get(id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // Get related claim and submission
    const claim = Array.from(claims.values()).find(c => c.bounty_id === id);
    const submission = Array.from(submissions.values()).find(s => s.bounty_id === id);

    res.json({
      bounty,
      claim: claim || null,
      submission: submission || null,
    });
  } catch (error) {
    console.error('[Bounties] Get error:', error);
    res.status(500).json({ error: 'Failed to get bounty' });
  }
});

/**
 * POST /api/v1/bounties/:id/claim - Claim bounty
 */
router.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bounty = bounties.get(id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'open') {
      return res.status(400).json({ error: `Bounty is ${bounty.status}, cannot be claimed` });
    }

    const hunterWallet = req.headers['x-wallet-address'] as string || req.body.hunter_wallet;

    if (!hunterWallet) {
      return res.status(400).json({ error: 'Missing x-wallet-address header or hunter_wallet in body' });
    }

    if (hunterWallet === bounty.poster_wallet) {
      return res.status(400).json({ error: 'Cannot claim your own bounty' });
    }

    // Create claim (expires in 24 hours)
    const now = new Date();
    const claim: Claim = {
      id: generateId(),
      bounty_id: id,
      hunter_wallet: hunterWallet,
      claimed_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };

    claims.set(claim.id, claim);

    // Update bounty status
    bounty.status = 'claimed';
    bounty.updated_at = now.toISOString();
    bounties.set(id, bounty);

    res.json({
      success: true,
      claim,
      message: 'Bounty claimed successfully. You have 24 hours to submit a solution.',
    });
  } catch (error) {
    console.error('[Bounties] Claim error:', error);
    res.status(500).json({ error: 'Failed to claim bounty' });
  }
});

/**
 * POST /api/v1/bounties/:id/submit - Submit solution
 */
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { solution, confidence } = req.body;
    const bounty = bounties.get(id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'claimed') {
      return res.status(400).json({ error: `Bounty is ${bounty.status}, cannot submit solution` });
    }

    const hunterWallet = req.headers['x-wallet-address'] as string || req.body.hunter_wallet;

    if (!hunterWallet) {
      return res.status(400).json({ error: 'Missing x-wallet-address header or hunter_wallet in body' });
    }

    // Verify claim exists and matches
    const claim = Array.from(claims.values()).find(
      c => c.bounty_id === id && c.hunter_wallet === hunterWallet
    );

    if (!claim) {
      return res.status(403).json({ error: 'You have not claimed this bounty' });
    }

    // Check claim expiry
    if (new Date(claim.expires_at) < new Date()) {
      bounty.status = 'open';
      bounty.updated_at = new Date().toISOString();
      bounties.set(id, bounty);
      return res.status(400).json({ error: 'Claim has expired. Bounty is open again.' });
    }

    if (!solution || solution.trim().length < 10) {
      return res.status(400).json({ error: 'Solution is required and must be at least 10 characters' });
    }

    // Create submission
    const submission: Submission = {
      id: generateId(),
      bounty_id: id,
      hunter_wallet: hunterWallet,
      solution: sanitize(solution),
      confidence: confidence || 80,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };

    submissions.set(submission.id, submission);

    // Update bounty status
    bounty.status = 'submitted';
    bounty.updated_at = new Date().toISOString();
    bounties.set(id, bounty);

    res.json({
      success: true,
      submission,
      message: 'Solution submitted successfully. Waiting for poster review.',
    });
  } catch (error) {
    console.error('[Bounties] Submit error:', error);
    res.status(500).json({ error: 'Failed to submit solution' });
  }
});

/**
 * POST /api/v1/bounties/:id/resolve - Resolve submission (approve/reject)
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const bounty = bounties.get(id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'submitted') {
      return res.status(400).json({ error: `Bounty is ${bounty.status}, cannot resolve` });
    }

    const posterWallet = req.headers['x-wallet-address'] as string || req.body.poster_wallet;

    if (!posterWallet) {
      return res.status(400).json({ error: 'Missing x-wallet-address header or poster_wallet in body' });
    }

    if (posterWallet !== bounty.poster_wallet) {
      return res.status(403).json({ error: 'Only the bounty poster can resolve submissions' });
    }

    // Get submission
    const submission = Array.from(submissions.values()).find(s => s.bounty_id === id);

    if (!submission) {
      return res.status(400).json({ error: 'No submission found for this bounty' });
    }

    if (approved) {
      // Process payout to hunter
      const payoutResult = await processPayout(bounty, submission.hunter_wallet);

      if (!payoutResult.success) {
        return res.status(500).json({
          error: 'Payout failed',
          details: payoutResult.error,
        });
      }

      submission.status = 'approved';
      submissions.set(submission.id, submission);

      bounty.status = 'completed';
      bounty.updated_at = new Date().toISOString();
      bounties.set(id, bounty);

      return res.json({
        success: true,
        status: 'approved',
        payout_tx: payoutResult.payoutTx,
        net_amount: payoutResult.netAmount,
        fee_amount: payoutResult.feeAmount,
        message: 'Bounty completed! Payment sent to hunter.',
      });
    } else {
      // Rejected - bounty goes back to open
      submission.status = 'rejected';
      submissions.set(submission.id, submission);

      bounty.status = 'open';
      bounty.updated_at = new Date().toISOString();
      bounties.set(id, bounty);

      return res.json({
        success: true,
        status: 'rejected',
        message: 'Submission rejected. Bounty is open again.',
      });
    }
  } catch (error) {
    console.error('[Bounties] Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve bounty' });
  }
});

/**
 * POST /api/v1/bounties/:id/cancel - Cancel bounty (refund)
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bounty = bounties.get(id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (!['open', 'expired'].includes(bounty.status)) {
      return res.status(400).json({ error: `Bounty is ${bounty.status}, cannot be cancelled` });
    }

    const posterWallet = req.headers['x-wallet-address'] as string || req.body.poster_wallet;

    if (!posterWallet || posterWallet !== bounty.poster_wallet) {
      return res.status(403).json({ error: 'Only the bounty poster can cancel' });
    }

    // Process refund
    const refundResult = await processRefund(bounty);

    if (!refundResult.success) {
      return res.status(500).json({
        error: 'Refund failed',
        details: refundResult.error,
      });
    }

    bounty.status = 'cancelled';
    bounty.updated_at = new Date().toISOString();
    bounties.set(id, bounty);

    res.json({
      success: true,
      refund_tx: refundResult.payoutTx,
      net_amount: refundResult.netAmount,
      message: 'Bounty cancelled. Escrow refunded (minus creation fee).',
    });
  } catch (error) {
    console.error('[Bounties] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel bounty' });
  }
});

export default router;
