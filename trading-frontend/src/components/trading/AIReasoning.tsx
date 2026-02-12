'use client';

import { useAIReasoning } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const recommendationConfig: Record<
  string,
  { color: string; label: string; icon: React.ReactNode }
> = {
  strong_buy: {
    color: 'text-[#2dce89]',
    label: 'Strong Buy',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  buy: {
    color: 'text-[#2dce89]',
    label: 'Buy',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  watch: {
    color: 'text-[#ffb800]',
    label: 'Watch',
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  avoid: {
    color: 'text-[#f53d2d]',
    label: 'Avoid',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  sell: {
    color: 'text-[#f53d2d]',
    label: 'Sell',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
};

export function AIReasoning() {
  const { reasoning, isConnected } = useAIReasoning();

  return (
    <div className="glass-card flex flex-col h-full min-h-[400px]">
      <div className="p-8 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest">Neural Analysis</h3>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.03] rounded-full">
            <div className={cn("w-1 h-1 rounded-full", isConnected ? "bg-[#2dce89] animate-pulse" : "bg-[#f53d2d]")} />
            <span className="text-[10px] font-medium text-[#86868b]">{isConnected ? 'Uplink' : 'Offline'}</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">AI Reasoning</h2>
        <p className="text-sm text-[#86868b] mt-1">Autonomous insight generation for current market conditions.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {reasoning.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 flex flex-col items-center"
            >
              <Sparkles className="h-8 w-8 text-white/5 mb-4" />
              <p className="text-[13px] font-medium text-[#86868b]">Collecting market intelligence...</p>
            </motion.div>
          ) : (
            reasoning.map((item) => {
              const config = recommendationConfig[item.recommendation] || recommendationConfig.watch;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-[15px] tracking-tight">{item.token}</span>
                        <div className={cn("flex items-center gap-1.5 mt-0.5", config.color)}>
                          {config.icon}
                          <span className="text-[12px] font-bold uppercase tracking-tight">{config.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[15px] font-bold text-white">{item.confidence}%</span>
                      <span className="text-[10px] font-medium text-[#86868b] uppercase tracking-tighter">Confidence</span>
                    </div>
                  </div>

                  <p className="text-[14px] text-[#86868b] leading-relaxed font-medium group-hover:text-white transition-colors">
                    {item.reasoning}
                  </p>

                  <div className="mt-4 h-1 w-full bg-white/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.confidence}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-purple-500/50 to-purple-400 rounded-full"
                    />
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

export default AIReasoning;
