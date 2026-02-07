"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ExternalLink, TrendingUp, Clock, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGodWallets } from "../hooks/useGodWallets";
import type { TrackerWallet, GodWalletBuy } from "../types";

function WalletAvatar({ wallet, size = "md" }: { wallet: TrackerWallet; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  if (wallet.pfpUrl) {
    return (
      <img
        src={wallet.pfpUrl}
        alt={wallet.label || "Wallet"}
        className={cn(sizeClasses, "rounded-full object-cover")}
      />
    );
  }

  // Generate a deterministic color based on address
  const hash = wallet.address.slice(0, 6);
  const hue = parseInt(hash, 16) % 360;

  return (
    <div
      className={cn(sizeClasses, "rounded-full flex items-center justify-center text-white text-xs font-bold")}
      style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
    >
      {wallet.label?.[0]?.toUpperCase() || wallet.address.slice(0, 2)}
    </div>
  );
}

function TrustScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-orange-400";
  return (
    <span className={cn("text-[10px] font-bold", color)}>
      {score}%
    </span>
  );
}

function BuyItem({ buy }: { buy: GodWalletBuy }) {
  const timeAgo = getTimeAgo(buy.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <WalletAvatar wallet={buy.wallet} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white truncate">
              {buy.wallet.label || truncateAddress(buy.wallet.address)}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-green-400 font-bold">
              BUY
            </span>
            <span className="text-xs text-white font-medium">
              {buy.symbol}
            </span>
            <span className="text-[10px] text-muted-foreground">
              ${buy.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
      {buy.txHash && (
        <a
          href={`https://solscan.io/tx/${buy.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          View TX <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </motion.div>
  );
}

function WalletListItem({ wallet }: { wallet: TrackerWallet }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <WalletAvatar wallet={wallet} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {wallet.label || truncateAddress(wallet.address)}
          </span>
          {wallet.isGodWallet && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-bold">
              GOD
            </span>
          )}
        </div>
        {wallet.twitterHandle && (
          <a
            href={`https://twitter.com/${wallet.twitterHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-400 hover:underline"
          >
            @{wallet.twitterHandle}
          </a>
        )}
      </div>
      <TrustScoreBadge score={wallet.trustScore} />
    </div>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getTimeAgo(timestamp: string | number): string {
  const now = Date.now();
  const time = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function GodWalletPanel() {
  const { godWallets, recentBuys, isLoading, error, refetch } = useGodWallets();
  const [showWallets, setShowWallets] = useState(false);

  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-yellow-900/5 to-transparent backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-yellow-400" />
          God Wallet Tracker
          {godWallets.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({godWallets.length})
            </span>
          )}
        </h3>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {error ? (
          <div className="text-center py-8 text-sm text-red-400">
            {error}
          </div>
        ) : isLoading && recentBuys.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Toggle Wallets List */}
            <button
              onClick={() => setShowWallets(!showWallets)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 mb-4 transition-colors"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {showWallets ? "Hide" : "Show"} Tracked Wallets
              </span>
              {showWallets ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showWallets && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="max-h-48 overflow-auto space-y-1 pr-2">
                    {godWallets.map((wallet) => (
                      <WalletListItem key={wallet.id} wallet={wallet} />
                    ))}
                    {godWallets.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No wallets tracked
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Buys */}
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-muted-foreground">Recent Buys</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            <div className="space-y-2 max-h-64 overflow-auto pr-2">
              {recentBuys.length > 0 ? (
                recentBuys.slice(0, 10).map((buy, index) => (
                  <BuyItem key={`${buy.txHash}-${index}`} buy={buy} />
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No recent buys from god wallets
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GodWalletPanel;
