'use client';

import { useWebSocket } from '@/lib/useWebSocket';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Zap } from 'lucide-react';

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        isConnected
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Connected</span>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="h-3 w-3" />
          </motion.div>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Disconnected</span>
        </>
      )}
    </motion.div>
  );
}

export default ConnectionStatus;
