import axios, { AxiosInstance } from 'axios';
import type { ServiceConfig } from '../types.js';

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

export class ServiceRegistry {
  public readonly config: ServiceConfig;
  private clients: Map<string, AxiosInstance> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();

  constructor(config: ServiceConfig) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients(): void {
    // CloddsBot client
    this.clients.set('cloddsbot', axios.create({
      baseURL: this.config.cloddsbotUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));

    // AgentDEX client
    this.clients.set('agent-dex', axios.create({
      baseURL: this.config.agentDexUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));

    // Opus-X client
    this.clients.set('opus-x', axios.create({
      baseURL: this.config.opusXUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));

    // OpenClaw client
    this.clients.set('openclaw', axios.create({
      baseURL: this.config.openclawUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));

    // OSINT Market client
    this.clients.set('osint-market', axios.create({
      baseURL: this.config.osintMarketUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));

    // ClawdNet client
    this.clients.set('clawdnet', axios.create({
      baseURL: this.config.clawdnetUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }));
  }

  getClient(serviceName: string): AxiosInstance {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    return client;
  }

  async checkHealth(serviceName: string): Promise<ServiceHealth> {
    const client = this.clients.get(serviceName);
    const urlMap: Record<string, string> = {
      'cloddsbot': this.config.cloddsbotUrl,
      'agent-dex': this.config.agentDexUrl,
      'opus-x': this.config.opusXUrl,
      'openclaw': this.config.openclawUrl,
      'osint-market': this.config.osintMarketUrl,
      'clawdnet': this.config.clawdnetUrl,
    };

    const healthEndpoints: Record<string, string> = {
      'cloddsbot': '/health',
      'agent-dex': '/api/v1/health',
      'opus-x': '/api/health',
      'openclaw': '/health',
      'osint-market': '/api/health',
      'clawdnet': '/health',
    };

    if (!client) {
      return {
        name: serviceName,
        url: urlMap[serviceName] || 'unknown',
        healthy: false,
        lastChecked: Date.now(),
        error: 'Service not configured',
      };
    }

    const startTime = Date.now();
    try {
      await client.get(healthEndpoints[serviceName] || '/health');
      const latencyMs = Date.now() - startTime;

      const health: ServiceHealth = {
        name: serviceName,
        url: urlMap[serviceName],
        healthy: true,
        lastChecked: Date.now(),
        latencyMs,
      };

      this.healthStatus.set(serviceName, health);
      return health;
    } catch (error) {
      const health: ServiceHealth = {
        name: serviceName,
        url: urlMap[serviceName],
        healthy: false,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.healthStatus.set(serviceName, health);
      return health;
    }
  }

  async checkAllHealth(): Promise<ServiceHealth[]> {
    const services = ['cloddsbot', 'agent-dex', 'opus-x', 'openclaw', 'osint-market', 'clawdnet'];
    const results = await Promise.all(services.map(s => this.checkHealth(s)));
    return results;
  }

  getHealthStatus(): Map<string, ServiceHealth> {
    return this.healthStatus;
  }

  isServiceHealthy(serviceName: string): boolean {
    const health = this.healthStatus.get(serviceName);
    return health?.healthy ?? false;
  }
}
