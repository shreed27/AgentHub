/**
 * Database Operations for Agent Control Protocol (ACP)
 */

import { getDatabase } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface AcpAgent {
  id: string;
  userWallet: string;
  name: string;
  agentType: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy' | 'error';
  endpoint?: string;
  metadata?: Record<string, unknown>;
  lastHeartbeat?: number;
  registeredAt: number;
  updatedAt: number;
}

export interface AcpTask {
  id: string;
  userWallet: string;
  agentId?: string;
  taskType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload: Record<string, unknown>;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: Record<string, unknown>;
  error?: string;
  assignedAt?: number;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AcpMessage {
  id: string;
  fromAgent?: string;
  toAgent?: string;
  userWallet: string;
  messageType: 'command' | 'response' | 'event' | 'broadcast';
  topic?: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

interface AgentRow {
  id: string;
  user_wallet: string;
  name: string;
  agent_type: string;
  capabilities: string;
  status: string;
  endpoint: string | null;
  metadata: string | null;
  last_heartbeat: number | null;
  registered_at: number;
  updated_at: number;
}

interface TaskRow {
  id: string;
  user_wallet: string;
  agent_id: string | null;
  task_type: string;
  priority: string;
  payload: string;
  status: string;
  result: string | null;
  error: string | null;
  assigned_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  from_agent: string | null;
  to_agent: string | null;
  user_wallet: string;
  message_type: string;
  topic: string | null;
  payload: string;
  created_at: number;
}

function rowToAgent(row: AgentRow): AcpAgent {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    name: row.name,
    agentType: row.agent_type,
    capabilities: JSON.parse(row.capabilities || '[]'),
    status: row.status as AcpAgent['status'],
    endpoint: row.endpoint || undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    lastHeartbeat: row.last_heartbeat || undefined,
    registeredAt: row.registered_at,
    updatedAt: row.updated_at,
  };
}

function rowToTask(row: TaskRow): AcpTask {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    agentId: row.agent_id || undefined,
    taskType: row.task_type,
    priority: row.priority as AcpTask['priority'],
    payload: JSON.parse(row.payload || '{}'),
    status: row.status as AcpTask['status'],
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error || undefined,
    assignedAt: row.assigned_at || undefined,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): AcpMessage {
  return {
    id: row.id,
    fromAgent: row.from_agent || undefined,
    toAgent: row.to_agent || undefined,
    userWallet: row.user_wallet,
    messageType: row.message_type as AcpMessage['messageType'],
    topic: row.topic || undefined,
    payload: JSON.parse(row.payload || '{}'),
    createdAt: row.created_at,
  };
}

// Agent Operations
export function registerAgent(data: Omit<AcpAgent, 'id' | 'registeredAt' | 'updatedAt'>): AcpAgent {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO acp_agents (
      id, user_wallet, name, agent_type, capabilities, status, endpoint, metadata,
      last_heartbeat, registered_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.name, data.agentType, JSON.stringify(data.capabilities || []),
    data.status || 'offline', data.endpoint || null, data.metadata ? JSON.stringify(data.metadata) : null,
    data.lastHeartbeat || null, now, now
  );

  return { id, ...data, registeredAt: now, updatedAt: now };
}

export function getAgents(userWallet: string, filters?: { status?: string; agentType?: string }): AcpAgent[] {
  const db = getDatabase();
  let query = 'SELECT * FROM acp_agents WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.agentType) {
    query += ' AND agent_type = ?';
    params.push(filters.agentType);
  }

  query += ' ORDER BY registered_at DESC';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as AgentRow[];
  return rows.map(rowToAgent);
}

export function getAgentById(id: string): AcpAgent | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM acp_agents WHERE id = ?');
  const row = stmt.get(id) as AgentRow | undefined;
  return row ? rowToAgent(row) : null;
}

export function updateAgent(id: string, updates: Partial<AcpAgent>): AcpAgent | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.capabilities !== undefined) { fields.push('capabilities = ?'); params.push(JSON.stringify(updates.capabilities)); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.endpoint !== undefined) { fields.push('endpoint = ?'); params.push(updates.endpoint); }
  if (updates.metadata !== undefined) { fields.push('metadata = ?'); params.push(JSON.stringify(updates.metadata)); }
  if (updates.lastHeartbeat !== undefined) { fields.push('last_heartbeat = ?'); params.push(updates.lastHeartbeat); }

  if (fields.length === 0) return getAgentById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE acp_agents SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getAgentById(id);
}

export function heartbeat(id: string): AcpAgent | null {
  return updateAgent(id, { lastHeartbeat: Date.now(), status: 'online' });
}

export function unregisterAgent(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM acp_agents WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Task Operations
export function enqueueTask(data: Omit<AcpTask, 'id' | 'createdAt' | 'updatedAt'>): AcpTask {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO acp_tasks (
      id, user_wallet, agent_id, task_type, priority, payload, status, result, error,
      assigned_at, started_at, completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.userWallet, data.agentId || null, data.taskType, data.priority || 'medium',
    JSON.stringify(data.payload || {}), data.status || 'pending',
    data.result ? JSON.stringify(data.result) : null, data.error || null,
    data.assignedAt || null, data.startedAt || null, data.completedAt || null, now, now
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export function getTasks(userWallet: string, filters?: { status?: string; agentId?: string; priority?: string }): AcpTask[] {
  const db = getDatabase();
  let query = 'SELECT * FROM acp_tasks WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.agentId) {
    query += ' AND agent_id = ?';
    params.push(filters.agentId);
  }
  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY CASE priority WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, created_at';
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as TaskRow[];
  return rows.map(rowToTask);
}

export function getTaskById(id: string): AcpTask | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM acp_tasks WHERE id = ?');
  const row = stmt.get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function updateTask(id: string, updates: Partial<AcpTask>): AcpTask | null {
  const db = getDatabase();
  const now = Date.now();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (updates.agentId !== undefined) { fields.push('agent_id = ?'); params.push(updates.agentId); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.result !== undefined) { fields.push('result = ?'); params.push(JSON.stringify(updates.result)); }
  if (updates.error !== undefined) { fields.push('error = ?'); params.push(updates.error); }
  if (updates.assignedAt !== undefined) { fields.push('assigned_at = ?'); params.push(updates.assignedAt); }
  if (updates.startedAt !== undefined) { fields.push('started_at = ?'); params.push(updates.startedAt); }
  if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); params.push(updates.completedAt); }

  if (fields.length === 0) return getTaskById(id);

  fields.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`UPDATE acp_tasks SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return getTaskById(id);
}

export function assignTask(taskId: string, agentId: string): AcpTask | null {
  return updateTask(taskId, { agentId, status: 'assigned', assignedAt: Date.now() });
}

export function startTask(id: string): AcpTask | null {
  return updateTask(id, { status: 'running', startedAt: Date.now() });
}

export function completeTask(id: string, result: Record<string, unknown>): AcpTask | null {
  return updateTask(id, { status: 'completed', result, completedAt: Date.now() });
}

export function failTask(id: string, error: string): AcpTask | null {
  return updateTask(id, { status: 'failed', error, completedAt: Date.now() });
}

export function cancelTask(id: string): AcpTask | null {
  return updateTask(id, { status: 'cancelled', completedAt: Date.now() });
}

// Message Operations
export function sendMessage(data: Omit<AcpMessage, 'id' | 'createdAt'>): AcpMessage {
  const db = getDatabase();
  const now = Date.now();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO acp_messages (
      id, from_agent, to_agent, user_wallet, message_type, topic, payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id, data.fromAgent || null, data.toAgent || null, data.userWallet,
    data.messageType, data.topic || null, JSON.stringify(data.payload || {}), now
  );

  return { id, ...data, createdAt: now };
}

export function getMessages(userWallet: string, filters?: { fromAgent?: string; toAgent?: string; messageType?: string; topic?: string; limit?: number }): AcpMessage[] {
  const db = getDatabase();
  let query = 'SELECT * FROM acp_messages WHERE user_wallet = ?';
  const params: unknown[] = [userWallet];

  if (filters?.fromAgent) {
    query += ' AND from_agent = ?';
    params.push(filters.fromAgent);
  }
  if (filters?.toAgent) {
    query += ' AND to_agent = ?';
    params.push(filters.toAgent);
  }
  if (filters?.messageType) {
    query += ' AND message_type = ?';
    params.push(filters.messageType);
  }
  if (filters?.topic) {
    query += ' AND topic = ?';
    params.push(filters.topic);
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

export function broadcast(userWallet: string, topic: string, payload: Record<string, unknown>, fromAgent?: string): AcpMessage {
  return sendMessage({
    userWallet,
    fromAgent,
    messageType: 'broadcast',
    topic,
    payload,
  });
}

// Stats
export function getAcpStats(userWallet: string): {
  totalAgents: number;
  onlineAgents: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
} {
  const db = getDatabase();

  const agentStmt = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online
    FROM acp_agents WHERE user_wallet = ?
  `);
  const agentRow = agentStmt.get(userWallet) as { total: number; online: number };

  const taskStmt = db.prepare(`
    SELECT status, COUNT(*) as count FROM acp_tasks WHERE user_wallet = ? GROUP BY status
  `);
  const taskRows = taskStmt.all(userWallet) as { status: string; count: number }[];

  const taskCounts: Record<string, number> = {};
  for (const row of taskRows) {
    taskCounts[row.status] = row.count;
  }

  return {
    totalAgents: agentRow.total,
    onlineAgents: agentRow.online || 0,
    pendingTasks: taskCounts.pending || 0,
    runningTasks: taskCounts.running || 0,
    completedTasks: taskCounts.completed || 0,
    failedTasks: taskCounts.failed || 0,
  };
}
