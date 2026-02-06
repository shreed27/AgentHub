import { Router, Request, Response } from 'express';
import { getPortfolio } from '../services/portfolio';
import { getTradeHistory } from '../db';
import { PublicKey } from '@solana/web3.js';

const router = Router();

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/v1/portfolio/:wallet
 * Get all token balances for a wallet
 */
router.get('/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;

    if (!isValidSolanaAddress(wallet)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid Solana wallet address',
      });
      return;
    }

    const portfolio = await getPortfolio(wallet);

    res.json({
      success: true,
      data: {
        wallet,
        solBalance: portfolio.solBalance,
        solUsdValue: portfolio.solUsdValue,
        tokens: portfolio.tokens,
        totalUsdValue: portfolio.totalUsdValue,
        tokenCount: portfolio.tokens.length,
      },
    });
  } catch (err: any) {
    console.error('Portfolio error:', err.message);
    res.status(502).json({
      error: 'Portfolio Fetch Failed',
      message: err.message,
    });
  }
});

/**
 * GET /api/v1/portfolio/:wallet/history
 * Get trade history for a wallet
 */
router.get('/:wallet/history', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!isValidSolanaAddress(wallet)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid Solana wallet address',
      });
      return;
    }

    const history = getTradeHistory(wallet, Math.min(limit, 100));

    res.json({
      success: true,
      data: {
        wallet,
        trades: history,
        count: history.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

export default router;
