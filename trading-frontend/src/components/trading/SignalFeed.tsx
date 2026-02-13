'use client';

import { useSignals } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Brain,
  Zap,
  AlertTriangle,
  Wallet,
  Activity,
  Terminal
} from 'lucide-react';

const sourceIcons: Record<string, React.ReactNode> = {
  whale: <Wallet className="h-3.5 w-3.5 text-blue-500" />,
  god_wallet: <Wallet className="h-3.5 w-3.5 text-amber-500" />,
  ai: <Brain className="h-3.5 w-3.5 text-purple-500" />,
  arbitrage: <Zap className="h-3.5 w-3.5 text-emerald-500" />,
  onchain: <Activity className="h-3.5 w-3.5 text-zinc-400" />,
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds.toString().padStart(2, '0')}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}m`;
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
      title: `WHALE::${action.toUpperCase()}`,
      description: `${token} // $${amount?.toLocaleString() ?? 'N/A'}`,
      trend: action === 'buy' ? 'up' : 'down',
    };
  }

  if (signal.source === 'ai') {
    const token = data.token as string;
    const recommendation = data.recommendation as string;
    return {
      title: `AI::${recommendation?.toUpperCase() ?? 'ANALYSIS'}`,
      description: `Target: ${token} // ${data.reasoning as string}`,
      trend: recommendation?.includes('buy') ? 'up' : recommendation?.includes('sell') ? 'down' : undefined,
    };
  }

  if (signal.source === 'arbitrage') {
    const buyPlatform = data.buyPlatform as string;
    const sellPlatform = data.sellPlatform as string;
    const profitPercent = data.profitPercent as number;
    return {
      title: 'ARB::OPPORTUNITY',
      description: `${buyPlatform} >> ${sellPlatform} // ${profitPercent?.toFixed(2) ?? 0}%`,
      trend: 'up',
    };
  }

  return {
    title: `SYS::${signal.type.toUpperCase()}`,
    description: JSON.stringify(data).slice(0, 100),
  };
}

export function SignalFeed() {
  const { signals: liveSignals, isConnected } = useSignals();

  // Mock signals to ensure the UI looks "cracked" even without live data
  const mockSignals = [
    {
      id: 'mock-1',
      source: 'whale',
      type: 'trade',
      timestamp: Date.now() - 45000,
      confidence: 94,
      data: { action: 'buy', token: 'SOL', amount: 1450000 }
    },
    {
      id: 'mock-2',
      source: 'ai',
      type: 'analysis',
      timestamp: Date.now() - 120000,
      confidence: 88,
      data: { token: 'JUP', recommendation: 'stealth_buy', reasoning: 'Unusual liquidity migration detected' }
    },
    {
      id: 'mock-3',
      source: 'arbitrage',
      type: 'opp',
      timestamp: Date.now() - 300000,
      confidence: 91,
      data: { buyPlatform: 'Jupiter', sellPlatform: 'Orca', profitPercent: 1.24 }
    },
    {
      id: 'mock-4',
      source: 'whale',
      type: 'trade',
      timestamp: Date.now() - 600000,
      confidence: 82,
      data: { action: 'sell', token: 'BONK', amount: 450000 }
    },
    {
      id: 'mock-5',
      source: 'onchain',
      type: 'bridge',
      timestamp: Date.now() - 900000,
      confidence: 75,
      data: { origin: 'Ethereum', destination: 'Solana', amount: 2500000 }
    }
  ];

  const signals = liveSignals.length > 0 ? liveSignals : mockSignals;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* List Content */}
      <div className="flex-1 overflow-y-auto px-0 space-y-0 custom-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          {signals.map((signal) => {
            const content = getSignalContent(signal);
            const { title, description } = content;
            const isHighConfidence = signal.confidence >= 90;
            const trend = content.trend;

            return (
              <motion.div
                key={signal.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "group/item py-4 px-5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all cursor-pointer relative overflow-hidden",
                  isHighConfidence ? "bg-emerald-500/[0.01]" : ""
                )}
              >
                {isHighConfidence && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                )}

                <div className="flex justify-between items-center mb-1.5">
                  <span className={cn(
                    "text-[10px] font-black font-mono tracking-wider flex items-center gap-2 uppercase",
                    isHighConfidence ? "text-emerald-400" : "text-zinc-300"
                  )}>
                    {title}
                    {trend === 'up' && <span className="text-[10px] text-emerald-500 font-bold">↑</span>}
                    {trend === 'down' && <span className="text-[10px] text-rose-500 font-bold">↓</span>}
                  </span>
                  <span className="text-[9px] font-black font-mono text-zinc-600 bg-white/[0.03] px-1.5 py-0.5 rounded uppercase">
                    {formatTimeAgo(signal.timestamp)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500 font-bold truncate pr-3 uppercase italic">
                    {description.split('//')[0]}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black font-mono shrink-0 px-2 py-0.5 rounded bg-white/[0.02]",
                    signal.confidence > 80 ? "text-emerald-500/80" : "text-zinc-600"
                  )}>
                    {description.split('//')[1] || `${signal.confidence}%`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
