'use client';

import { useSignals } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  whale: <Wallet className="h-4 w-4 text-[#0071e3]" />,
  god_wallet: <Wallet className="h-4 w-4 text-[#ffb800]" />,
  ai: <Brain className="h-4 w-4 text-[#a259ff]" />,
  arbitrage: <Zap className="h-4 w-4 text-[#2dce89]" />,
  onchain: <Activity className="h-4 w-4 text-white" />,
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
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
      description: `${token} • $${amount?.toLocaleString() ?? 'N/A'}`,
      trend: action === 'buy' ? 'up' : 'down',
    };
  }

  if (signal.source === 'ai') {
    const token = data.token as string;
    const recommendation = data.recommendation as string;
    return {
      title: `AI ${recommendation?.toUpperCase() ?? 'ANALYSIS'}`,
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
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
        <div>
          <h3 className="text-[13px] font-semibold text-[#86868b] tracking-tight mb-1">REAL-TIME SIGNALS</h3>
          <h4 className="text-xl font-bold text-white tracking-tight">Signal Stream</h4>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-full">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected ? "bg-[#2dce89] shadow-[0_0_8px_rgba(45,206,137,0.4)] animate-pulse" : "bg-[#f53d2d]"
            )}
          />
          <span className="text-[11px] font-semibold text-white/90 tracking-tight">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4 space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {signals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 flex flex-col items-center"
              >
                <Activity className="h-8 w-8 text-white/10 mb-4 animate-pulse" />
                <p className="text-[13px] font-medium text-[#86868b]">Scanning markets...</p>
              </motion.div>
            ) : (
              signals.map((signal) => {
                const { title, description, trend } = getSignalContent(signal);
                const isHighConfidence = signal.confidence >= 90;

                return (
                  <motion.div
                    key={signal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className={cn(
                      "p-4 rounded-xl transition-all duration-300 relative overflow-hidden group border",
                      isHighConfidence
                        ? "bg-white/[0.05] border-white/[0.1] shadow-xl"
                        : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-500",
                        isHighConfidence
                          ? "bg-white text-black border-white"
                          : "bg-white/[0.03] border-white/[0.05] group-hover:border-white/[0.1]"
                      )}>
                        {sourceIcons[signal.source] || <AlertTriangle className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-[14px] text-white tracking-tight">
                            {title}
                          </span>
                          {trend && (
                            <div className={cn(
                              "px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                              trend === 'up' ? "text-[#2dce89] bg-[#2dce89]/10" : "text-[#f53d2d] bg-[#f53d2d]/10"
                            )}>
                              {trend === 'up' ? 'Bullish' : 'Bearish'}
                            </div>
                          )}
                        </div>
                        <p className="text-[13px] text-[#86868b] line-clamp-2 leading-snug">
                          {description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <div className="flex items-baseline gap-0.5">
                          <span className={cn(
                            "text-[15px] font-bold",
                            isHighConfidence ? "text-white" : "text-white/80"
                          )}>
                            {signal.confidence}
                          </span>
                          <span className="text-[10px] text-[#86868b] font-medium">%</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#86868b]">
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

      <div className="p-4 border-t border-white/[0.05] bg-black/[0.2]">
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                className="w-1 h-1 rounded-full bg-white/20"
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
            Secure Live Link
          </span>
        </div>
      </div>
    </div>
  );
}

export default SignalFeed;
