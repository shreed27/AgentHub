'use client';

import { useSignals } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  AlertTriangle,
  Wallet,
  Activity,
} from 'lucide-react';

const sourceIcons: Record<string, React.ReactNode> = {
  whale: <Wallet className="h-4 w-4" />,
  god_wallet: <Wallet className="h-4 w-4 text-yellow-400" />,
  ai: <Brain className="h-4 w-4" />,
  arbitrage: <Zap className="h-4 w-4" />,
  onchain: <Activity className="h-4 w-4" />,
};

const sourceColors: Record<string, string> = {
  whale: 'border-blue-500/50 bg-blue-500/10',
  god_wallet: 'border-yellow-500/50 bg-yellow-500/10',
  ai: 'border-purple-500/50 bg-purple-500/10',
  arbitrage: 'border-green-500/50 bg-green-500/10',
  onchain: 'border-cyan-500/50 bg-cyan-500/10',
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getSignalContent(signal: {
  source: string;
  type: string;
  data: unknown;
  confidence: number;
}): { title: string; description: string; trend?: 'up' | 'down' } {
  const data = signal.data as Record<string, unknown>;

  if (signal.source === 'whale' || signal.source === 'god_wallet') {
    const action = data.action as string;
    const token = data.token as string;
    const amount = data.amount as number;
    return {
      title: `${signal.source === 'god_wallet' ? 'God Wallet' : 'Whale'} ${action.toUpperCase()}`,
      description: `${token} - ${amount?.toLocaleString() ?? 'N/A'} USD`,
      trend: action === 'buy' ? 'up' : 'down',
    };
  }

  if (signal.source === 'ai') {
    const token = data.token as string;
    const recommendation = data.recommendation as string;
    return {
      title: `AI: ${recommendation?.toUpperCase() ?? 'ANALYSIS'}`,
      description: data.reasoning as string || `Analysis for ${token}`,
      trend: recommendation?.includes('buy') ? 'up' : recommendation?.includes('sell') ? 'down' : undefined,
    };
  }

  if (signal.source === 'arbitrage') {
    const buyPlatform = data.buyPlatform as string;
    const sellPlatform = data.sellPlatform as string;
    const profitPercent = data.profitPercent as number;
    return {
      title: 'Arbitrage Opportunity',
      description: `${buyPlatform} → ${sellPlatform}: ${profitPercent?.toFixed(2) ?? 0}% profit`,
      trend: 'up',
    };
  }

  return {
    title: signal.type,
    description: JSON.stringify(data).slice(0, 100),
  };
}

export function SignalFeed() {
  const { signals, isConnected } = useSignals();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          Signal Feed
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-zinc-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {signals.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Waiting for signals...</p>
            </div>
          ) : (
            signals.map((signal) => {
              const { title, description, trend } = getSignalContent(signal);
              return (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-lg border ${
                    sourceColors[signal.source] || 'border-zinc-700 bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {sourceIcons[signal.source] || <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">{title}</span>
                        {trend && (
                          trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-green-400" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-400" />
                          )
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-cyan-400">
                        {signal.confidence}%
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatTimeAgo(signal.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SignalFeed;
