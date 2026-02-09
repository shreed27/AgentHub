"use client";

import { FC, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { X, ExternalLink, Wallet } from "lucide-react";

interface CustomWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Only allow these specific Solana wallets
const ALLOWED_WALLETS = ["Phantom", "Solflare", "Backpack", "Glow"];

export const CustomWalletModal: FC<CustomWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallets, select, connecting } = useWallet();

  // Filter to only show properly supported Solana wallets
  const filteredWallets = useMemo(() => {
    const seen = new Set<string>();
    return wallets
      .filter((wallet) => {
        const name = wallet.adapter.name;
        // Only allow specific Solana wallets
        if (!ALLOWED_WALLETS.some((allowed) => name.includes(allowed))) {
          return false;
        }
        // Avoid duplicates
        if (seen.has(name)) {
          return false;
        }
        seen.add(name);
        return true;
      })
      .sort((a, b) => {
        // Sort installed wallets first
        const aInstalled = a.readyState === WalletReadyState.Installed;
        const bInstalled = b.readyState === WalletReadyState.Installed;
        if (aInstalled && !bInstalled) return -1;
        if (!aInstalled && bInstalled) return 1;
        return 0;
      });
  }, [wallets]);

  const handleWalletClick = useCallback(
    async (walletName: string, readyState: WalletReadyState) => {
      // Only connect if wallet is actually installed
      if (
        readyState === WalletReadyState.Installed ||
        readyState === WalletReadyState.Loadable
      ) {
        try {
          select(walletName as any);
          onClose();
        } catch (error) {
          console.error("Failed to select wallet:", error);
        }
      } else if (readyState === WalletReadyState.NotDetected) {
        // Open wallet website for download
        const urls: Record<string, string> = {
          Phantom: "https://phantom.app/",
          Solflare: "https://solflare.com/",
          Backpack: "https://backpack.app/",
          Glow: "https://glow.app/",
        };
        const url = urls[walletName];
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    },
    [select, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Connect a wallet on Solana</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          {filteredWallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Solana wallets detected</p>
              <p className="text-sm mt-1">
                Please install{" "}
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Phantom
                </a>{" "}
                or{" "}
                <a
                  href="https://solflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Solflare
                </a>
              </p>
            </div>
          ) : (
            filteredWallets.map((wallet) => {
              const isInstalled =
                wallet.readyState === WalletReadyState.Installed ||
                wallet.readyState === WalletReadyState.Loadable;

              return (
                <button
                  key={wallet.adapter.name}
                  onClick={() =>
                    handleWalletClick(wallet.adapter.name, wallet.readyState)
                  }
                  disabled={connecting}
                  className="flex items-center w-full p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-all group disabled:opacity-50"
                >
                  {/* Wallet Icon */}
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mr-3 overflow-hidden">
                    {wallet.adapter.icon ? (
                      <img
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        className="w-7 h-7"
                      />
                    ) : (
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Wallet Name */}
                  <span className="flex-1 text-left font-medium">
                    {wallet.adapter.name}
                  </span>

                  {/* Status Badge */}
                  {isInstalled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      Detected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                      Install
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-accent/20">
          <p className="text-xs text-center text-muted-foreground">
            By connecting, you agree to the Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};
