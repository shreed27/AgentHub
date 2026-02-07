/**
 * Kelly Criterion Position Sizing Routes
 */

import { Router, Request, Response } from 'express';
import * as kellyOps from '../db/operations/kelly.js';

export const kellyRouter = Router();

// POST /api/v1/kelly/calculate - Calculate optimal size
kellyRouter.post('/calculate', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, symbol, winRate, avgWin, avgLoss, bankroll, maxRisk } = req.body;

    if (!userWallet || !symbol || winRate === undefined || avgWin === undefined || avgLoss === undefined || !bankroll) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const winRateNum = Number(winRate);
    const avgWinNum = Number(avgWin);
    const avgLossNum = Number(avgLoss);
    const bankrollNum = Number(bankroll);
    const maxRiskNum = maxRisk ? Number(maxRisk) : 0.1;

    // Validate inputs
    if (winRateNum < 0 || winRateNum > 1) {
      return res.status(400).json({ success: false, error: 'Win rate must be between 0 and 1' });
    }
    if (avgWinNum < 0 || avgLossNum < 0) {
      return res.status(400).json({ success: false, error: 'Average win/loss must be positive' });
    }

    const kellyFraction = kellyOps.calculateKelly(winRateNum, avgWinNum, avgLossNum);
    const halfKelly = kellyFraction * 0.5;
    const quarterKelly = kellyFraction * 0.25;

    // Use half Kelly as recommended (more conservative)
    const recommendedFraction = Math.min(halfKelly, maxRiskNum);
    const recommendedSize = bankrollNum * recommendedFraction;

    // Store calculation
    const calculation = kellyOps.storeCalculation({
      userWallet,
      symbol,
      winRate: winRateNum,
      avgWin: avgWinNum,
      avgLoss: avgLossNum,
      kellyFraction,
      halfKelly,
      quarterKelly,
      recommendedSize,
      bankroll: bankrollNum,
      maxRisk: maxRiskNum,
      trades: 0,
    });

    logger.info({ calculationId: calculation.id, kellyFraction, recommendedSize }, 'Kelly calculation completed');

    res.json({
      success: true,
      data: {
        ...calculation,
        analysis: {
          edgePositive: kellyFraction > 0,
          riskLevel: kellyFraction > 0.25 ? 'high' : kellyFraction > 0.1 ? 'medium' : 'low',
          recommendation: kellyFraction > 0 ? `Use ${(recommendedFraction * 100).toFixed(2)}% of bankroll` : 'No edge detected - do not trade',
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to calculate Kelly');
    res.status(500).json({ success: false, error: 'Failed to calculate Kelly' });
  }
});

// POST /api/v1/kelly/dynamic - Dynamic Kelly based on recent performance
kellyRouter.post('/dynamic', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { userWallet, symbol, trades, bankroll, maxRisk, confidenceLevel } = req.body;

    if (!userWallet || !symbol || !trades || !Array.isArray(trades) || !bankroll) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const bankrollNum = Number(bankroll);
    const maxRiskNum = maxRisk ? Number(maxRisk) : 0.1;
    const confidence = confidenceLevel ? Number(confidenceLevel) : 0.5;

    const result = kellyOps.calculateFromTrades(trades, bankrollNum, maxRiskNum);

    if (result.kellyFraction === 0) {
      return res.json({
        success: true,
        data: {
          ...result,
          message: 'Insufficient trade history for reliable Kelly calculation (minimum 10 trades required)',
        },
      });
    }

    // Apply confidence adjustment
    const dynamic = kellyOps.calculateDynamicKelly(
      result.winRate,
      result.avgWin,
      result.avgLoss,
      confidence
    );

    // Store calculation
    const calculation = kellyOps.storeCalculation({
      userWallet,
      symbol,
      winRate: result.winRate,
      avgWin: result.avgWin,
      avgLoss: result.avgLoss,
      kellyFraction: result.kellyFraction,
      halfKelly: result.halfKelly,
      quarterKelly: result.quarterKelly,
      recommendedSize: Math.min(dynamic.recommendedFraction, maxRiskNum) * bankrollNum,
      bankroll: bankrollNum,
      maxRisk: maxRiskNum,
      trades: trades.length,
      metadata: { confidenceLevel: confidence },
    });

    logger.info({ calculationId: calculation.id, trades: trades.length }, 'Dynamic Kelly calculation completed');

    res.json({
      success: true,
      data: {
        ...result,
        dynamic,
        calculation,
        trades: trades.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to calculate dynamic Kelly');
    res.status(500).json({ success: false, error: 'Failed to calculate dynamic Kelly' });
  }
});

// POST /api/v1/kelly/simulate - Monte Carlo simulation
kellyRouter.post('/simulate', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { winRate, avgWin, avgLoss, bankroll, kellyFraction, numSimulations, numTrades } = req.body;

    if (winRate === undefined || avgWin === undefined || avgLoss === undefined || !bankroll || !kellyFraction) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const simulation = kellyOps.monteCarloKelly(
      Number(winRate),
      Number(avgWin),
      Number(avgLoss),
      Number(bankroll),
      Number(kellyFraction),
      numSimulations ? Number(numSimulations) : 1000,
      numTrades ? Number(numTrades) : 100
    );

    logger.info({ kellyFraction, numSimulations }, 'Monte Carlo simulation completed');

    res.json({
      success: true,
      data: {
        parameters: {
          winRate: Number(winRate),
          avgWin: Number(avgWin),
          avgLoss: Number(avgLoss),
          bankroll: Number(bankroll),
          kellyFraction: Number(kellyFraction),
          numSimulations: numSimulations || 1000,
          numTrades: numTrades || 100,
        },
        results: simulation,
        analysis: {
          expectedGrowth: ((simulation.avgFinalBankroll / Number(bankroll)) - 1) * 100,
          riskOfRuin: simulation.bustProbability * 100,
          recommendation: simulation.bustProbability > 0.1
            ? 'Consider reducing position size - high risk of ruin'
            : simulation.profitProbability > 0.7
              ? 'Good risk/reward profile'
              : 'Moderate edge - consider half Kelly',
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to run simulation');
    res.status(500).json({ success: false, error: 'Failed to run simulation' });
  }
});

// GET /api/v1/kelly/history - Get calculation history
kellyRouter.get('/history', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const history = kellyOps.getKellyHistory(wallet as string, symbol as string | undefined);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get history');
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// GET /api/v1/kelly/latest - Get latest calculation for symbol
kellyRouter.get('/latest', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol } = req.query;

    if (!wallet || !symbol) {
      return res.status(400).json({ success: false, error: 'Missing required query parameters: wallet, symbol' });
    }

    const calculation = kellyOps.getLatestCalculation(wallet as string, symbol as string);

    if (!calculation) {
      return res.status(404).json({ success: false, error: 'No calculation found for this symbol' });
    }

    res.json({ success: true, data: calculation });
  } catch (error) {
    logger.error({ error }, 'Failed to get latest calculation');
    res.status(500).json({ success: false, error: 'Failed to get latest calculation' });
  }
});

// POST /api/v1/kelly/position-size - Calculate position size for a specific trade
kellyRouter.post('/position-size', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, bankroll, entryPrice, stopLoss, takeProfit, winRate } = req.body;

    if (!wallet || !symbol || !bankroll || !entryPrice || !stopLoss || !takeProfit) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const bankrollNum = Number(bankroll);
    const entryNum = Number(entryPrice);
    const slNum = Number(stopLoss);
    const tpNum = Number(takeProfit);

    // Calculate risk/reward
    const riskPerUnit = Math.abs(entryNum - slNum);
    const rewardPerUnit = Math.abs(tpNum - entryNum);
    const riskRewardRatio = rewardPerUnit / riskPerUnit;

    // Get win rate from history or use provided
    let effectiveWinRate = winRate ? Number(winRate) : 0.5;
    if (!winRate) {
      const latest = kellyOps.getLatestCalculation(wallet, symbol);
      if (latest) {
        effectiveWinRate = latest.winRate;
      }
    }

    // Calculate Kelly
    const kellyFraction = kellyOps.calculateKelly(effectiveWinRate, rewardPerUnit, riskPerUnit);
    const halfKelly = kellyFraction * 0.5;

    // Position sizing
    const maxRiskAmount = bankrollNum * halfKelly;
    const positionSize = maxRiskAmount / riskPerUnit;

    res.json({
      success: true,
      data: {
        symbol,
        entryPrice: entryNum,
        stopLoss: slNum,
        takeProfit: tpNum,
        riskRewardRatio,
        winRate: effectiveWinRate,
        kellyFraction,
        halfKelly,
        maxRiskAmount,
        positionSize,
        positionValue: positionSize * entryNum,
        potentialLoss: positionSize * riskPerUnit,
        potentialProfit: positionSize * rewardPerUnit,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to calculate position size');
    res.status(500).json({ success: false, error: 'Failed to calculate position size' });
  }
});
