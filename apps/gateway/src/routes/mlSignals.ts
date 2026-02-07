/**
 * ML Signals and Models Routes
 */

import { Router, Request, Response } from 'express';
import * as mlOps from '../db/operations/mlSignals.js';

export const mlSignalsRouter = Router();

// POST /api/v1/ml-signals/models - Create/train model
mlSignalsRouter.post('/models', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { userWallet, name, modelType, symbol, features, hyperparameters } = req.body;

    if (!userWallet || !name || !modelType || !symbol || !features || !Array.isArray(features)) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const model = mlOps.createModel({
      userWallet,
      name,
      modelType,
      symbol,
      features,
      hyperparameters: hyperparameters || {},
      metrics: {},
      status: 'training',
    });

    logger.info({ modelId: model.id, name, modelType }, 'ML model created');
    io?.emit('ml_model_created', { type: 'ml_model_created', timestamp: Date.now(), data: model });

    // In production, this would trigger actual model training
    // For now, simulate training completion after a short delay
    setTimeout(() => {
      mlOps.updateModel(model.id, {
        status: 'ready',
        trainedAt: Date.now(),
        metrics: {
          accuracy: 0.72 + Math.random() * 0.15,
          precision: 0.68 + Math.random() * 0.2,
          recall: 0.65 + Math.random() * 0.2,
          f1Score: 0.67 + Math.random() * 0.18,
        },
      });
      io?.emit('ml_model_trained', { type: 'ml_model_trained', timestamp: Date.now(), modelId: model.id });
    }, 5000);

    res.status(201).json({ success: true, data: model });
  } catch (error) {
    logger.error({ error }, 'Failed to create ML model');
    res.status(500).json({ success: false, error: 'Failed to create ML model' });
  }
});

// GET /api/v1/ml-signals/models - List models
mlSignalsRouter.get('/models', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, status, modelType } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const models = mlOps.getModelsByWallet(wallet as string, {
      status: status as string | undefined,
      modelType: modelType as string | undefined,
    });

    res.json({ success: true, data: models, count: models.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get models');
    res.status(500).json({ success: false, error: 'Failed to get models' });
  }
});

// GET /api/v1/ml-signals/models/:id - Get model
mlSignalsRouter.get('/models/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const model = mlOps.getModelById(id);

    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    res.json({ success: true, data: model });
  } catch (error) {
    logger.error({ error }, 'Failed to get model');
    res.status(500).json({ success: false, error: 'Failed to get model' });
  }
});

// POST /api/v1/ml-signals/models/:id/predict - Get prediction
mlSignalsRouter.post('/models/:id/predict', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;
    const { price, features: inputFeatures } = req.body;

    const model = mlOps.getModelById(id);
    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    if (model.status !== 'ready') {
      return res.status(400).json({ success: false, error: 'Model is not ready for predictions' });
    }

    if (!price) {
      return res.status(400).json({ success: false, error: 'Missing required field: price' });
    }

    // Generate mock prediction based on features
    // In production, this would call the actual ML model
    const confidence = 0.5 + Math.random() * 0.4;
    const signalTypes = ['buy', 'sell', 'hold'] as const;
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];

    const targetMultiplier = signalType === 'buy' ? 1.05 : signalType === 'sell' ? 0.95 : 1.0;
    const stopMultiplier = signalType === 'buy' ? 0.97 : signalType === 'sell' ? 1.03 : undefined;
    const tpMultiplier = signalType === 'buy' ? 1.08 : signalType === 'sell' ? 0.92 : undefined;

    const signal = mlOps.createSignal({
      modelId: id,
      userWallet: model.userWallet,
      symbol: model.symbol,
      signalType,
      confidence,
      price: Number(price),
      targetPrice: Number(price) * targetMultiplier,
      stopLoss: stopMultiplier ? Number(price) * stopMultiplier : undefined,
      takeProfit: tpMultiplier ? Number(price) * tpMultiplier : undefined,
      features: inputFeatures || {},
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    logger.info({ modelId: id, signalType, confidence }, 'ML prediction generated');
    io?.emit('ml_signal_generated', { type: 'ml_signal_generated', timestamp: Date.now(), data: signal });

    res.json({ success: true, data: signal });
  } catch (error) {
    logger.error({ error }, 'Failed to generate prediction');
    res.status(500).json({ success: false, error: 'Failed to generate prediction' });
  }
});

// DELETE /api/v1/ml-signals/models/:id - Delete model
mlSignalsRouter.delete('/models/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const model = mlOps.getModelById(id);

    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    mlOps.deleteModel(id);
    logger.info({ modelId: id }, 'ML model deleted');

    res.json({ success: true, message: 'Model deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete model');
    res.status(500).json({ success: false, error: 'Failed to delete model' });
  }
});

// GET /api/v1/ml-signals/features - Available features
mlSignalsRouter.get('/features', async (req: Request, res: Response) => {
  try {
    const features = mlOps.getAvailableFeatures();
    res.json({ success: true, data: features });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get features' });
  }
});

// GET /api/v1/ml-signals/model-types - Available model types
mlSignalsRouter.get('/model-types', async (req: Request, res: Response) => {
  try {
    const types = mlOps.getModelTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get model types' });
  }
});

// POST /api/v1/ml-signals/extract - Extract features
mlSignalsRouter.post('/extract', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { symbol, featureNames } = req.body;

    if (!symbol || !featureNames || !Array.isArray(featureNames)) {
      return res.status(400).json({ success: false, error: 'Missing required fields: symbol, featureNames' });
    }

    // Mock feature extraction - would integrate with data feeds in production
    const extractedFeatures: Record<string, number> = {};
    for (const name of featureNames) {
      switch (name) {
        case 'price':
          extractedFeatures[name] = 100 + Math.random() * 50;
          break;
        case 'price_change_1h':
        case 'price_change_24h':
          extractedFeatures[name] = (Math.random() - 0.5) * 10;
          break;
        case 'price_change_7d':
          extractedFeatures[name] = (Math.random() - 0.5) * 20;
          break;
        case 'volume_24h':
          extractedFeatures[name] = Math.random() * 1000000;
          break;
        case 'volume_change':
          extractedFeatures[name] = (Math.random() - 0.5) * 50;
          break;
        case 'rsi_14':
          extractedFeatures[name] = 30 + Math.random() * 40;
          break;
        case 'macd':
        case 'macd_signal':
          extractedFeatures[name] = (Math.random() - 0.5) * 2;
          break;
        case 'fear_greed':
          extractedFeatures[name] = Math.floor(Math.random() * 100);
          break;
        default:
          extractedFeatures[name] = Math.random() * 100;
      }
    }

    res.json({ success: true, data: { symbol, features: extractedFeatures, extractedAt: Date.now() } });
  } catch (error) {
    logger.error({ error }, 'Failed to extract features');
    res.status(500).json({ success: false, error: 'Failed to extract features' });
  }
});

// GET /api/v1/ml-signals/signals - Get signals
mlSignalsRouter.get('/signals', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, symbol, signalType, limit } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const signals = mlOps.getSignalsByWallet(wallet as string, {
      symbol: symbol as string | undefined,
      signalType: signalType as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: signals, count: signals.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get signals');
    res.status(500).json({ success: false, error: 'Failed to get signals' });
  }
});

// GET /api/v1/ml-signals/stats - Model stats
mlSignalsRouter.get('/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = mlOps.getModelStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});
