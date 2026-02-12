"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export const WalletButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR - show placeholder until client mounts
  if (!mounted) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-6 py-3 rounded-lg border border-amber-500/30 text-amber-500/50 font-medium text-sm w-full justify-center"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted: rbMounted,
      }) => {
        const ready = rbMounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-amber-500/60 text-amber-500 font-medium text-sm transition-all hover:bg-amber-500/10 hover:border-amber-500 w-full justify-center"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 font-medium text-sm w-full justify-center"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {account.ensAvatar ? (
                      <img
                        src={account.ensAvatar}
                        alt={account.displayName}
                        className="w-full h-full"
                      />
                    ) : (
                      <Wallet className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {account.displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {account.displayBalance || chain.name}
                    </p>
                  </div>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
