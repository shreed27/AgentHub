"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { setWalletContext } from "@/lib/api";

/**
 * Syncs MetaMask wallet state to the API client's wallet context.
 * This ensures the X-Wallet-Address header is sent with API requests.
 */
export function WalletContextSync() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      setWalletContext({
        publicKey: address,
        signMessage: async () => new Uint8Array(), // Placeholder
      });
    } else {
      setWalletContext(null);
    }
  }, [isConnected, address]);

  return null;
}
