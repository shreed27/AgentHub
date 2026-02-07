/**
 * Communication Channels Routes
 */

import { Router, Request, Response } from 'express';
import * as channelOps from '../db/operations/channels.js';

export const channelsRouter = Router();

// GET /api/v1/channels - List channels
channelsRouter.get('/', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet, channelType, status } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const channels = channelOps.getChannelsByWallet(wallet as string, {
      channelType: channelType as string | undefined,
      status: status as string | undefined,
    });

    res.json({ success: true, data: channels, count: channels.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get channels');
    res.status(500).json({ success: false, error: 'Failed to get channels' });
  }
});

// GET /api/v1/channels/types - Available channel types
channelsRouter.get('/types', async (req: Request, res: Response) => {
  try {
    const types = channelOps.getAvailableChannelTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get channel types' });
  }
});

// POST /api/v1/channels/:type/connect - Connect channel
channelsRouter.post('/:type/connect', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { type } = req.params;
    const { userWallet, name, config } = req.body;

    if (!userWallet || !name || !config) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const validTypes = ['telegram', 'discord', 'slack', 'email', 'sms', 'webhook'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid channel type' });
    }

    const channel = channelOps.createChannel({
      userWallet,
      channelType: type as any,
      name,
      config,
      status: 'connected',
      messageCount: 0,
    });

    logger.info({ channelId: channel.id, type, name }, 'Channel connected');
    io?.emit('channel_connected', { type: 'channel_connected', timestamp: Date.now(), data: channel });

    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    logger.error({ error }, 'Failed to connect channel');
    res.status(500).json({ success: false, error: 'Failed to connect channel' });
  }
});

// POST /api/v1/channels/:type/disconnect - Disconnect channel
channelsRouter.post('/:id/disconnect', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;

    const channel = channelOps.getChannelById(id);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    const disconnected = channelOps.disconnectChannel(id);
    logger.info({ channelId: id }, 'Channel disconnected');

    io?.emit('channel_disconnected', { type: 'channel_disconnected', timestamp: Date.now(), data: disconnected });

    res.json({ success: true, data: disconnected });
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect channel');
    res.status(500).json({ success: false, error: 'Failed to disconnect channel' });
  }
});

// POST /api/v1/channels/:id/send - Send message
channelsRouter.post('/:id/send', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;
  const io = req.app.locals.io;

  try {
    const { id } = req.params;
    const { messageType, content, metadata } = req.body;

    const channel = channelOps.getChannelById(id);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    if (channel.status !== 'connected') {
      return res.status(400).json({ success: false, error: 'Channel is not connected' });
    }

    if (!content) {
      return res.status(400).json({ success: false, error: 'Missing required field: content' });
    }

    // In production, this would actually send the message via the channel
    const message = channelOps.createMessage({
      channelId: id,
      userWallet: channel.userWallet,
      direction: 'outbound',
      messageType: messageType || 'notification',
      content,
      metadata,
      status: 'sent',
    });

    logger.info({ messageId: message.id, channelId: id }, 'Message sent');
    io?.emit('channel_message_sent', { type: 'channel_message_sent', timestamp: Date.now(), data: message });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error({ error }, 'Failed to send message');
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// GET /api/v1/channels/:id/status - Channel status
channelsRouter.get('/:id/status', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const channel = channelOps.getChannelById(id);

    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    const messages = channelOps.getMessagesByChannel(id, { limit: 5 });

    res.json({
      success: true,
      data: {
        channel,
        recentMessages: messages,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get channel status');
    res.status(500).json({ success: false, error: 'Failed to get channel status' });
  }
});

// GET /api/v1/channels/:id/messages - Get messages
channelsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const { direction, messageType, limit } = req.query;

    const channel = channelOps.getChannelById(id);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    const messages = channelOps.getMessagesByChannel(id, {
      direction: direction as string | undefined,
      messageType: messageType as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: messages, count: messages.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get messages');
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// DELETE /api/v1/channels/:id - Delete channel
channelsRouter.delete('/:id', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { id } = req.params;
    const channel = channelOps.getChannelById(id);

    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    channelOps.deleteChannel(id);
    logger.info({ channelId: id }, 'Channel deleted');

    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete channel');
    res.status(500).json({ success: false, error: 'Failed to delete channel' });
  }
});

// GET /api/v1/channels/stats - Channel stats
channelsRouter.get('/wallet/stats', async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Missing required query parameter: wallet' });
    }

    const stats = channelOps.getChannelStats(wallet as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});
