/**
 * Wallet Authentication for Solana
 *
 * Provides wallet signature verification for authentication.
 * Uses tweetnacl for Ed25519 signature verification.
 */

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify a Solana wallet signature
 *
 * The message format is: "Sign this message to authenticate with Trading Platform\nNonce: {nonce}\nTimestamp: {timestamp}"
 */
export function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate an authentication message with nonce
 */
export function generateAuthMessage(nonce: string, appName: string = 'Trading Platform'): string {
  const timestamp = Date.now();
  return `Sign this message to authenticate with ${appName}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Verify the message format and timestamp (within 5 minutes)
 */
export function validateAuthMessage(message: string, expectedAppName: string = 'Trading Platform'): { valid: boolean; error?: string } {
  const lines = message.split('\n');

  if (lines.length < 3) {
    return { valid: false, error: 'Invalid message format' };
  }

  if (!lines[0].includes(expectedAppName)) {
    return { valid: false, error: 'Invalid message prefix' };
  }

  const timestampLine = lines.find(l => l.startsWith('Timestamp:'));
  if (!timestampLine) {
    return { valid: false, error: 'Missing timestamp' };
  }

  const timestamp = parseInt(timestampLine.replace('Timestamp:', '').trim());
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (isNaN(timestamp) || Math.abs(now - timestamp) > fiveMinutes) {
    return { valid: false, error: 'Message expired or invalid timestamp' };
  }

  return { valid: true };
}

/**
 * Full authentication verification
 */
export function authenticate(
  walletAddress: string,
  message: string,
  signature: string,
  appName?: string
): { authenticated: boolean; error?: string } {
  // Validate message format
  const messageValidation = validateAuthMessage(message, appName);
  if (!messageValidation.valid) {
    return { authenticated: false, error: messageValidation.error };
  }

  // Verify signature
  const isValid = verifySignature(walletAddress, message, signature);
  if (!isValid) {
    return { authenticated: false, error: 'Invalid signature' };
  }

  return { authenticated: true };
}

/**
 * Validate a Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncate a wallet address for display
 */
export function truncateAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
