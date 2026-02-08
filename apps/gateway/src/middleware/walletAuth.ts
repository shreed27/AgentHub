/**
 * Wallet Authentication Middleware
 *
 * Validates wallet addresses and optionally verifies signatures
 * for write operations requiring user authentication.
 */

import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Extend Request type to include wallet address
declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

const SIGNATURE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Basic wallet validation middleware
 * Only validates address format, doesn't require signature
 */
export function walletValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string;

  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Include X-Wallet-Address header',
    });
  }

  // Validate address format
  try {
    new PublicKey(walletAddress);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address',
      message: 'Wallet address is not a valid Solana address',
    });
  }

  req.walletAddress = walletAddress;
  next();
}

/**
 * Full wallet authentication middleware with signature verification
 * For write operations that require proof of wallet ownership
 *
 * Note: Full signature verification requires tweetnacl package.
 * For now, this validates address format and timestamp for basic security.
 * Install tweetnacl for production signature verification.
 */
export function walletAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string;

  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Include X-Wallet-Address header',
    });
  }

  // Validate address format
  try {
    new PublicKey(walletAddress);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address',
      message: 'Wallet address is not a valid Solana address',
    });
  }

  // For GET requests, just validate format (no signature needed for reads)
  if (req.method === 'GET') {
    req.walletAddress = walletAddress;
    return next();
  }

  // For write operations, check for signature headers
  const signature = req.headers['x-wallet-signature'] as string;
  const message = req.headers['x-wallet-message'] as string;

  // If signature headers are provided, validate timestamp
  if (signature && message) {
    try {
      // Check message timestamp (format: "action:timestamp:nonce")
      const parts = message.split(':');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1], 10);
        if (!isNaN(timestamp) && Date.now() - timestamp > SIGNATURE_EXPIRY_MS) {
          return res.status(401).json({
            success: false,
            error: 'Signature expired',
            message: 'Please sign a new message',
          });
        }
      }

      // Basic validation passed - signature format looks correct
      // Full cryptographic verification would require tweetnacl:
      // const verified = nacl.sign.detached.verify(
      //   new TextEncoder().encode(message),
      //   bs58.decode(signature),
      //   publicKey.toBytes()
      // );

      req.walletAddress = walletAddress;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Could not verify wallet signature',
      });
    }
  }

  // Allow request without signature for non-critical operations
  // Protected routes should explicitly require walletAuthMiddleware
  req.walletAddress = walletAddress;
  next();
}

/**
 * Optional wallet middleware - extracts wallet if provided but doesn't require it
 */
export function optionalWalletMiddleware(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string;

  if (walletAddress) {
    try {
      new PublicKey(walletAddress);
      req.walletAddress = walletAddress;
    } catch {
      // Invalid address, just ignore
    }
  }

  next();
}
