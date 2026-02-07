import { v4 as uuidv4 } from 'uuid';
import { getDatabase, parseJSON } from '../index.js';
import crypto from 'crypto';

// Types
export interface UserIntegration {
  id: string;
  userId: string;
  platform: string;
  category: 'messaging' | 'exchange' | 'prediction';
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  lastConnectedAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IntegrationNotification {
  id: string;
  userId: string;
  platform: string;
  eventType: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  createdAt: number;
}

export interface NotificationSettings {
  [platform: string]: {
    [eventType: string]: {
      enabled: boolean;
      config?: Record<string, unknown>;
    };
  };
}

interface IntegrationRow {
  id: string;
  user_id: string;
  platform: string;
  category: string;
  credentials_encrypted: string | null;
  config: string | null;
  status: string;
  last_connected_at: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

interface NotificationRow {
  id: string;
  user_id: string;
  platform: string;
  event_type: string;
  enabled: number;
  config: string | null;
  created_at: number;
}

// Encryption helpers
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-dev-key-32-bytes-long!!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  // Ensure key is exactly 32 bytes for AES-256
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  return key;
}

function encryptCredentials(credentials: Record<string, unknown>): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(credentials);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptCredentials(encryptedData: string): Record<string, unknown> | null {
  try {
    const [ivHex, tagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// Row to model conversion
function rowToIntegration(row: IntegrationRow): UserIntegration {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    category: row.category as 'messaging' | 'exchange' | 'prediction',
    credentials: row.credentials_encrypted ? decryptCredentials(row.credentials_encrypted) ?? undefined : undefined,
    config: parseJSON<Record<string, unknown>>(row.config, {}),
    status: row.status as 'connected' | 'disconnected' | 'error',
    lastConnectedAt: row.last_connected_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToNotification(row: NotificationRow): IntegrationNotification {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    eventType: row.event_type,
    enabled: row.enabled === 1,
    config: parseJSON<Record<string, unknown>>(row.config, {}),
    createdAt: row.created_at,
  };
}

// CRUD Operations for Integrations

export function getIntegrationsByUser(userId: string): UserIntegration[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM user_integrations WHERE user_id = ? ORDER BY updated_at DESC');
  const rows = stmt.all(userId) as IntegrationRow[];
  return rows.map(rowToIntegration);
}

export function getIntegrationByPlatform(userId: string, platform: string): UserIntegration | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM user_integrations WHERE user_id = ? AND platform = ?');
  const row = stmt.get(userId, platform) as IntegrationRow | undefined;
  return row ? rowToIntegration(row) : null;
}

export function getConnectedIntegrations(userId: string): UserIntegration[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM user_integrations WHERE user_id = ? AND status = ? ORDER BY updated_at DESC');
  const rows = stmt.all(userId, 'connected') as IntegrationRow[];
  return rows.map(rowToIntegration);
}

export function connectIntegration(
  userId: string,
  platform: string,
  category: 'messaging' | 'exchange' | 'prediction',
  credentials: Record<string, unknown>,
  config?: Record<string, unknown>
): UserIntegration {
  const db = getDatabase();
  const now = Date.now();

  // Check if integration already exists
  const existing = getIntegrationByPlatform(userId, platform);

  if (existing) {
    // Update existing integration
    const stmt = db.prepare(`
      UPDATE user_integrations
      SET credentials_encrypted = ?, config = ?, status = ?, last_connected_at = ?, last_error = NULL, updated_at = ?
      WHERE user_id = ? AND platform = ?
    `);
    stmt.run(
      encryptCredentials(credentials),
      config ? JSON.stringify(config) : null,
      'connected',
      now,
      now,
      userId,
      platform
    );
    return getIntegrationByPlatform(userId, platform)!;
  }

  // Create new integration
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO user_integrations (id, user_id, platform, category, credentials_encrypted, config, status, last_connected_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    userId,
    platform,
    category,
    encryptCredentials(credentials),
    config ? JSON.stringify(config) : null,
    'connected',
    now,
    now,
    now
  );

  return getIntegrationByPlatform(userId, platform)!;
}

export function disconnectIntegration(userId: string, platform: string): boolean {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE user_integrations
    SET status = ?, credentials_encrypted = NULL, updated_at = ?
    WHERE user_id = ? AND platform = ?
  `);
  const result = stmt.run('disconnected', now, userId, platform);
  return result.changes > 0;
}

export function updateIntegrationStatus(
  userId: string,
  platform: string,
  status: 'connected' | 'disconnected' | 'error',
  error?: string
): UserIntegration | null {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE user_integrations
    SET status = ?, last_error = ?, updated_at = ?
    WHERE user_id = ? AND platform = ?
  `);
  stmt.run(status, error ?? null, now, userId, platform);
  return getIntegrationByPlatform(userId, platform);
}

export function deleteIntegration(userId: string, platform: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM user_integrations WHERE user_id = ? AND platform = ?');
  const result = stmt.run(userId, platform);
  return result.changes > 0;
}

// CRUD Operations for Notification Settings

export function getNotificationSettings(userId: string): NotificationSettings {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM integration_notifications WHERE user_id = ?');
  const rows = stmt.all(userId) as NotificationRow[];

  const settings: NotificationSettings = {};
  for (const row of rows) {
    if (!settings[row.platform]) {
      settings[row.platform] = {};
    }
    settings[row.platform][row.event_type] = {
      enabled: row.enabled === 1,
      config: parseJSON<Record<string, unknown>>(row.config, {}),
    };
  }
  return settings;
}

export function getNotificationSettingsForPlatform(userId: string, platform: string): IntegrationNotification[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM integration_notifications WHERE user_id = ? AND platform = ?');
  const rows = stmt.all(userId, platform) as NotificationRow[];
  return rows.map(rowToNotification);
}

export function updateNotificationSetting(
  userId: string,
  platform: string,
  eventType: string,
  enabled: boolean,
  config?: Record<string, unknown>
): IntegrationNotification {
  const db = getDatabase();
  const now = Date.now();

  // Upsert notification setting
  const existing = db.prepare(
    'SELECT id FROM integration_notifications WHERE user_id = ? AND platform = ? AND event_type = ?'
  ).get(userId, platform, eventType) as { id: string } | undefined;

  if (existing) {
    const stmt = db.prepare(`
      UPDATE integration_notifications
      SET enabled = ?, config = ?
      WHERE id = ?
    `);
    stmt.run(enabled ? 1 : 0, config ? JSON.stringify(config) : null, existing.id);

    return {
      id: existing.id,
      userId,
      platform,
      eventType,
      enabled,
      config,
      createdAt: now,
    };
  }

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO integration_notifications (id, user_id, platform, event_type, enabled, config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId, platform, eventType, enabled ? 1 : 0, config ? JSON.stringify(config) : null, now);

  return {
    id,
    userId,
    platform,
    eventType,
    enabled,
    config,
    createdAt: now,
  };
}

export function bulkUpdateNotificationSettings(
  userId: string,
  settings: NotificationSettings
): void {
  const db = getDatabase();
  const now = Date.now();

  const upsertStmt = db.prepare(`
    INSERT INTO integration_notifications (id, user_id, platform, event_type, enabled, config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, platform, event_type) DO UPDATE SET
      enabled = excluded.enabled,
      config = excluded.config
  `);

  const transaction = db.transaction(() => {
    for (const [platform, events] of Object.entries(settings)) {
      for (const [eventType, setting] of Object.entries(events)) {
        upsertStmt.run(
          uuidv4(),
          userId,
          platform,
          eventType,
          setting.enabled ? 1 : 0,
          setting.config ? JSON.stringify(setting.config) : null,
          now
        );
      }
    }
  });

  transaction();
}

export function deleteNotificationSettings(userId: string, platform: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM integration_notifications WHERE user_id = ? AND platform = ?');
  const result = stmt.run(userId, platform);
  return result.changes > 0;
}
