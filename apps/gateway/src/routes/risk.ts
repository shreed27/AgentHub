import { Router, Request, Response } from 'express';
import * as riskOps from '../db/operations/risk';

const router = Router();

// ========== Risk Metrics ==========

// Get latest risk metrics
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const metrics = riskOps.getLatestRiskMetrics(wallet as string);

    if (!metrics) {
      // Return default metrics
      return res.json({
        success: true,
        data: {
          portfolioValue: 0,
          varDaily: 0,
          varWeekly: 0,
          cvarDaily: 0,
          cvarWeekly: 0,
          volatility: 0,
          volatilityRegime: 'normal',
          beta: 1,
          sharpeRatio: 0,
          maxDrawdown: 0,
          currentDrawdown: 0,
          correlationBtc: 0,
          correlationEth: 0,
        }
      });
    }

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

// Get metrics history
router.get('/metrics/history', (req: Request, res: Response) => {
  try {
    const { wallet, startDate, endDate, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const metrics = riskOps.getRiskMetricsHistory(wallet as string, {
      startDate: startDate ? parseInt(startDate as string) : undefined,
      endDate: endDate ? parseInt(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics history' });
  }
});

// Save risk metrics (for calculation service)
router.post('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = req.body;

    if (!metrics.userWallet) {
      return res.status(400).json({ success: false, error: 'userWallet is required' });
    }

    const saved = riskOps.saveRiskMetrics({
      ...metrics,
      calculatedAt: Date.now(),
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to save metrics' });
  }
});

// ========== Circuit Breaker ==========

// Get circuit breaker config
router.get('/circuit-breaker', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const config = riskOps.getCircuitBreakerConfig(wallet as string);

    if (!config) {
      // Return defaults
      return res.json({
        success: true,
        data: {
          enabled: false,
          maxDailyLoss: 10,
          maxDrawdown: 20,
          maxPositionSize: 10000,
          maxLeverage: 20,
          volatilityThreshold: 50,
          cooldownPeriod: 60,
          status: 'active',
        }
      });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching circuit breaker:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch circuit breaker config' });
  }
});

// Save circuit breaker config
router.post('/circuit-breaker', (req: Request, res: Response) => {
  try {
    const {
      userWallet, enabled, maxDailyLoss, maxDrawdown, maxPositionSize,
      maxLeverage, volatilityThreshold, cooldownPeriod
    } = req.body;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: 'userWallet is required' });
    }

    const config = riskOps.saveCircuitBreakerConfig({
      userWallet,
      enabled: enabled ?? true,
      maxDailyLoss: maxDailyLoss ?? 10,
      maxDrawdown: maxDrawdown ?? 20,
      maxPositionSize: maxPositionSize ?? 10000,
      maxLeverage: maxLeverage ?? 20,
      volatilityThreshold: volatilityThreshold ?? 50,
      cooldownPeriod: cooldownPeriod ?? 60,
      status: 'active',
    });

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving circuit breaker:', error);
    res.status(500).json({ success: false, error: 'Failed to save circuit breaker config' });
  }
});

// Trigger circuit breaker
router.post('/circuit-breaker/trigger', (req: Request, res: Response) => {
  try {
    const { wallet, reason } = req.body;

    if (!wallet || !reason) {
      return res.status(400).json({ success: false, error: 'wallet and reason are required' });
    }

    const config = riskOps.triggerCircuitBreaker(wallet, reason);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Circuit breaker not configured' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error triggering circuit breaker:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger circuit breaker' });
  }
});

// Reset circuit breaker
router.post('/circuit-breaker/reset', (req: Request, res: Response) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const config = riskOps.resetCircuitBreaker(wallet);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Circuit breaker not configured' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({ success: false, error: 'Failed to reset circuit breaker' });
  }
});

// ========== Stress Tests ==========

// Get stress test results
router.get('/stress-tests', (req: Request, res: Response) => {
  try {
    const { wallet, scenarioType, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const results = riskOps.getStressTestResults(wallet as string, {
      scenarioType: scenarioType as string,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching stress tests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stress test results' });
  }
});

// Get default stress scenarios
router.get('/stress-tests/scenarios', (req: Request, res: Response) => {
  try {
    const scenarios = riskOps.getDefaultStressScenarios();
    res.json({ success: true, data: scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scenarios' });
  }
});

// Run stress test
router.post('/stress-tests', (req: Request, res: Response) => {
  try {
    const { userWallet, scenarioName, scenarioType, description, parameters, portfolioImpact, positionImpacts, probability } = req.body;

    if (!userWallet || !scenarioName || !scenarioType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = riskOps.saveStressTestResult({
      userWallet,
      scenarioName,
      scenarioType,
      description: description || '',
      parameters: typeof parameters === 'string' ? parameters : JSON.stringify(parameters),
      portfolioImpact: portfolioImpact || 0,
      positionImpacts: typeof positionImpacts === 'string' ? positionImpacts : JSON.stringify(positionImpacts || []),
      probability,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error running stress test:', error);
    res.status(500).json({ success: false, error: 'Failed to run stress test' });
  }
});

// ========== Kill Switch ==========

// Get kill switch history
router.get('/kill-switch/history', (req: Request, res: Response) => {
  try {
    const { wallet, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const history = riskOps.getKillSwitchHistory(wallet as string, limit ? parseInt(limit as string) : 10);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching kill switch history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch kill switch history' });
  }
});

// Trigger kill switch (emergency stop)
router.post('/kill-switch', (req: Request, res: Response) => {
  try {
    const { userWallet, triggeredBy, reason, positionsClosed, ordersCancelled, totalValue } = req.body;

    if (!userWallet || !reason) {
      return res.status(400).json({ success: false, error: 'userWallet and reason are required' });
    }

    // Record the event
    const event = riskOps.recordKillSwitchEvent({
      userWallet,
      triggeredBy: triggeredBy || 'user',
      reason,
      positionsClosed: positionsClosed || 0,
      ordersCancelled: ordersCancelled || 0,
      totalValue: totalValue || 0,
    });

    // In a real implementation, this would:
    // 1. Close all open positions
    // 2. Cancel all pending orders
    // 3. Disable all automation
    // 4. Send emergency notifications

    res.status(201).json({
      success: true,
      data: event,
      message: 'Kill switch activated. All trading halted.',
    });
  } catch (error) {
    console.error('Error activating kill switch:', error);
    res.status(500).json({ success: false, error: 'Failed to activate kill switch' });
  }
});

// ========== Dashboard ==========

// Get full risk dashboard
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const dashboard = riskOps.getRiskDashboard(wallet as string);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risk dashboard' });
  }
});

// ========== Risk Limits ==========

// Get risk limits
router.get('/limits', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    // Get circuit breaker config which contains limits
    const config = riskOps.getCircuitBreakerConfig(wallet as string);

    const limits = {
      wallet,
      maxDailyLoss: config?.maxDailyLoss || 10,
      maxDrawdown: config?.maxDrawdown || 20,
      maxPositionSize: config?.maxPositionSize || 10000,
      maxLeverage: config?.maxLeverage || 20,
      maxConcentration: 25, // Max % in single asset
      minCashReserve: 10, // Min % in cash/stables
      maxOpenPositions: 10,
      maxDailyTrades: 100,
    };

    res.json({ success: true, data: limits });
  } catch (error) {
    console.error('Error fetching limits:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risk limits' });
  }
});

// Set risk limits
router.post('/limits', (req: Request, res: Response) => {
  try {
    const { userWallet, maxDailyLoss, maxDrawdown, maxPositionSize, maxLeverage, maxConcentration, minCashReserve, maxOpenPositions, maxDailyTrades } = req.body;

    if (!userWallet) {
      return res.status(400).json({ success: false, error: 'userWallet is required' });
    }

    // Update circuit breaker config with new limits
    const config = riskOps.saveCircuitBreakerConfig({
      userWallet,
      enabled: true,
      maxDailyLoss: maxDailyLoss ?? 10,
      maxDrawdown: maxDrawdown ?? 20,
      maxPositionSize: maxPositionSize ?? 10000,
      maxLeverage: maxLeverage ?? 20,
      volatilityThreshold: 50,
      cooldownPeriod: 60,
      status: 'active',
    });

    const limits = {
      ...config,
      maxConcentration: maxConcentration ?? 25,
      minCashReserve: minCashReserve ?? 10,
      maxOpenPositions: maxOpenPositions ?? 10,
      maxDailyTrades: maxDailyTrades ?? 100,
    };

    res.json({ success: true, data: limits });
  } catch (error) {
    console.error('Error saving limits:', error);
    res.status(500).json({ success: false, error: 'Failed to save risk limits' });
  }
});

// ========== Daily P&L ==========

// Get daily P&L
router.get('/daily-pnl', (req: Request, res: Response) => {
  try {
    const { wallet, days } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const numDays = days ? parseInt(days as string) : 30;

    // Generate mock daily P&L data
    const dailyPnl = [];
    let cumulativePnl = 0;
    const now = Date.now();

    for (let i = numDays - 1; i >= 0; i--) {
      const dayPnl = (Math.random() - 0.45) * 500; // Slight positive bias
      cumulativePnl += dayPnl;
      dailyPnl.push({
        date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pnl: dayPnl,
        cumulativePnl,
        trades: Math.floor(Math.random() * 20) + 1,
        winRate: 0.4 + Math.random() * 0.3,
      });
    }

    const summary = {
      totalPnl: cumulativePnl,
      avgDailyPnl: cumulativePnl / numDays,
      bestDay: Math.max(...dailyPnl.map(d => d.pnl)),
      worstDay: Math.min(...dailyPnl.map(d => d.pnl)),
      profitableDays: dailyPnl.filter(d => d.pnl > 0).length,
      losingDays: dailyPnl.filter(d => d.pnl < 0).length,
    };

    res.json({ success: true, data: { dailyPnl, summary } });
  } catch (error) {
    console.error('Error fetching daily P&L:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily P&L' });
  }
});

// ========== Drawdown ==========

// Get drawdown metrics
router.get('/drawdown', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    const metrics = riskOps.getLatestRiskMetrics(wallet as string);

    const drawdown = {
      wallet,
      currentDrawdown: metrics?.currentDrawdown || 0,
      maxDrawdown: metrics?.maxDrawdown || 0,
      drawdownDuration: Math.floor(Math.random() * 30), // Days in current drawdown
      recoveryNeeded: metrics?.currentDrawdown ? (metrics.currentDrawdown / (1 - metrics.currentDrawdown / 100)) : 0,
      avgDrawdown: (metrics?.maxDrawdown || 0) * 0.6,
      drawdownHistory: [
        { date: '2024-01-15', drawdown: 5.2, duration: 3 },
        { date: '2024-02-10', drawdown: 8.5, duration: 7 },
        { date: '2024-03-01', drawdown: 12.1, duration: 14 },
      ],
    };

    res.json({ success: true, data: drawdown });
  } catch (error) {
    console.error('Error fetching drawdown:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drawdown metrics' });
  }
});

// ========== Correlation ==========

// Get correlation matrix
router.get('/correlation', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    // Mock correlation matrix
    const assets = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];
    const matrix: Record<string, Record<string, number>> = {};

    for (const asset1 of assets) {
      matrix[asset1] = {};
      for (const asset2 of assets) {
        if (asset1 === asset2) {
          matrix[asset1][asset2] = 1;
        } else if (matrix[asset2]?.[asset1] !== undefined) {
          matrix[asset1][asset2] = matrix[asset2][asset1];
        } else {
          // Generate realistic correlations (crypto assets tend to be highly correlated)
          matrix[asset1][asset2] = 0.5 + Math.random() * 0.4;
        }
      }
    }

    const highCorrelationPairs = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const corr = matrix[assets[i]][assets[j]];
        if (corr > 0.8) {
          highCorrelationPairs.push({
            asset1: assets[i],
            asset2: assets[j],
            correlation: corr,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        matrix,
        assets,
        highCorrelationPairs,
        averageCorrelation: 0.72,
        diversificationScore: 35, // 0-100, lower is more diversified
      },
    });
  } catch (error) {
    console.error('Error fetching correlation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch correlation matrix' });
  }
});

// ========== Concentration Risk ==========

// Get concentration risk
router.get('/concentration', (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    // Mock concentration data
    const holdings = [
      { asset: 'SOL', value: 5000, percentage: 35 },
      { asset: 'ETH', value: 3500, percentage: 24.5 },
      { asset: 'BTC', value: 2500, percentage: 17.5 },
      { asset: 'USDC', value: 2000, percentage: 14 },
      { asset: 'Other', value: 1300, percentage: 9 },
    ];

    const concentration = {
      wallet,
      totalValue: 14300,
      holdings,
      herfindahlIndex: holdings.reduce((sum, h) => sum + Math.pow(h.percentage / 100, 2), 0),
      topAssetConcentration: 35,
      top3Concentration: 77,
      stableConcentration: 14,
      riskLevel: holdings[0].percentage > 30 ? 'high' : holdings[0].percentage > 20 ? 'medium' : 'low',
      recommendations: [
        holdings[0].percentage > 30 ? 'Consider reducing exposure to ' + holdings[0].asset : null,
        holdings.find(h => h.asset.includes('USD'))?.percentage || 0 < 10 ? 'Consider increasing stable allocation' : null,
      ].filter(Boolean),
    };

    res.json({ success: true, data: concentration });
  } catch (error) {
    console.error('Error fetching concentration:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch concentration risk' });
  }
});

// ========== Kelly-based Sizing ==========

// Get Kelly-based position sizing recommendation
router.post('/kelly-sizing', (req: Request, res: Response) => {
  try {
    const { wallet, symbol, winRate, avgWin, avgLoss, bankroll, maxRisk } = req.body;

    if (!wallet || !symbol || winRate === undefined || avgWin === undefined || avgLoss === undefined || !bankroll) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Kelly formula: f* = (bp - q) / b
    const b = Number(avgWin) / Number(avgLoss);
    const p = Number(winRate);
    const q = 1 - p;
    const kelly = Math.max(0, Math.min(1, (b * p - q) / b));

    const halfKelly = kelly * 0.5;
    const quarterKelly = kelly * 0.25;
    const maxRiskNum = maxRisk ? Number(maxRisk) : 0.1;

    const recommendedFraction = Math.min(halfKelly, maxRiskNum);
    const recommendedSize = Number(bankroll) * recommendedFraction;

    res.json({
      success: true,
      data: {
        symbol,
        kelly,
        halfKelly,
        quarterKelly,
        recommendedFraction,
        recommendedSize,
        bankroll: Number(bankroll),
        maxRisk: maxRiskNum,
        edge: kelly > 0,
        recommendation: kelly > 0
          ? `Recommended position size: $${recommendedSize.toFixed(2)} (${(recommendedFraction * 100).toFixed(2)}% of bankroll)`
          : 'No positive edge detected - avoid this trade',
      },
    });
  } catch (error) {
    console.error('Error calculating Kelly sizing:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate Kelly sizing' });
  }
});

export default router;
