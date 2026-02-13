'use client';

import { useWhaleAlerts } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Activity, Terminal } from 'lucide-react';

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds.toString().padStart(2, '0')}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}m`;
}

export function WhaleAlerts() {
  const { whaleAlerts } = useWhaleAlerts();

  const displayAlerts = whaleAlerts.length > 0 ? whaleAlerts : [
    { id: "1", action: "buy", token: "SOL", amount: 1250000, walletAddress: "8x92...3k1a", timestamp: Date.now() - 5000, confidence: 92 },
    { id: "2", action: "sell", token: "JUP", amount: 450000, walletAddress: "4x12...9p2m", timestamp: Date.now() - 120000, confidence: 78 }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent relative group">
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          {displayAlerts.map((alert: any) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group/item p-4 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.06] transition-all relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-zinc-800 group-hover/item:bg-emerald-500 transition-colors" />

              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-black font-mono uppercase",
                    alert.action === 'buy' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {alert.action}
                  </div>
                  <span className="text-[11px] font-black font-mono text-white tracking-widest">
                    {alert.token}
                  </span>
                </div>
                <span className="text-[11px] font-black font-mono text-zinc-100 italic">
                  {formatAmount(alert.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-[9px] font-black font-mono text-zinc-600 uppercase">
                    {alert.walletAddress.slice(0, 6)}...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${alert.confidence}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_5px_#10b981]"
                    />
                  </div>
                  <span className="text-[9px] font-black font-mono text-zinc-500">{alert.confidence}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-white/[0.03] bg-white/[0.01] flex justify-between items-center text-[9px] font-black font-mono text-zinc-600 tracking-[0.2em] uppercase">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
          <span>Intercept_v2</span>
        </div>
        <span className="italic">Scanning...</span>
      </div>
    </div>
  );
}

