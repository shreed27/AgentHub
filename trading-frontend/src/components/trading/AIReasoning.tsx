'use client';

import { useAIReasoning } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, Eye, AlertCircle, Terminal, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const recommendationConfig: Record<
  string,
  { color: string; label: string; icon: React.ReactNode }
> = {
  strong_buy: {
    color: 'text-emerald-500',
    label: 'STRONG_BUY',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  buy: {
    color: 'text-emerald-500',
    label: 'BUY_signal',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  watch: {
    color: 'text-amber-500',
    label: 'WATCH_LIST',
    icon: <Eye className="h-3 w-3" />,
  },
  avoid: {
    color: 'text-rose-500',
    label: 'AVOID',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  sell: {
    color: 'text-rose-500',
    label: 'SELL_SIGNAL',
    icon: <TrendingDown className="h-3 w-3" />,
  },
};

export function AIReasoning() {
  const { reasoning, isConnected } = useAIReasoning();

  // Mock data for visualization if empty
  const displayReasoning = reasoning.length > 0 ? reasoning : [
    { id: '1', token: 'BTC', recommendation: 'watch', confidence: 85, reasoning: 'Volume consolidation above 65k support level. Awaiting breakout confirmation.' },
    { id: '2', token: 'PEPE', recommendation: 'buy', confidence: 92, reasoning: 'Social sentiment spike > 300%. On-chain accumulation detected in fresh wallets.' }
  ];

  return (
    <div className="flex flex-col bg-[#050505] border border-white/10 relative group h-full">
      {/* Technical Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/20" />
      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/20" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/20" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20" />

      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-500" />
          <h3 className="text-xs font-mono font-bold text-white tracking-widest uppercase">NEURAL_ENGINE</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-sm", isConnected ? "bg-purple-500 animate-pulse" : "bg-zinc-600")} />
          <span className="text-[10px] font-mono text-zinc-500 uppercase">{isConnected ? "PROCESSING" : "OFFLINE"}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/[0.02]">
        <AnimatePresence mode="popLayout" initial={false}>
          {displayReasoning.map((item: any) => {
            const config = recommendationConfig[item.recommendation] || recommendationConfig.watch;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-white/5 bg-[#0A0A0A] p-4 relative overflow-hidden group/item hover:border-white/10 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-white tracking-tight">{item.token}</span>
                    <div className={cn("flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 border border-white/5 bg-white/5 rounded", config.color)}>
                      {config.icon}
                      {config.label}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">CONFIDENCE</span>
                    <span className={cn("text-xs font-mono font-bold", item.confidence > 80 ? "text-emerald-500" : "text-zinc-400")}>
                      {item.confidence}%
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-purple-500/20" />
                  <p className="pl-3 text-[11px] font-mono text-zinc-400 leading-relaxed font-medium">
                    {item.reasoning}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="p-2 border-t border-white/10 bg-[#0A0A0A] flex justify-between items-center text-[10px] font-mono text-zinc-600">
        <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> MODEL: LLAMA-3-70B-QUANT</span>
        <span>TPS: 345</span>
      </div>
    </div>
  );
}

export default AIReasoning;
