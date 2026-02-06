import { Router, Request, Response } from 'express';
import { getQuote } from '../services/jupiter';

const router = Router();

/**
 * GET /api/v1/quote
 * Get a swap quote from Jupiter
 * Query params: inputMint, outputMint, amount, slippageBps
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.query;

    if (!inputMint || !outputMint || !amount) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Required query params: inputMint, outputMint, amount',
      });
      return;
    }

    const quote = await getQuote({
      inputMint: inputMint as string,
      outputMint: outputMint as string,
      amount: amount as string,
      slippageBps: slippageBps ? parseInt(slippageBps as string) : 50,
    });

    res.json({
      success: true,
      data: {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        slippageBps: quote.slippageBps,
        routePlan: quote.routePlan.map(r => ({
          protocol: r.swapInfo.label,
          inputMint: r.swapInfo.inputMint,
          outputMint: r.swapInfo.outputMint,
          inAmount: r.swapInfo.inAmount,
          outAmount: r.swapInfo.outAmount,
          feeAmount: r.swapInfo.feeAmount,
          percent: r.percent,
        })),
        // Include raw quote for swap execution
        _rawQuote: quote,
      },
    });
  } catch (err: any) {
    console.error('Quote error:', err.message);
    res.status(502).json({
      error: 'Quote Failed',
      message: err.message,
    });
  }
});

export default router;
