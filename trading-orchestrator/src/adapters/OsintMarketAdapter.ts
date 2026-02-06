/**
 * OsintMarketAdapter - Integrates OSINT.market bounty system
 *
 * Features from OSINT Market:
 * - Bounty creation and management
 * - Claude Opus evaluation
 * - Escrow system (SOL/USDC)
 * - Reputation and badges
 * - Dispute resolution
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import type {
  AdapterConfig,
  AdapterHealth,
  OsintBounty,
  OsintSubmission,
  OsintResolution,
} from './types.js';

export interface OsintMarketAdapterConfig extends AdapterConfig {
  walletAddress?: string;
}

export class OsintMarketAdapter extends EventEmitter {
  private client: AxiosInstance;
  private config: OsintMarketAdapterConfig;
  private health: AdapterHealth = { healthy: false, lastChecked: 0 };

  constructor(config: OsintMarketAdapterConfig) {
    super();
    this.config = {
      timeout: 30000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });
  }

  // ==================== Bounty Management ====================

  /**
   * Get list of bounties
   */
  async getBounties(params?: {
    status?: 'open' | 'claimed' | 'submitted' | 'resolved' | 'expired';
    difficulty?: 'easy' | 'medium' | 'hard';
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    bounties: OsintBounty[];
    total: number;
  }> {
    try {
      const response = await this.client.get('/api/bounties', { params });
      return {
        bounties: response.data.bounties || response.data,
        total: response.data.total || response.data.length,
      };
    } catch (error) {
      return { bounties: [], total: 0 };
    }
  }

  /**
   * Get bounty by ID
   */
  async getBounty(bountyId: string): Promise<OsintBounty | null> {
    try {
      const response = await this.client.get(`/api/bounties/${bountyId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new bounty
   */
  async createBounty(params: {
    question: string;
    description?: string;
    reward: {
      token: 'SOL' | 'USDC';
      amount: number;
    };
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    deadline: number;
    signature: string;
  }): Promise<{
    success: boolean;
    bountyId?: string;
    depositInstructions?: {
      address: string;
      amount: number;
      token: string;
    };
    error?: string;
  }> {
    try {
      const response = await this.client.post('/api/bounties', {
        ...params,
        poster_wallet: this.config.walletAddress,
      });
      return {
        success: true,
        bountyId: response.data.id,
        depositInstructions: response.data.depositInstructions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Confirm bounty deposit
   */
  async confirmDeposit(
    bountyId: string,
    txSignature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.post(`/api/bounties/${bountyId}/deposit`, {
        tx_signature: txSignature,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Claiming & Submission ====================

  /**
   * Claim a bounty
   */
  async claimBounty(
    bountyId: string,
    signature: string
  ): Promise<{
    success: boolean;
    claimExpiresAt?: number;
    error?: string;
  }> {
    try {
      const response = await this.client.post(`/api/bounties/${bountyId}/claim`, {
        agent_wallet: this.config.walletAddress,
        signature,
      });
      this.emit('bounty_claimed', { bountyId, wallet: this.config.walletAddress });
      return {
        success: true,
        claimExpiresAt: response.data.claim_expires_at,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit findings for a bounty
   */
  async submitFindings(
    bountyId: string,
    submission: OsintSubmission
  ): Promise<{
    success: boolean;
    submissionId?: string;
    error?: string;
  }> {
    try {
      const response = await this.client.post(`/api/bounties/${bountyId}/submit`, {
        ...submission,
        agent_wallet: this.config.walletAddress,
      });
      this.emit('submission_created', { bountyId, submissionId: response.data.id });
      return {
        success: true,
        submissionId: response.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Forfeit a claimed bounty
   */
  async forfeitBounty(
    bountyId: string,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.post(`/api/bounties/${bountyId}/forfeit`, {
        agent_wallet: this.config.walletAddress,
        signature,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Resolution ====================

  /**
   * Get resolution for a bounty
   */
  async getResolution(bountyId: string): Promise<OsintResolution | null> {
    try {
      const response = await this.client.get(`/api/bounties/${bountyId}/resolution`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Dispute a resolution
   */
  async disputeResolution(
    bountyId: string,
    params: {
      reason: string;
      evidence?: string[];
      signature: string;
    }
  ): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const response = await this.client.post(`/api/bounties/${bountyId}/dispute`, {
        ...params,
        wallet: this.config.walletAddress,
      });
      return {
        success: true,
        disputeId: response.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Reputation ====================

  /**
   * Get hunter reputation
   */
  async getReputation(walletAddress?: string): Promise<{
    wallet: string;
    totalBounties: number;
    successfulBounties: number;
    failedBounties: number;
    totalEarnings: number;
    successRate: number;
    rank: 'Novice' | 'Hunter' | 'Expert' | 'Elite' | 'Legend';
    badges: Array<{
      type: string;
      earnedAt: number;
    }>;
  } | null> {
    const wallet = walletAddress || this.config.walletAddress;
    if (!wallet) return null;

    try {
      const response = await this.client.get(`/api/reputation/${wallet}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    limit = 20
  ): Promise<
    Array<{
      wallet: string;
      totalEarnings: number;
      successRate: number;
      rank: string;
      totalBounties: number;
    }>
  > {
    try {
      const response = await this.client.get('/api/reputation/leaderboard', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  // ==================== Agent Instructions ====================

  /**
   * Get agent instructions (API documentation)
   */
  async getAgentInstructions(): Promise<{
    quickstart: string[];
    apiReference: Record<string, unknown>;
    osintTips: string[];
    rules: string[];
  } | null> {
    try {
      const response = await this.client.get('/agent-instructions');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get machine-readable agent spec
   */
  async getAgentSpec(): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.client.get('/.well-known/agent.json');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // ==================== Stats ====================

  /**
   * Get platform stats
   */
  async getStats(): Promise<{
    totalBounties: number;
    openBounties: number;
    totalPaidOut: number;
    avgResolutionTime: number;
    activeHunters: number;
  }> {
    try {
      const response = await this.client.get('/api/stats');
      return response.data;
    } catch (error) {
      return {
        totalBounties: 0,
        openBounties: 0,
        totalPaidOut: 0,
        avgResolutionTime: 0,
        activeHunters: 0,
      };
    }
  }

  // ==================== Health ====================

  async checkHealth(): Promise<AdapterHealth> {
    const startTime = Date.now();
    try {
      await this.client.get('/api/health');
      this.health = {
        healthy: true,
        latencyMs: Date.now() - startTime,
        lastChecked: Date.now(),
      };
    } catch (error) {
      this.health = {
        healthy: false,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
    return this.health;
  }

  isHealthy(): boolean {
    return this.health.healthy;
  }

  /**
   * Set wallet address for authenticated requests
   */
  setWalletAddress(address: string): void {
    this.config.walletAddress = address;
  }
}
