"use client";

import { useAccount } from "wagmi";

/**
 * Compatibility hook that provides Solana wallet adapter-like interface
 * but uses wagmi's EVM wallet connection.
 * This allows components written for Solana to work with EVM wallets.
 */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();

  return {
    // Provide a mock publicKey object with toBase58() for compatibility
    publicKey: address ? {
      toBase58: () => address,
      toString: () => address,
    } : null,
    connected: isConnected,
    connecting: isConnecting,
    disconnect: () => {}, // No-op for now
    select: () => {}, // No-op for now
    wallet: null,
    wallets: [],
    signMessage: async () => new Uint8Array(),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
}

// Type for Solana connection - null means not connected to Solana RPC
type SolanaConnection = {
  sendRawTransaction: (tx: Uint8Array, options?: { skipPreflight?: boolean; maxRetries?: number }) => Promise<string>;
  getLatestBlockhash: () => Promise<{ blockhash: string; lastValidBlockHeight: number }>;
  confirmTransaction: (config: { signature: string; blockhash: string; lastValidBlockHeight: number }, commitment?: string) => Promise<unknown>;
} | null;

export function useConnection(): { connection: SolanaConnection } {
  // For EVM compatibility mode, we don't have a Solana connection
  // In a full Solana setup, this would return the actual connection
  return {
    connection: null as SolanaConnection,
  };
}

export default useWallet;
