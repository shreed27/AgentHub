'use client';

import { useAIReasoning } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, Eye, AlertCircle } from 'lucide-react';

const recommendationConfig: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  strong_buy: {
    color: 'text-green-400',
    bg: 'bg-green-500/20 border-green-500/30',
    icon: <TrendingUp className="h-4 w-4 text-green-400" />,
  },
  buy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20 border-emerald-500/30',
    icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  },
  watch: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20 border-yellow-500/30',
    icon: <Eye className="h-4 w-4 text-yellow-400" />,
  },
  avoid: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/20 border-orange-500/30',
    icon: <AlertCircle className="h-4 w-4 text-orange-400" />,
  },
  sell: {
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30',
    icon: <TrendingDown className="h-4 w-4 text-red-400" />,
  },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AIReasoning() {
  const { reasoning, isConnected } = useAIReasoning();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          AI Reasoning
          <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-zinc-400">
            {isConnected ? 'Streaming' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[350px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {reasoning.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">AI is analyzing markets...</p>
              <p className="text-xs mt-1 opacity-75">Insights will appear here</p>
            </div>
          ) : (
            reasoning.map((item) => {
              const config =
                recommendationConfig[item.recommendation] || recommendationConfig.watch;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`p-4 rounded-lg border ${config.bg}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="font-bold text-white">{item.token}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${config.color}`}
                      >
                        {item.recommendation.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">{item.reasoning}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Confidence:</span>
                      <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.confidence}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${
                            item.confidence >= 80
                              ? 'bg-purple-500'
                              : item.confidence >= 60
                              ? 'bg-purple-400'
                              : 'bg-purple-300'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${config.color}`}>
                        {item.confidence}%
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

export default AIReasoning;
