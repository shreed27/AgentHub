/**
 * Database Operations for Communication Channels
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface CommunicationChannel {
  id: string;
  userWallet: string;
  channelType: 'telegram' | 'discord' | 'slack' | 'email' | 'sms' | 'webhook';
  name: string;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  lastMessageAt?: number;
  messageCount: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  userWallet: string;
  direction: 'inbound' | 'outbound';
  messageType: 'alert' | 'trade' | 'signal' | 'notification' | 'command';
  content: string;
  metadata?: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'failed';
  error?: string;
  createdAt: number;
}

interface ChannelRow {
  id: string;
  user_wallet: string;
  channel_type: string;
  name: string;
  config: string;
  status: string;
  last_message_at: number | null;
  message_count: number;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  channel_id: string;
  user_wallet: string;
  direction: string;
  message_type: string;
  content: string;
  metadata: string | null;
  status: string;
  error: string | null;
  created_at: number;
}

function rowToChannel(row: ChannelRow): CommunicationChannel {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    channelType: row.channel_type as CommunicationChannel['channelType'],
    name: row.name,
    config: JSON.parse(row.config || '{}'),
    status: row.status as CommunicationChannel['status'],
    lastMessageAt: row.last_message_at || undefined,
    messageCount: row.message_count,
    error: row.error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): ChannelMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    userWallet: row.user_wallet,
    direction: row.direction as 'inbound' | 'outbound',
    messageType: row.message_type as ChannelMessage['messageType'],
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    status: row.status as ChannelMessage['status'],
    error: row.error || undefined,
    createdAt: row.created_at,
  };
}

// Channel Operations
export function createChannel(data: Omit<CommunicationChannel, 'id' | 'createdAt' | 'updatedAt'>): CommunicationChannel {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO communication_channels (
      id, user_wallet, channel_type, name, config, status, last_message_at,
      message_count, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.channelType, data.name, JSON.stringify(data.config || {}),
    data.status || 'disconnected', data.lastMessageAt || null, data.messageCount || 0,
    data.error || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getChannelsByWallet(userWallet: string, filters?: { channelType?: string; status?: string }): CommunicationChannel[] {
  const db = getDatabase();
  let query = 'SELECT * FROM communication_channels WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.channelType) {
    query += ' AND channel_type = ?';
    params.push(filters.channelType);
  }
  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as ChannelRow[];
  return rows.map(rowToChannel);
}

export function getChannelById(id: string): CommunicationChannel | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM communication_channels WHERE id = ?');
  const row = stmt.get(id) as ChannelRow | undefined;
  return row ? rowToChannel(row) : null;
}

export function updateChannel(id: string, updates: Partial<CommunicationChannel>): CommunicationChannel | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(updates.config)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.lastMessageAt !== undefined) { fields.push('last_message_at = ?'); params.push(updates.lastMessageAt); }
  if (updates.messageCount !== undefined) { fields.push('message_count = ?'); params.push(updates.messageCount); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }

  if (fields.length === 0) return getChannelById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE communication_channels SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getChannelById(id);
}

export function connectChannel(id: string): CommunicationChannel | null {
  return updateChannel(id, { status: 'connected', error: undefined });
}

export function disconnectChannel(id: string): CommunicationChannel | null {
  return updateChannel(id, { status: 'disconnected' });
}

export function setChannelError(id: string, error: string): CommunicationChannel | null {
  return updateChannel(id, { status: 'error', error });
}

export function deleteChannel(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM communication_channels WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Message Operations
export function createMessage(data: Omit<ChannelMessage, 'id' | 'createdAt'>): ChannelMessage {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO channel_messages (
      id, channel_id, user_wallet, direction, message_type, content, metadata, status, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.channelId, data.userWallet, data.direction, data.messageType, data.content,
    data.metadata ? JSON.stringify(data.metadata) : null, data.status, data.error || null, now
  );

  // Update channel stats
  const channel = getChannelById(data.channelId);
  if (channel) {
    updateChannel(data.channelId, {
      lastMessageAt: now,
      messageCount: channel.messageCount + 1,
    });
  }

  return { id, ...data, createdAt: now };
}

export function getMessagesByChannel(channelId: string, filters?: { direction?: string; messageType?: string; limit?: number }): ChannelMessage[] {
  const db = getDatabase();
  let query = 'SELECT * FROM channel_messages WHERE channel_id = ?';
  const params: unknown[] = [channelId];

  if (filters?.direction) {
    query += ' AND direction = ?';
    params.push(filters.direction);
  }
  if (filters?.messageType) {
    query += ' AND message_type = ?';
    params.push(filters.messageType);
  }

  query += ' ORDER BY created_at DESC';
  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as MessageRow[];
  return rows.map(rowToMessage);
}

export function getMessagesByWallet(userWallet: string, limit?: number): ChannelMessage[] {
  const db = getDatabase();
  let query = 'SELECT * FROM channel_messages WHERE user_wallet = ? ORDER BY created_at DESC';
  const params: unknown[] = [userWallet];

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as MessageRow[];
  return rows.map(rowToMessage);
}

// Stats
export function getChannelStats(userWallet: string): {
  totalChannels: number;
  connectedChannels: number;
  totalMessages: number;
  messagesByType: Record<string, number>;
} {
  const db = getDatabase();

  const channelStmt = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) as connected
    FROM communication_channels WHERE user_wallet = ?
  `);
  const channelRow = channelStmt.get(userWallet) as { total: number; connected: number };

  const msgStmt = db.prepare(`
    SELECT message_type, COUNT(*) as count FROM channel_messages
    WHERE user_wallet = ? GROUP BY message_type
  `);
  const msgRows = msgStmt.all(userWallet) as { message_type: string; count: number }[];

  const messagesByType: Record<string, number> = {};
  let totalMessages = 0;
  for (const row of msgRows) {
    messagesByType[row.message_type] = row.count;
    totalMessages += row.count;
  }

  return {
    totalChannels: channelRow.total,
    connectedChannels: channelRow.connected || 0,
    totalMessages,
    messagesByType,
  };
}

// Available Channel Types
export function getAvailableChannelTypes(): { type: string; name: string; configFields: string[] }[] {
  return [
    { type: 'telegram', name: 'Telegram', configFields: ['botToken', 'chatId'] },
    { type: 'discord', name: 'Discord', configFields: ['webhookUrl', 'channelId'] },
    { type: 'slack', name: 'Slack', configFields: ['webhookUrl', 'channel'] },
    { type: 'email', name: 'Email', configFields: ['smtpHost', 'smtpPort', 'username', 'password', 'toAddress'] },
    { type: 'sms', name: 'SMS', configFields: ['twilioSid', 'twilioToken', 'fromNumber', 'toNumber'] },
    { type: 'webhook', name: 'Webhook', configFields: ['url', 'headers', 'method'] },
  ];
}
