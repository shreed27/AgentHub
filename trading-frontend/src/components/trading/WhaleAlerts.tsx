'use client';

import { useWhaleAlerts } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function WhaleAlerts() {
  const { whaleAlerts, isConnected } = useWhaleAlerts();

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
        <div>
          <h3 className="text-[13px] font-semibold text-[#86868b] tracking-tight mb-1">LARGE TRANSACTIONS</h3>
          <h4 className="text-xl font-bold text-white tracking-tight">Whale Intercept</h4>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-full">
          <span className="text-[11px] font-semibold text-white/70 tracking-tight flex items-center gap-2">
            <Activity className="h-3 w-3 text-blue-500" />
            Scanning
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4 space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {whaleAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 flex flex-col items-center"
              >
                <Wallet className="h-8 w-8 text-white/10 mb-4" />
                <p className="text-[13px] font-medium text-[#86868b]">No large moves detected.</p>
              </motion.div>
            ) : (
              whaleAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300 relative group",
                    alert.action === 'buy'
                      ? "bg-[#2dce89]/[0.02] border-[#2dce89]/10 hover:bg-[#2dce89]/[0.05]"
                      : "bg-[#f53d2d]/[0.02] border-[#f53d2d]/10 hover:bg-[#f53d2d]/[0.05]"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center border",
                        alert.action === 'buy' ? 'text-[#2dce89] border-[#2dce89]/20 bg-[#2dce89]/5' : 'text-[#f53d2d] border-[#f53d2d]/20 bg-[#f53d2d]/10'
                      )}>
                        {alert.action === 'buy' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[14px] tracking-tight">{alert.token}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight",
                            alert.action === 'buy' ? 'text-[#2dce89] bg-[#2dce89]/10' : 'text-[#f53d2d] bg-[#f53d2d]/10'
                          )}>
                            {alert.action}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-[#86868b]">
                          {alert.walletAddress.slice(0, 6)}...{alert.walletAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white tracking-tight">{formatAmount(alert.amount)}</p>
                      <p className="text-[11px] font-medium text-[#86868b]">{formatTimeAgo(alert.timestamp)} ago</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-medium text-[#86868b]">
                      <span>Confidence Score</span>
                      <span className="text-white">{alert.confidence}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${alert.confidence}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          alert.confidence >= 80 ? 'bg-white' : 'bg-[#86868b]'
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t border-white/[0.05] bg-black/[0.2] flex justify-end">
        <span className="text-[10px] font-bold text-[#424245] uppercase tracking-widest">
          Vortex Radar v2.0
        </span>
      </div>
    </div>
  );
}

export default WhaleAlerts;
