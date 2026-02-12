'use client';

import { useState, useEffect } from 'react';
import { DEMO_MODE } from '@/lib/demoData';

export default function DemoBanner() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check demo mode on client side
    const demoFromEnv = DEMO_MODE;
    const demoFromStorage = typeof window !== 'undefined' &&
      window.localStorage?.getItem('dain_demo_mode') === 'true';
    setIsDemoMode(demoFromEnv || demoFromStorage);

    // Check if previously dismissed
    const wasDismissed = typeof window !== 'undefined' &&
      window.sessionStorage?.getItem('demo_banner_dismissed') === 'true';
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('demo_banner_dismissed', 'true');
    }
  };

  const toggleDemoMode = () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('dain_demo_mode', newValue ? 'true' : 'false');
      window.location.reload();
    }
  };

  if (!isDemoMode || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-black px-4 py-2 text-center text-sm font-medium relative">
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-2">
          <span className="animate-pulse">*</span>
          <strong>Demo Mode Active</strong>
          <span className="animate-pulse">*</span>
        </span>
        <span className="hidden sm:inline">
          Showing sample data. Start backend services for live trading.
        </span>
        <button
          onClick={toggleDemoMode}
          className="ml-2 px-2 py-0.5 bg-black/20 hover:bg-black/30 rounded text-xs transition-colors"
        >
          Disable Demo
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition-colors"
        aria-label="Dismiss"
      >
        x
      </button>
    </div>
  );
}

// Small indicator component for showing data source
export function DataSourceIndicator({ source }: { source?: 'live' | 'demo' }) {
  if (!source) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${source === 'demo'
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-green-500/20 text-green-400'
        }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${source === 'demo' ? 'bg-amber-400' : 'bg-green-400 animate-pulse'
          }`}
      />
      {source === 'demo' ? 'Demo' : 'Live'}
    </span>
  );
}
