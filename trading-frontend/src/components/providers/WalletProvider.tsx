"use client";

import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletError } from "@solana/wallet-adapter-base";
import { CustomWalletModalProvider } from "./CustomWalletModalProvider";

interface SolanaWalletProviderProps {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted before rendering wallet components (SSR fix)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to mainnet-beta, can be configured via env
  const endpoint = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    return rpcUrl || clusterApiUrl("mainnet-beta");
  }, []);

  // Connection config for better reliability
  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed" as const,
      wsEndpoint: undefined, // Disable WebSocket to avoid connection issues
    }),
    []
  );

  // Configure supported wallets
  // Only include Phantom and Solflare - they have native Solana support
  // MetaMask doesn't natively support Solana (only via Snaps which is experimental)
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Error handler for wallet connection issues
  const onError = useCallback((error: WalletError) => {
    console.error("[Wallet Error]", error);

    // Provide user-friendly error messages
    if (error.name === "WalletNotReadyError") {
      console.warn("Wallet extension not installed or not ready. Please install Phantom or Solflare.");
    } else if (error.name === "WalletConnectionError") {
      console.warn("Failed to connect to wallet. Please try again.");
    } else if (error.name === "WalletDisconnectedError") {
      console.warn("Wallet disconnected.");
    }
  }, []);

  // Don't render wallet providers until mounted (prevents SSR hydration issues)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onError}
      >
        <CustomWalletModalProvider>{children}</CustomWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
