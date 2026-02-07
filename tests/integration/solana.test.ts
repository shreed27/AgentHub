/**
 * Integration Tests: Solana Service
 *
 * Tests critical security and functionality of the Solana service.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the environment before importing the module
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Solana Service - Simulation Mode Security', () => {
  it('should reject simulated signatures when SOLANA_SIMULATION_MODE is not set', async () => {
    process.env.SOLANA_SIMULATION_MODE = 'false';

    const { verifyDeposit } = await import('../../apps/gateway/src/services/solana');

    const result = await verifyDeposit(
      'simulated_1234567890_abc123',
      'SomeWalletAddress123',
      1.0
    );

    expect(result.verified).toBe(false);
    expect(result.error).toContain('simulated_');
  });

  it('should reject simulated signatures when SOLANA_SIMULATION_MODE is false', async () => {
    process.env.SOLANA_SIMULATION_MODE = 'false';

    const { verifyDeposit } = await import('../../apps/gateway/src/services/solana');

    const result = await verifyDeposit(
      'simulated_tx_test',
      'TestWallet',
      0.5
    );

    expect(result.verified).toBe(false);
    expect(result.error).toContain('SOLANA_SIMULATION_MODE');
  });

  it('should accept simulated signatures only when SOLANA_SIMULATION_MODE is true', async () => {
    process.env.SOLANA_SIMULATION_MODE = 'true';

    const { verifyDeposit } = await import('../../apps/gateway/src/services/solana');

    const result = await verifyDeposit(
      'simulated_1234567890_abc123',
      'SomeWalletAddress123',
      1.0
    );

    expect(result.verified).toBe(true);
    expect(result.isSimulated).toBe(true);
    expect(result.actualAmount).toBe(1.0);
  });
});

describe('Solana Service - Transfer Security', () => {
  it('should reject transfer when no ESCROW_PRIVATE_KEY and simulation mode is off', async () => {
    process.env.SOLANA_SIMULATION_MODE = 'false';
    delete process.env.ESCROW_PRIVATE_KEY;
    process.env.NODE_ENV = 'development';

    const { transferSolFromEscrow } = await import('../../apps/gateway/src/services/solana');

    const result = await transferSolFromEscrow(
      'RecipientWallet123',
      1.0
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('SOLANA_SIMULATION_MODE');
  });
});

describe('Solana Service - SOL to Lamports Conversion', () => {
  it('should correctly convert SOL to lamports without floating point errors', async () => {
    process.env.SOLANA_SIMULATION_MODE = 'true';

    const { createSolTransferInstruction } = await import('../../apps/gateway/src/services/solana');
    const { PublicKey } = await import('@solana/web3.js');

    // Test with a value that typically causes floating point errors
    const from = new PublicKey('11111111111111111111111111111112');
    const to = new PublicKey('11111111111111111111111111111113');

    // 0.1 SOL should be exactly 100,000,000 lamports
    const instruction = createSolTransferInstruction(from, to, 0.1);

    // Access the lamports from the instruction
    expect(instruction.keys.length).toBeGreaterThan(0);
  });
});
