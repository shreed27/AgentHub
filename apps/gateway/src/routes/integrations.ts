import { Router, Request, Response } from 'express';
import * as integrationOps from '../db/operations/integrations.js';

export const integrationsRouter = Router();

// Platform configurations
const NOTIFICATION_PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: 'telegram', category: 'messaging' as const, description: 'Receive alerts via Telegram bot' },
  { id: 'discord', name: 'Discord', icon: 'discord', category: 'messaging' as const, description: 'Get notifications in Discord channels' },
  { id: 'slack', name: 'Slack', icon: 'slack', category: 'messaging' as const, description: 'Integrate with Slack workspaces' },
  { id: 'email', name: 'Email', icon: 'mail', category: 'messaging' as const, description: 'Email notifications and digests' },
];

const TRADING_PLATFORMS = [
  { id: 'polymarket', name: 'Polymarket', icon: 'chart', category: 'prediction' as const, description: 'Prediction market trading' },
  { id: 'kalshi', name: 'Kalshi', icon: 'trending-up', category: 'prediction' as const, description: 'Event contracts marketplace' },
  { id: 'binance', name: 'Binance', icon: 'bitcoin', category: 'exchange' as const, description: 'Crypto exchange integration' },
  { id: 'bybit', name: 'Bybit', icon: 'coins', category: 'exchange' as const, description: 'Derivatives trading platform' },
];

const ALL_PLATFORMS = [...NOTIFICATION_PLATFORMS, ...TRADING_PLATFORMS];

const NOTIFICATION_EVENTS = [
  { id: 'trade_executed', name: 'Trade Executed', description: 'When a trade is filled' },
  { id: 'signal_received', name: 'New Signal', description: 'When a trading signal arrives' },
  { id: 'whale_alert', name: 'Whale Alert', description: 'God wallet activity detected' },
  { id: 'price_alert', name: 'Price Alert', description: 'Price threshold reached' },
  { id: 'agent_status', name: 'Agent Status', description: 'Agent started/stopped' },
  { id: 'bounty_update', name: 'Bounty Update', description: 'Bounty claimed/completed' },
];

// Get user ID from request (simplified - in production, use auth middleware)
function getUserId(req: Request): string {
  return req.headers['x-user-id'] as string || 'default-user';
}

// GET /api/v1/integrations - List all available platforms
integrationsRouter.get('/', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const connectedIntegrations = integrationOps.getIntegrationsByUser(userId);
  const connectedPlatformIds = new Set(connectedIntegrations.map(i => i.platform));

  const platforms = ALL_PLATFORMS.map(platform => ({
    ...platform,
    connected: connectedPlatformIds.has(platform.id),
    status: connectedIntegrations.find(i => i.platform === platform.id)?.status || 'disconnected',
  }));

  res.json({
    success: true,
    data: {
      messaging: platforms.filter(p => p.category === 'messaging'),
      exchange: platforms.filter(p => p.category === 'exchange'),
      prediction: platforms.filter(p => p.category === 'prediction'),
      notificationEvents: NOTIFICATION_EVENTS,
    },
  });
});

// GET /api/v1/integrations/connected - List user's connected platforms
integrationsRouter.get('/connected', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const integrations = integrationOps.getConnectedIntegrations(userId);

  const enrichedIntegrations = integrations.map(integration => {
    const platformInfo = ALL_PLATFORMS.find(p => p.id === integration.platform);
    return {
      ...integration,
      name: platformInfo?.name || integration.platform,
      icon: platformInfo?.icon || 'link',
      description: platformInfo?.description || '',
      // Don't expose credentials in response
      credentials: undefined,
    };
  });

  res.json({
    success: true,
    data: enrichedIntegrations,
    count: enrichedIntegrations.length,
  });
});

// POST /api/v1/integrations/:platform/connect - Connect a platform
integrationsRouter.post('/:platform/connect', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const userId = getUserId(req);
  const { platform } = req.params;
  const { credentials, config } = req.body;

  // Validate platform
  const platformInfo = ALL_PLATFORMS.find(p => p.id === platform);
  if (!platformInfo) {
    return res.status(400).json({
      success: false,
      error: `Unknown platform: ${platform}`,
    });
  }

  // Validate credentials based on platform
  if (!credentials || typeof credentials !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Credentials are required',
    });
  }

  // Platform-specific validation
  const validationError = validatePlatformCredentials(platform, credentials);
  if (validationError) {
    return res.status(400).json({
      success: false,
      error: validationError,
    });
  }

  try {
    const integration = integrationOps.connectIntegration(
      userId,
      platform,
      platformInfo.category,
      credentials,
      config
    );

    logger.info({ userId, platform }, 'Platform connected');

    // Emit WebSocket event
    const io = req.app.locals.io;
    io?.emit('integration_connected', {
      type: 'integration_connected',
      timestamp: Date.now(),
      data: { userId, platform, status: 'connected' },
    });

    res.status(201).json({
      success: true,
      data: {
        id: integration.id,
        platform: integration.platform,
        category: integration.category,
        status: integration.status,
        lastConnectedAt: integration.lastConnectedAt,
        // Don't expose credentials
      },
      message: `Successfully connected to ${platformInfo.name}`,
    });
  } catch (error) {
    logger.error({ error, userId, platform }, 'Failed to connect platform');
    res.status(500).json({
      success: false,
      error: 'Failed to connect platform',
    });
  }
});

// POST /api/v1/integrations/:platform/disconnect - Disconnect a platform
integrationsRouter.post('/:platform/disconnect', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const userId = getUserId(req);
  const { platform } = req.params;

  const platformInfo = ALL_PLATFORMS.find(p => p.id === platform);
  if (!platformInfo) {
    return res.status(400).json({
      success: false,
      error: `Unknown platform: ${platform}`,
    });
  }

  const success = integrationOps.disconnectIntegration(userId, platform);

  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Integration not found',
    });
  }

  // Also remove notification settings for this platform
  integrationOps.deleteNotificationSettings(userId, platform);

  logger.info({ userId, platform }, 'Platform disconnected');

  // Emit WebSocket event
  const io = req.app.locals.io;
  io?.emit('integration_disconnected', {
    type: 'integration_disconnected',
    timestamp: Date.now(),
    data: { userId, platform, status: 'disconnected' },
  });

  res.json({
    success: true,
    message: `Successfully disconnected from ${platformInfo.name}`,
  });
});

// GET /api/v1/integrations/:platform/status - Get platform health/status
integrationsRouter.get('/:platform/status', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { platform } = req.params;

  const platformInfo = ALL_PLATFORMS.find(p => p.id === platform);
  if (!platformInfo) {
    return res.status(400).json({
      success: false,
      error: `Unknown platform: ${platform}`,
    });
  }

  const integration = integrationOps.getIntegrationByPlatform(userId, platform);

  if (!integration) {
    return res.json({
      success: true,
      data: {
        platform,
        connected: false,
        status: 'disconnected',
        health: 'unknown',
      },
    });
  }

  // In production, this would check actual platform connectivity
  const healthCheck = await checkPlatformHealth(platform, integration.credentials);

  res.json({
    success: true,
    data: {
      platform,
      connected: integration.status === 'connected',
      status: integration.status,
      health: healthCheck.healthy ? 'healthy' : 'unhealthy',
      lastConnectedAt: integration.lastConnectedAt,
      lastError: integration.lastError,
      latencyMs: healthCheck.latencyMs,
    },
  });
});

// POST /api/v1/integrations/:platform/test - Test connection
integrationsRouter.post('/:platform/test', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const userId = getUserId(req);
  const { platform } = req.params;
  const { credentials } = req.body;

  const platformInfo = ALL_PLATFORMS.find(p => p.id === platform);
  if (!platformInfo) {
    return res.status(400).json({
      success: false,
      error: `Unknown platform: ${platform}`,
    });
  }

  // Use provided credentials or fetch from storage
  let testCredentials = credentials;
  if (!testCredentials) {
    const integration = integrationOps.getIntegrationByPlatform(userId, platform);
    if (!integration || !integration.credentials) {
      return res.status(400).json({
        success: false,
        error: 'No credentials provided and no stored credentials found',
      });
    }
    testCredentials = integration.credentials;
  }

  try {
    const result = await testPlatformConnection(platform, testCredentials);

    logger.info({ userId, platform, success: result.success }, 'Platform connection test');

    if (result.success) {
      // Update status if testing stored credentials
      if (!credentials) {
        integrationOps.updateIntegrationStatus(userId, platform, 'connected');
      }
    }

    res.json({
      success: true,
      data: {
        platform,
        testResult: result.success ? 'passed' : 'failed',
        message: result.message,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error) {
    logger.error({ error, userId, platform }, 'Platform test failed');
    res.json({
      success: true,
      data: {
        platform,
        testResult: 'failed',
        message: error instanceof Error ? error.message : 'Test failed',
      },
    });
  }
});

// GET /api/v1/integrations/notifications - Get notification settings
integrationsRouter.get('/notifications/settings', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const settings = integrationOps.getNotificationSettings(userId);

  res.json({
    success: true,
    data: settings,
    events: NOTIFICATION_EVENTS,
  });
});

// PUT /api/v1/integrations/notifications - Update notification settings
integrationsRouter.put('/notifications/settings', (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const userId = getUserId(req);
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Settings object is required',
    });
  }

  try {
    integrationOps.bulkUpdateNotificationSettings(userId, settings);

    logger.info({ userId }, 'Notification settings updated');

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to update notification settings');
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
    });
  }
});

// POST /api/v1/integrations/:platform/test-notification - Send test notification
integrationsRouter.post('/:platform/test-notification', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const userId = getUserId(req);
  const { platform } = req.params;

  const platformInfo = ALL_PLATFORMS.find(p => p.id === platform);
  if (!platformInfo || platformInfo.category !== 'messaging') {
    return res.status(400).json({
      success: false,
      error: 'Invalid messaging platform',
    });
  }

  const integration = integrationOps.getIntegrationByPlatform(userId, platform);
  if (!integration || integration.status !== 'connected') {
    return res.status(400).json({
      success: false,
      error: 'Platform not connected',
    });
  }

  try {
    const result = await sendTestNotification(platform, integration.credentials!);

    logger.info({ userId, platform, success: result.success }, 'Test notification sent');

    res.json({
      success: true,
      data: {
        sent: result.success,
        message: result.message,
      },
    });
  } catch (error) {
    logger.error({ error, userId, platform }, 'Failed to send test notification');
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
    });
  }
});

// Helper functions

function validatePlatformCredentials(platform: string, credentials: Record<string, unknown>): string | null {
  switch (platform) {
    case 'telegram':
      if (!credentials.botToken || typeof credentials.botToken !== 'string') {
        return 'Telegram bot token is required';
      }
      if (!credentials.chatId) {
        return 'Telegram chat ID is required';
      }
      break;

    case 'discord':
      if (!credentials.webhookUrl && !credentials.botToken) {
        return 'Discord webhook URL or bot token is required';
      }
      break;

    case 'slack':
      if (!credentials.webhookUrl && !credentials.botToken) {
        return 'Slack webhook URL or bot token is required';
      }
      break;

    case 'email':
      if (!credentials.email || typeof credentials.email !== 'string') {
        return 'Email address is required';
      }
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
        return 'Invalid email address';
      }
      break;

    case 'polymarket':
    case 'kalshi':
      if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
        return 'API key is required';
      }
      break;

    case 'binance':
    case 'bybit':
      if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
        return 'API key is required';
      }
      if (!credentials.apiSecret || typeof credentials.apiSecret !== 'string') {
        return 'API secret is required';
      }
      break;
  }

  return null;
}

async function checkPlatformHealth(
  platform: string,
  credentials?: Record<string, unknown>
): Promise<{ healthy: boolean; latencyMs?: number }> {
  // In production, implement actual health checks for each platform
  // For now, return mock data
  const startTime = Date.now();

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  return {
    healthy: credentials ? true : false,
    latencyMs: Date.now() - startTime,
  };
}

async function testPlatformConnection(
  platform: string,
  credentials: Record<string, unknown>
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startTime = Date.now();

  // In production, implement actual connection tests for each platform
  // For now, simulate testing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

  // Mock validation - in production, actually test the credentials
  switch (platform) {
    case 'telegram':
      if (credentials.botToken && credentials.chatId) {
        return {
          success: true,
          message: 'Successfully connected to Telegram bot',
          latencyMs: Date.now() - startTime,
        };
      }
      break;

    case 'discord':
      if (credentials.webhookUrl || credentials.botToken) {
        return {
          success: true,
          message: 'Successfully connected to Discord',
          latencyMs: Date.now() - startTime,
        };
      }
      break;

    case 'slack':
      if (credentials.webhookUrl || credentials.botToken) {
        return {
          success: true,
          message: 'Successfully connected to Slack',
          latencyMs: Date.now() - startTime,
        };
      }
      break;

    case 'email':
      if (credentials.email) {
        return {
          success: true,
          message: 'Email verified',
          latencyMs: Date.now() - startTime,
        };
      }
      break;

    default:
      if (credentials.apiKey) {
        return {
          success: true,
          message: 'API credentials validated',
          latencyMs: Date.now() - startTime,
        };
      }
  }

  return {
    success: false,
    message: 'Invalid credentials',
    latencyMs: Date.now() - startTime,
  };
}

async function sendTestNotification(
  platform: string,
  credentials: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  // In production, implement actual notification sending via CloddsBot service
  // For now, simulate sending
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));

  return {
    success: true,
    message: `Test notification sent via ${platform}`,
  };
}

export default integrationsRouter;
