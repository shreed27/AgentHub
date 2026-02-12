'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, Snowflake, Activity, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useWallet } from '@/hooks/useWalletCompat';

type SurvivalState = 'growth' | 'normal' | 'defensive' | 'critical' | 'hibernation';

interface SurvivalData {
  currentState: SurvivalState;
  enabled: boolean;
  portfolioChange?: number;
  stateConfig?: {
    maxAllocation: number;
    riskMultiplier: number;
    description: string;
  };
}

const stateConfig: Record<SurvivalState, {
  icon: typeof Shield;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  threshold: string;
}> = {
  growth: {
    icon: TrendingUp,
    label: 'GROWTH',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'Aggressive mode unlocked',
    threshold: '>= +20%',
  },
  normal: {
    icon: Activity,
    label: 'NORMAL',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Standard trading operations',
    threshold: '0% to -15%',
  },
  defensive: {
    icon: Shield,
    label: 'DEFENSIVE',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    description: 'Positions reduced 50%',
    threshold: '-15% to -50%',
  },
  critical: {
    icon: AlertTriangle,
    label: 'CRITICAL',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Capital preservation mode',
    threshold: '-50% to -75%',
  },
  hibernation: {
    icon: Snowflake,
    label: 'HIBERNATION',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    description: 'All trading halted',
    threshold: '< -75%',
  },
};

export function SurvivalModeIndicator() {
  const [data, setData] = useState<SurvivalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Get wallet from Solana wallet adapter
  const { publicKey, connected } = useWallet();

  // Check if mounted for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use connected wallet address or null
  const walletAddress = connected && publicKey ? publicKey.toBase58() : null;

  useEffect(() => {
    async function fetchSurvivalStatus() {
      if (!walletAddress) {
        setLoading(false);
        // Default state when no wallet connected
        setData({
          currentState: 'normal',
          enabled: true,
          portfolioChange: 0,
        });
        return;
      }

      try {
        const response = await api.getSurvivalStatus(walletAddress);
        if (response.success && response.data) {
          setData(response.data as SurvivalData);
        } else {
          // Default to normal state if no data
          setData({
            currentState: 'normal',
            enabled: true,
            portfolioChange: 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch survival status:', err);
        // Set default state on error
        setData({
          currentState: 'normal',
          enabled: true,
          portfolioChange: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSurvivalStatus();
    const interval = setInterval(fetchSurvivalStatus, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const currentConfig = stateConfig[data.currentState];
  const Icon = currentConfig.icon;

  return (
    <div className={cn(
      "rounded-xl border backdrop-blur-xl p-4",
      currentConfig.borderColor,
      currentConfig.bgColor
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Survival Mode
        </h3>
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
          data.enabled ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
        )}>
          {data.enabled ? 'Active' : 'Disabled'}
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative p-4 rounded-lg border",
          currentConfig.borderColor,
          "bg-black/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            currentConfig.bgColor
          )}>
            <Icon className={cn("w-6 h-6", currentConfig.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", currentConfig.color)}>
                {currentConfig.label}
              </span>
              {data.currentState !== 'normal' && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn("text-xs", currentConfig.color)}
                >
                  {currentConfig.threshold}
                </motion.span>
              )}
            </div>
            <p className="text-sm text-zinc-400">{currentConfig.description}</p>
          </div>
        </div>

        {data.portfolioChange !== undefined && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Portfolio Change (24h)</span>
              <span className={cn(
                "font-semibold",
                data.portfolioChange >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {data.portfolioChange >= 0 ? '+' : ''}{data.portfolioChange.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {data.stateConfig && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-black/30">
              <span className="text-zinc-500">Max Allocation</span>
              <span className="block font-semibold text-white">{data.stateConfig.maxAllocation}%</span>
            </div>
            <div className="p-2 rounded bg-black/30">
              <span className="text-zinc-500">Risk Multiplier</span>
              <span className="block font-semibold text-white">{data.stateConfig.riskMultiplier}x</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* State progression indicator */}
      <div className="mt-4 flex items-center justify-between">
        {(['growth', 'normal', 'defensive', 'critical', 'hibernation'] as SurvivalState[]).map((state, index) => {
          const config = stateConfig[state];
          const isActive = state === data.currentState;
          return (
            <div key={state} className="flex items-center">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                isActive ? cn(config.color.replace('text-', 'bg-'), "scale-150") : "bg-zinc-700"
              )} />
              {index < 4 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  isActive ? config.color.replace('text-', 'bg-') : "bg-zinc-700"
                )} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
        <span>Growth</span>
        <span>Hibernation</span>
      </div>
    </div>
  );
}

export default SurvivalModeIndicator;
