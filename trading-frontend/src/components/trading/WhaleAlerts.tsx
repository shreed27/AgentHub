'use client';

import { useWhaleAlerts } from '@/lib/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Crown } from 'lucide-react';

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
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          Whale Alerts
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-zinc-400">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {whaleAlerts.length === 0 ? (
            <div className="text-center py-6 text-zinc-500">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Monitoring whale activity...</p>
            </div>
          ) : (
            whaleAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-3 rounded-lg border ${
                  alert.action === 'buy'
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        alert.action === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      {alert.action === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{alert.token}</span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            alert.action === 'buy'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {alert.action.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {alert.walletLabel || `${alert.walletAddress.slice(0, 8)}...`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatAmount(alert.amount)}</p>
                    <p className="text-xs text-zinc-500">{formatTimeAgo(alert.timestamp)} ago</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden mr-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${alert.confidence}%` }}
                      className={`h-full ${
                        alert.confidence >= 80
                          ? 'bg-green-500'
                          : alert.confidence >= 60
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{alert.confidence}% conf</span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default WhaleAlerts;
