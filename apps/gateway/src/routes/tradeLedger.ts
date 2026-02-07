/**
 * Trade Ledger Routes (Decision Audit Trail)
 *
 * Endpoints:
 * - POST /api/v1/trade-ledger - Record a trade decision
 * - GET /api/v1/trade-ledger - Get trade ledger entries
 * - GET /api/v1/trade-ledger/:id - Get entry by ID
 * - GET /api/v1/trade-ledger/stats - Get trading statistics
 * - GET /api/v1/trade-ledger/decisions - Get recent AI decisions with reasoning
 * - GET /api/v1/trade-ledger/calibration - Get confidence calibration data
 * - GET /api/v1/trade-ledger/position/:positionId - Get entries for a position
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as tradeLedgerOps from '../db/operations/tradeLedger.js';
import type { TradeLedgerEntry, LedgerAction, DecisionSource } from '../db/operations/tradeLedger.js';

export const tradeLedgerRouter = Router();

/**
 * POST /api/v1/trade-ledger - Record a trade decision
 */
tradeLedgerRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      agentId,
      action,
      token,
      tokenSymbol,
      chain,
      amount,
      price,
      decisionSource,
      reasoning,
      confidence,
      signalIds,
      positionId,
      txSignature,
      fees,
      slippage,
      pnl,
    } = req.body;

    const walletAddress = req.headers['x-wallet-address'] as string || req.body.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-wallet-address header or walletAddress in body',
      });
    }

    if (!action || !token || !chain || amount === undefined || price === undefined || !decisionSource) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, token, chain, amount, price, decisionSource',
      });
    }

    const validActions: LedgerAction[] = ['buy', 'sell', 'close', 'open_position', 'close_position', 'adjust_sl', 'adjust_tp'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    const validSources: DecisionSource[] = ['manual', 'ai', 'signal', 'copy_trade', 'automation', 'limit_order'];
    if (!validSources.includes(decisionSource)) {
      return res.status(400).json({
        success: false,
        error: `Invalid decisionSource. Must be one of: ${validSources.join(', ')}`,
      });
    }

    const entry: TradeLedgerEntry = {
      id: uuidv4(),
      agentId: agentId || undefined,
      walletAddress,
      action,
      token,
      tokenSymbol: tokenSymbol || undefined,
      chain,
      amount,
      price,
      decisionSource,
      reasoning: reasoning || undefined,
      confidence: confidence || undefined,
      signalIds: signalIds || undefined,
      positionId: positionId || undefined,
      txSignature: txSignature || undefined,
      fees: fees || 0,
      slippage: slippage || 0,
      pnl: pnl || undefined,
      createdAt: Date.now(),
    };

    const createdEntry = tradeLedgerOps.createLedgerEntry(entry);

    // Emit WebSocket event
    const io = req.app.locals.io;
    io?.emit('trade_recorded', {
      type: 'trade_recorded',
      timestamp: Date.now(),
      data: createdEntry,
    });

    res.status(201).json({
      success: true,
      data: createdEntry,
    });
  } catch (error) {
    console.error('[TradeLedger] Create error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record trade',
    });
  }
});

/**
 * GET /api/v1/trade-ledger - Get trade ledger entries
 */
tradeLedgerRouter.get('/', (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string || req.query.walletAddress as string;
    const agentId = req.query.agentId as string | undefined;
    const token = req.query.token as string | undefined;
    const action = req.query.action as LedgerAction | undefined;
    const decisionSource = req.query.decisionSource as DecisionSource | undefined;
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!walletAddress && !agentId) {
      return res.status(400).json({
        success: false,
        error: 'Must provide walletAddress or agentId',
      });
    }

    const { entries, total } = tradeLedgerOps.getLedgerEntries({
      walletAddress,
      agentId,
      token,
      action,
      decisionSource,
      startTime,
      endTime,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        entries,
        total,
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error('[TradeLedger] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trade ledger',
    });
  }
});

/**
 * GET /api/v1/trade-ledger/stats - Get trading statistics
 */
tradeLedgerRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string || req.query.walletAddress as string;
    const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-wallet-address header or walletAddress query param',
      });
    }

    const stats = tradeLedgerOps.getLedgerStats(walletAddress, startTime);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[TradeLedger] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trading stats',
    });
  }
});

/**
 * GET /api/v1/trade-ledger/decisions - Get recent AI decisions with reasoning
 */
tradeLedgerRouter.get('/decisions', (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string || req.query.walletAddress as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-wallet-address header or walletAddress query param',
      });
    }

    const decisions = tradeLedgerOps.getRecentDecisions(walletAddress, limit);

    res.json({
      success: true,
      data: decisions,
    });
  } catch (error) {
    console.error('[TradeLedger] Decisions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent decisions',
    });
  }
});

/**
 * GET /api/v1/trade-ledger/calibration - Get confidence calibration data
 */
tradeLedgerRouter.get('/calibration', (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string || req.query.walletAddress as string;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-wallet-address header or walletAddress query param',
      });
    }

    const calibration = tradeLedgerOps.getConfidenceCalibration(walletAddress);

    res.json({
      success: true,
      data: calibration,
    });
  } catch (error) {
    console.error('[TradeLedger] Calibration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calibration data',
    });
  }
});

/**
 * GET /api/v1/trade-ledger/position/:positionId - Get entries for a position
 */
tradeLedgerRouter.get('/position/:positionId', (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;

    const entries = tradeLedgerOps.getEntriesByPositionId(positionId);

    res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('[TradeLedger] Position entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get position entries',
    });
  }
});

/**
 * GET /api/v1/trade-ledger/:id - Get entry by ID
 */
tradeLedgerRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const entry = tradeLedgerOps.getLedgerEntryById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Trade ledger entry not found',
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('[TradeLedger] Get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trade ledger entry',
    });
  }
});
