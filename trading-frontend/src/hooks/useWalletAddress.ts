'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

/**
 * Hook to get the connected wallet address
 * Returns the wallet address if connected, null otherwise
 */
export function useWalletAddress(): string | null {
  const { publicKey, connected } = useWallet();

  return useMemo(() => {
    if (connected && publicKey) {
      return publicKey.toBase58();
    }
    return null;
  }, [connected, publicKey]);
}

/**
 * Hook to check if wallet is connected and require connection for certain features
 */
export function useRequireWallet() {
  const { publicKey, connected, connecting } = useWallet();

  return {
    walletAddress: connected && publicKey ? publicKey.toBase58() : null,
    isConnected: connected,
    isConnecting: connecting,
    requiresConnection: !connected,
  };
}

export default useWalletAddress;
