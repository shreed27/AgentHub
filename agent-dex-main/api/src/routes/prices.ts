import { Router, Request, Response } from 'express';
import { getTokenPrice, getMultipleTokenPrices } from '../services/jupiter';

const router = Router();

/**
 * GET /api/v1/prices
 * Get multiple token prices
 * Query: mints=SOL,USDC,... (comma-separated mint addresses or symbols)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mints } = req.query;
    if (!mints) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Required query param: mints (comma-separated)',
      });
      return;
    }

    const mintList = (mints as string).split(',').map(m => m.trim());
    const prices = await getMultipleTokenPrices(mintList);

    res.json({
      success: true,
      data: prices,
    });
  } catch (err: any) {
    res.status(502).json({ error: 'Price Fetch Failed', message: err.message });
  }
});

/**
 * GET /api/v1/prices/:mint
 * Get a single token price
 */
router.get('/:mint', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const price = await getTokenPrice(mint);

    if (!price) {
      res.status(404).json({
        error: 'Not Found',
        message: `Price not found for ${mint}`,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        mint,
        ...price,
      },
    });
  } catch (err: any) {
    res.status(502).json({ error: 'Price Fetch Failed', message: err.message });
  }
});

export default router;
