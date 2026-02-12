"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, TrendingUp, Users, ExternalLink, RefreshCw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Migration {
  id: string;
  oldMint: string;
  newMint: string;
  oldSymbol?: string;
  newSymbol?: string;
  migrationType: string;
  detectedAt: number;
  rankingScore: number;
  godWalletCount: number;
  volume24h: number;
  marketCap: number;
}

interface MigrationStats {
  total: number;
  last24h: number;
  last7d: number;
  byType: Record<string, number>;
}

const MIGRATION_TYPE_INFO: Record<string, { label: string; color: string }> = {
  pump_to_raydium: { label: "Pump to Raydium", color: "text-[#2dce89]" },
  bonding_curve: { label: "Bonding Curve", color: "text-[#0071e3]" },
  upgrade: { label: "Token Upgrade", color: "text-[#a259ff]" },
  rebrand: { label: "Rebrand", color: "text-[#ffb800]" },
  other: { label: "Other", color: "text-[#86868b]" },
};

function MigrationCard({ migration }: { migration: Migration }) {
  const typeInfo = MIGRATION_TYPE_INFO[migration.migrationType] || MIGRATION_TYPE_INFO.other;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-white text-[16px] tracking-tight group-hover:text-blue-400 transition-colors">
              {migration.newSymbol || migration.newMint.slice(0, 8)}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight",
              typeInfo.color,
              "bg-white/[0.03] border border-white/[0.05]"
            )}>
              {typeInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-5 text-[12px] font-medium text-[#86868b]">
            <span className="flex items-center gap-1.5 group-hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5" /> {migration.godWalletCount} Wallets
            </span>
            <span className="flex items-center gap-1.5 group-hover:text-white transition-colors">
              <TrendingUp className="w-3.5 h-3.5" /> Rank {migration.rankingScore.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <span className="text-[11px] font-medium text-[#424245]">
            {new Date(migration.detectedAt).toLocaleTimeString([], { hour12: false })}
          </span>
          {migration.marketCap > 0 && (
            <div className="px-2 py-0.5 bg-[#2dce89]/10 border border-[#2dce89]/20 rounded-lg">
              <span className="text-[11px] font-bold text-[#2dce89]">
                ${(migration.marketCap / 1000).toFixed(0)}K MC
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MigrationFeed() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [migrationsRes, statsRes] = await Promise.all([
        api.getTopMigrations(10),
        api.getMigrationStats(),
      ]);

      if (migrationsRes.success && migrationsRes.data) {
        const rawData = migrationsRes.data as { data?: Migration[] } | Migration[];
        const migrations = Array.isArray(rawData) ? rawData : (rawData.data || []);
        setMigrations(migrations);
      }

      if (statsRes.success && statsRes.data) {
        const rawData = statsRes.data as { data?: MigrationStats } | MigrationStats;
        const stats = 'data' in rawData && rawData.data ? rawData.data : rawData as MigrationStats;
        setStats(stats);
      }
    } catch (error) {
      console.error("Failed to fetch migrations:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card flex flex-col h-full min-h-[500px] overflow-hidden">
      <div className="p-8 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Rocket className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest">Growth Terminal</h3>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-white/[0.05] hover:bg-white/[0.03] transition-all"
          >
            <RefreshCw className={cn("w-4 h-4 text-[#86868b]", isRefreshing && "animate-spin")} />
          </button>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Token Migrations</h2>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-[#86868b] font-medium">Monitoring liquidity migrations from bonding curves.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <div className="text-center py-20 flex flex-col items-center">
              <Layers className="h-8 w-8 text-white/5 mb-4 animate-pulse" />
              <p className="text-[13px] font-medium text-[#86868b]">Compiling growth data...</p>
            </div>
          ) : (
            migrations.map((migration) => (
              <MigrationCard key={migration.id} migration={migration} />
            ))
          )}
        </AnimatePresence>
      </div>

      {stats && (
        <div className="p-6 border-t border-white/[0.05] bg-black/[0.2] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-tight">Daily Volume</span>
            <span className="text-[13px] font-bold text-white">{stats.last24h} Events</span>
          </div>
          <a
            href="/migrations"
            className="text-[12px] font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1.5 group"
          >
            View Analytics <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      )}
    </div>
  );
}

export default MigrationFeed;
