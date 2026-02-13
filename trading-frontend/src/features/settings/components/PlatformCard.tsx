"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Hash,
  Slack,
  Mail,
  TrendingUp,
  Bitcoin,
  Coins,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Unplug,
  Zap,
  Link,
  Target,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Platform, IntegrationStatus, LinkedAccount } from "../types";

interface PlatformCardProps {
  platform: Platform;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
  onTest: () => void;
  isConnecting?: boolean;
  isTesting?: boolean;
  linkedAccount?: LinkedAccount;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: MessageCircle,
  discord: Hash,
  slack: Slack,
  mail: Mail,
  email: Mail,
  chart: BarChart3,
  "trending-up": TrendingUp,
  bitcoin: Bitcoin,
  coins: Coins,
  link: Link,
};

const statusConfig: Record<IntegrationStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  connected: { icon: CheckCircle2, color: "text-emerald-500", label: "ACTIVE_NODE" },
  disconnected: { icon: XCircle, color: "text-zinc-600", label: "OFFLINE" },
  error: { icon: AlertCircle, color: "text-rose-500", label: "LINK_ERROR" },
};

export function PlatformCard({
  platform,
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
  isConnecting,
  isTesting,
  linkedAccount,
}: PlatformCardProps) {
  const Icon = iconMap[platform.icon] || Link;
  const statusInfo = statusConfig[platform.status];
  const StatusIcon = statusInfo.icon;
  const isConnected = platform.connected;

  return (
    <motion.div
      layout
      className={cn(
        "group relative overflow-hidden p-6 rounded-[32px] border transition-all duration-500 bg-surface/30 backdrop-blur-md",
        isConnected
          ? "border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)]"
          : "border-white/[0.04] hover:border-white/[0.1] shadow-lg"
      )}
    >
      {/* Background decoration */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 opacity-10 transition-all duration-700",
        isConnected ? "bg-blue-500 opacity-20" : "bg-white opacity-5 group-hover:opacity-10"
      )} />

      {/* Header Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
            isConnected
              ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
              : "bg-black/40 border-white/5 text-zinc-500 group-hover:border-white/10 group-hover:text-zinc-300"
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono group-hover:text-blue-400 transition-colors">
              {platform.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border",
                platform.category === 'messaging' && 'bg-blue-500/5 border-blue-500/10 text-blue-500/60',
                platform.category === 'exchange' && 'bg-orange-500/5 border-orange-500/10 text-orange-500/60',
                platform.category === 'prediction' && 'bg-purple-500/5 border-purple-500/10 text-purple-500/60'
              )}>
                {platform.category}
              </span>
              {linkedAccount && (
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[100px]">
                  @{linkedAccount.username || linkedAccount.userId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={cn("flex items-center gap-1.5 text-[9px] font-black font-mono tracking-widest", statusInfo.color)}>
          <div className={cn("w-1 h-1 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-current")} />
          {statusInfo.label}
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8 leading-relaxed min-h-[32px] line-clamp-2">
        {platform.description}
      </p>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-6 border-t border-white/[0.04] group-hover:border-white/[0.08] transition-colors">
        {isConnected ? (
          <>
            <button
              onClick={onConfigure}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              CONFIG
            </button>
            <button
              onClick={onTest}
              disabled={isTesting}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onDisconnect}
              className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-rose-500/10 hover:text-rose-500 text-zinc-600 transition-all border border-transparent hover:border-rose-500/20"
            >
              <Unplug className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-500 text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                INITIATING...
              </>
            ) : (
              <>
                <Link className="w-4 h-4 text-black" />
                LINK_NODE
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
