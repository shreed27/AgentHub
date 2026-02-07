/**
 * Database Operations for Agent Memory System
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface MemoryEntry {
  id: string;
  userWallet: string;
  agentId?: string;
  key: string;
  memoryType: 'short_term' | 'long_term' | 'episodic' | 'semantic' | 'procedural';
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  importance: number;
  accessCount: number;
  lastAccessedAt?: number;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface MemoryRow {
  id: string;
  user_wallet: string;
  agent_id: string | null;
  key: string;
  memory_type: string;
  content: string;
  metadata: string | null;
  embedding: string | null;
  importance: number;
  access_count: number;
  last_accessed_at: number | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

function rowToMemory(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    agentId: row.agent_id || undefined,
    key: row.key,
    memoryType: row.memory_type as MemoryEntry['memoryType'],
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    importance: row.importance,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at || undefined,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Memory Operations
export function remember(data: Omit<MemoryEntry, 'id' | 'accessCount' | 'createdAt' | 'updatedAt'>): MemoryEntry {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO memory_store (
      id, user_wallet, agent_id, key, memory_type, content, metadata, embedding,
      importance, access_count, last_accessed_at, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.agentId || null, data.key, data.memoryType, data.content,
    data.metadata ? JSON.stringify(data.metadata) : null,
    data.embedding ? JSON.stringify(data.embedding) : null,
    data.importance || 0.5, 0, data.lastAccessedAt || null, data.expiresAt || null, now, now
  );

  return { id, ...data, accessCount: 0, createdAt: now, updatedAt: now };
}

export function recall(key: string, userWallet: string, agentId?: string): MemoryEntry | null {
  const db = getDatabase();
  let query = 'SELECT * FROM memory_store WHERE key = ? AND user_wallet = ?';
  const params: unknown[] = [key, userWallet];

  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  const stmt = db.prepare(query);
  const row = stmt.get(...params) as MemoryRow | undefined;

  if (!row) return null;

  // Update access stats
  const now = Date.now();
  db.prepare(`
    UPDATE memory_store SET access_count = access_count + 1, last_accessed_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, row.id);

  return { ...rowToMemory(row), accessCount: row.access_count + 1, lastAccessedAt: now };
}

export function search(userWallet: string, filters?: {
  memoryType?: string;
  agentId?: string;
  keyword?: string;
  minImportance?: number;
  limit?: number;
}): MemoryEntry[] {
  const db = getDatabase();
  let query = 'SELECT * FROM memory_store WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  // Filter out expired memories
  query += ' AND (expires_at IS NULL OR expires_at > ?)';
  params.push(Date.now());

  if (filters?.memoryType) {
    query += ' AND memory_type = ?';
    params.push(filters.memoryType);
  }
  if (filters?.agentId) {
    query += ' AND agent_id = ?';
    params.push(filters.agentId);
  }
  if (filters?.keyword) {
    query += ' AND (content LIKE ? OR key LIKE ?)';
    const pattern = `%${filters.keyword}%`;
    params.push(pattern, pattern);
  }
  if (filters?.minImportance !== undefined) {
    query += ' AND importance >= ?';
    params.push(filters.minImportance);
  }

  query += ' ORDER BY importance DESC, last_accessed_at DESC';
  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as MemoryRow[];
  return rows.map(rowToMemory);
}

export function getByType(userWallet: string, memoryType: MemoryEntry['memoryType'], limit?: number): MemoryEntry[] {
  return search(userWallet, { memoryType, limit });
}

export function update(id: string, updates: Partial<MemoryEntry>): MemoryEntry | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.content !== undefined) { fields.push('content = ?'); params.push(updates.content); }
  if (updates.metadata !== undefined) { fields.push('metadata = ?'); params.push(JSON.stringify(updates.metadata)); }
  if (updates.embedding !== undefined) { fields.push('embedding = ?'); params.push(JSON.stringify(updates.embedding)); }
  if (updates.importance !== undefined) { fields.push('importance = ?'); params.push(updates.importance); }
  if (updates.expiresAt !== undefined) { fields.push('expires_at = ?'); params.push(updates.expiresAt); }

  if (fields.length === 0) return getById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE memory_store SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getById(id);
}

export function getById(id: string): MemoryEntry | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM memory_store WHERE id = ?');
  const row = stmt.get(id) as MemoryRow | undefined;
  return row ? rowToMemory(row) : null;
}

export function forget(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM memory_store WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function forgetByKey(key: string, userWallet: string, agentId?: string): boolean {
  const db = getDatabase();
  let query = 'DELETE FROM memory_store WHERE key = ? AND user_wallet = ?';
  const params: unknown[] = [key, userWallet];

  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  const stmt = db.prepare(query);
  const result = stmt.run(...params);
  return result.changes > 0;
}

// Clean up expired memories
export function cleanExpired(): number {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM memory_store WHERE expires_at IS NOT NULL AND expires_at < ?');
  const result = stmt.run(Date.now());
  return result.changes;
}

// Consolidate memories (merge related short-term into long-term)
export function consolidate(userWallet: string, agentId?: string): { consolidated: number; removed: number } {
  // This would be more sophisticated in production
  // For now, just promote high-importance short-term memories to long-term
  const db = getDatabase();

  let query = `
    UPDATE memory_store SET memory_type = 'long_term', updated_at = ?
    WHERE user_wallet = ? AND memory_type = 'short_term' AND importance > 0.7
  `;
  const params: unknown[] = [Date.now(), userWallet];

  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  const result = db.prepare(query).run(...params);

  // Remove low-importance short-term memories
  let removeQuery = `
    DELETE FROM memory_store
    WHERE user_wallet = ? AND memory_type = 'short_term' AND importance < 0.3 AND access_count < 3
  `;
  const removeParams: unknown[] = [userWallet];

  if (agentId) {
    removeQuery += ' AND agent_id = ?';
    removeParams.push(agentId);
  }

  const removeResult = db.prepare(removeQuery).run(...removeParams);

  return { consolidated: result.changes, removed: removeResult.changes };
}

// Stats
export function getMemoryStats(userWallet: string, agentId?: string): {
  totalMemories: number;
  byType: Record<string, number>;
  avgImportance: number;
  totalAccessCount: number;
} {
  const db = getDatabase();
  let baseQuery = 'FROM memory_store WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (agentId) {
    baseQuery += ' AND agent_id = ?';
    params.push(agentId);
  }

  const statsStmt = db.prepare(`
    SELECT COUNT(*) as total, AVG(importance) as avg_importance, SUM(access_count) as total_access
    ${baseQuery}
  `);
  const statsRow = statsStmt.get(...params) as { total: number; avg_importance: number | null; total_access: number | null };

  const typeStmt = db.prepare(`
    SELECT memory_type, COUNT(*) as count ${baseQuery} GROUP BY memory_type
  `);
  const typeRows = typeStmt.all(...params) as { memory_type: string; count: number }[];

  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    byType[row.memory_type] = row.count;
  }

  return {
    totalMemories: statsRow.total,
    byType,
    avgImportance: statsRow.avg_importance || 0,
    totalAccessCount: statsRow.total_access || 0,
  };
}
