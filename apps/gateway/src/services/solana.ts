/**
 * Solana Integration Service
 *
 * Provides SOL/USDC transfers, escrow operations, and balance checks.
 * Adapted from osint-market for the gateway.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';

// Check if simulation mode is explicitly enabled
function isSimulationMode(): boolean {
  return process.env.SOLANA_SIMULATION_MODE === 'true';
}

// SECURITY: Warn loudly if simulation mode is enabled in production
if (process.env.NODE_ENV === 'production' && isSimulationMode()) {
  console.error('================================================================================');
  console.error('FATAL SECURITY WARNING: SOLANA_SIMULATION_MODE=true in production is DANGEROUS');
  console.error('This allows fake transactions to be accepted as valid.');
  console.error('Set SOLANA_SIMULATION_MODE=false for production deployments.');
  console.error('================================================================================');
}

// Helper to get required env or throw
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Helper to convert SOL to lamports avoiding floating point errors
function solToLamports(sol: number): bigint {
  // Use string conversion to avoid floating point errors
  const solStr = sol.toFixed(9);
  const [whole, decimal = ''] = solStr.split('.');
  const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);
  return BigInt(whole + paddedDecimal);
}

// Constants - require env vars in production, allow fallback in dev
function getWalletAddress(envKey: string, fallback: string): PublicKey {
  const address = process.env[envKey];
  if (!address && process.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} is required in production`);
  }
  return new PublicKey(address || fallback);
}

export const ESCROW_WALLET = getWalletAddress('ESCROW_WALLET_ADDRESS', 'EwwpAe2XkBbMAftrX9m1PEu3mEnL6Gordc49EWKRURau');
export const TREASURY_WALLET = getWalletAddress('TREASURY_WALLET_ADDRESS', '7G7co8fLDdddRNbFwPWH9gots93qB4EXPwBoshd3x2va');

export const CREATION_FEE_PERCENT = 0.025; // 2.5%
export const PAYOUT_FEE_PERCENT = 0.025;   // 2.5%
export const MIN_BOUNTY_SOL = 0.1;

// USDC on mainnet
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Get Solana connection
export function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

// Get escrow keypair from env (for signing transactions)
// In production, use a secure key management solution
function getEscrowKeypair(): Keypair | null {
  const secretKey = process.env.ESCROW_PRIVATE_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production' && !isSimulationMode()) {
      throw new Error(
        'ESCROW_PRIVATE_KEY required in production. Set SOLANA_SIMULATION_MODE=true for testing.'
      );
    }
    console.warn('[SIMULATION] ESCROW_PRIVATE_KEY not set - using simulation mode');
    return null;
  }
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// Get SOL balance
export async function getSolBalance(wallet: string): Promise<number> {
  const connection = getConnection();
  const publicKey = new PublicKey(wallet);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

// Get USDC balance
export async function getUsdcBalance(wallet: string): Promise<number> {
  const connection = getConnection();
  const publicKey = new PublicKey(wallet);

  try {
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
    const account = await getAccount(connection, tokenAccount);
    return Number(account.amount) / 1_000_000; // USDC has 6 decimals
  } catch (error: any) {
    // Token account doesn't exist = 0 balance (common case)
    if (error?.message?.includes('could not find account') ||
        error?.message?.includes('TokenAccountNotFoundError')) {
      return 0;
    }
    // Log unexpected errors
    console.error('[Solana] Error getting USDC balance:', error?.message || error);
    return 0;
  }
}

// Calculate fee amounts
export function calculateFees(amount: number, feePercent: number = CREATION_FEE_PERCENT): {
  feeAmount: number;
  netAmount: number;
} {
  const feeAmount = amount * feePercent;
  const netAmount = amount - feeAmount;
  return { feeAmount, netAmount };
}

// Create transfer instruction for SOL
export function createSolTransferInstruction(
  from: PublicKey,
  to: PublicKey,
  amount: number
): ReturnType<typeof SystemProgram.transfer> {
  // Use safe conversion to avoid floating point errors
  const lamports = Number(solToLamports(amount));

  return SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports,
  });
}

// Transfer SOL from escrow to recipient
export async function transferSolFromEscrow(
  recipient: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const escrowKeypair = getEscrowKeypair();

  if (!escrowKeypair) {
    // Simulation mode - only allowed with explicit flag
    if (!isSimulationMode()) {
      return {
        success: false,
        error: 'Cannot transfer: ESCROW_PRIVATE_KEY not configured and SOLANA_SIMULATION_MODE is not enabled'
      };
    }
    console.warn(`[SIMULATION] Transfer ${amount} SOL to ${recipient}`);
    return {
      success: true,
      signature: `simulated_${Date.now()}_${Math.random().toString(36).slice(2)}`
    };
  }

  try {
    const connection = getConnection();
    const recipientPubkey = new PublicKey(recipient);

    const transaction = new Transaction().add(
      createSolTransferInstruction(escrowKeypair.publicKey, recipientPubkey, amount)
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [escrowKeypair]);

    return { success: true, signature };
  } catch (error: any) {
    console.error('SOL transfer error:', error);
    return { success: false, error: error.message };
  }
}

// Transfer fee from escrow to treasury wallet
export async function transferFeeToTreasury(
  amount: number,
  token: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  // Skip if treasury is same as escrow (backwards compat)
  if (TREASURY_WALLET.equals(ESCROW_WALLET)) {
    console.log(`[SKIP] Treasury == Escrow, fee stays in place`);
    return { success: true, signature: 'fee_retained_in_escrow' };
  }

  // Transfer fee to treasury
  return transferFromEscrow(TREASURY_WALLET.toBase58(), amount, token);
}

// Transfer USDC from escrow to recipient
export async function transferUsdcFromEscrow(
  recipient: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const escrowKeypair = getEscrowKeypair();

  if (!escrowKeypair) {
    // Simulation mode - only allowed with explicit flag
    if (!isSimulationMode()) {
      return {
        success: false,
        error: 'Cannot transfer: ESCROW_PRIVATE_KEY not configured and SOLANA_SIMULATION_MODE is not enabled'
      };
    }
    console.warn(`[SIMULATION] Transfer ${amount} USDC to ${recipient}`);
    return {
      success: true,
      signature: `simulated_usdc_${Date.now()}_${Math.random().toString(36).slice(2)}`
    };
  }

  try {
    const connection = getConnection();
    const recipientPubkey = new PublicKey(recipient);

    // Get token accounts
    const escrowTokenAccount = await getAssociatedTokenAddress(USDC_MINT, escrowKeypair.publicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(USDC_MINT, recipientPubkey);

    const transaction = new Transaction().add(
      createTransferInstruction(
        escrowTokenAccount,
        recipientTokenAccount,
        escrowKeypair.publicKey,
        Math.floor(amount * 1_000_000) // USDC has 6 decimals
      )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [escrowKeypair]);

    return { success: true, signature };
  } catch (error: any) {
    console.error('USDC transfer error:', error);
    return { success: false, error: error.message };
  }
}

// Generic transfer from escrow (supports SOL, USDC, and simulates others)
export async function transferFromEscrow(
  recipient: string,
  amount: number,
  token: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (token === 'USDC') {
    return transferUsdcFromEscrow(recipient, amount);
  }
  if (token === 'SOL') {
    return transferSolFromEscrow(recipient, amount);
  }
  // Simulate transfer for other tokens (META, ORE, etc.) - only in simulation mode
  if (!isSimulationMode()) {
    return {
      success: false,
      error: `Token ${token} transfers not supported. Only SOL and USDC are supported in production.`
    };
  }
  console.warn(`[SIMULATION] Transfer ${amount} ${token} to ${recipient}`);
  return {
    success: true,
    signature: `simulated_${token.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2)}`
  };
}

// Verify a SOL deposit was made to escrow
export async function verifyDeposit(
  signature: string,
  expectedFrom: string,
  expectedAmount: number
): Promise<{ verified: boolean; actualAmount?: number; error?: string; isSimulated?: boolean }> {
  // SECURITY: Only accept simulated_ signatures when SOLANA_SIMULATION_MODE is explicitly enabled
  if (signature.startsWith('simulated_')) {
    if (!isSimulationMode()) {
      return {
        verified: false,
        error: 'Invalid signature: simulated_ prefix only allowed when SOLANA_SIMULATION_MODE=true'
      };
    }
    console.warn('[SIMULATION] Accepting simulated deposit signature');
    return { verified: true, actualAmount: expectedAmount, isSimulated: true };
  }

  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Check transaction was successful
    if (tx.meta.err) {
      return { verified: false, error: 'Transaction failed' };
    }

    // Verify the transfer (simplified check)
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    // Get escrow account index (deposits go to ESCROW_WALLET)
    const accountKeys = tx.transaction.message.getAccountKeys();
    let escrowIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys.get(i)?.equals(ESCROW_WALLET)) {
        escrowIndex = i;
        break;
      }
    }

    if (escrowIndex === -1) {
      return { verified: false, error: 'Escrow wallet not in transaction' };
    }

    const amountReceived = (postBalances[escrowIndex] - preBalances[escrowIndex]) / LAMPORTS_PER_SOL;

    // Allow small variance for fees
    if (amountReceived >= expectedAmount * 0.99) {
      return { verified: true, actualAmount: amountReceived };
    }

    return { verified: false, error: `Expected ${expectedAmount} SOL, got ${amountReceived}` };
  } catch (error: any) {
    console.error('Deposit verification error:', error);
    return { verified: false, error: error.message };
  }
}

// Generate escrow deposit instructions for frontend
export function generateDepositInstructions(
  amount: number,
  token: 'SOL' | 'USDC'
): {
  recipient: string;
  amount: number;
  token: string;
  memo: string;
} {
  const { feeAmount, netAmount } = calculateFees(amount, CREATION_FEE_PERCENT);

  return {
    recipient: ESCROW_WALLET.toBase58(), // Deposits go to escrow, fees route to treasury on payout
    amount: amount, // User sends full amount, fee taken on deposit
    token,
    memo: `Trading platform bounty deposit (${netAmount} net after ${feeAmount} fee)`,
  };
}

// Validate a Solana wallet address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
