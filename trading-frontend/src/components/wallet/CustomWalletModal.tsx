"use client";

import { FC, useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { X, Wallet, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface CustomWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  downloadUrl: string;
  checkInstalled: () => boolean;
}

const WALLETS: WalletInfo[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
    downloadUrl: "https://metamask.io/download/",
    checkInstalled: () => !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "https://phantom.app/img/phantom-logo.svg",
    downloadUrl: "https://phantom.app/download",
    checkInstalled: () => !!(window as any).phantom?.ethereum,
  },
  {
    id: "brave",
    name: "Brave Wallet",
    icon: "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
    downloadUrl: "https://brave.com/wallet/",
    checkInstalled: () => !!(window as any).ethereum?.isBraveWallet,
  },
];

export const CustomWalletModal: FC<CustomWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const [installedWallets, setInstalledWallets] = useState<Record<string, boolean>>({});
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  // Check which wallets are installed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const installed: Record<string, boolean> = {};
      WALLETS.forEach((wallet) => {
        installed[wallet.id] = wallet.checkInstalled();
      });
      // Also check if any ethereum provider exists
      if ((window as any).ethereum) {
        installed["metamask"] = true; // Generic fallback
      }
      setInstalledWallets(installed);
    }
  }, [isOpen]);

  // Close modal when connected
  useEffect(() => {
    if (isConnected) {
      setConnectingWallet(null);
      onClose();
    }
  }, [isConnected, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConnectingWallet(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (walletId: string) => {
    const connector = connectors[0]; // injected connector
    if (connector) {
      setConnectingWallet(walletId);
      try {
        await connect({ connector });
      } catch (e) {
        setConnectingWallet(null);
      }
    }
  };

  const handleInstall = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasAnyWallet = Object.values(installedWallets).some(Boolean);

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
          <h2 className="text-lg font-semibold">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-2">
          {WALLETS.map((wallet) => {
            const isInstalled = installedWallets[wallet.id];
            const isConnecting = connectingWallet === wallet.id;
            const showLoading = isConnecting || (isPending && connectingWallet === wallet.id);

            return (
              <button
                key={wallet.id}
                onClick={() =>
                  isInstalled ? handleConnect(wallet.id) : handleInstall(wallet.downloadUrl)
                }
                disabled={showLoading}
                className="flex items-center w-full p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {/* Wallet Icon */}
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mr-3 overflow-hidden">
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="w-6 h-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Wallet Name */}
                <div className="flex-1 text-left">
                  <span className="font-medium">{wallet.name}</span>
                  {showLoading && (
                    <p className="text-xs text-muted-foreground">Check wallet popup...</p>
                  )}
                </div>

                {/* Status */}
                {showLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : isInstalled ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                    Detected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    Install <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error.message}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-accent/20">
          <p className="text-xs text-center text-muted-foreground">
            {connectingWallet
              ? "Approve the connection in your wallet..."
              : hasAnyWallet
              ? "Select a wallet to connect"
              : "Install a wallet to get started"}
          </p>
        </div>
      </div>
    </div>
  );
};
