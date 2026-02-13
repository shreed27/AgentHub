'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Activity,
    Wallet,
    Zap,
    Target,
    BarChart3,
    Globe,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import api from '@/lib/api';
import { useDemoTrading } from '@/lib/useDemoTrading';
import { usePositionUpdates } from '@/lib/useWebSocket';

interface PositionCard {
    id: string;
    symbol: string;
    side: 'long' | 'short' | 'yes' | 'no';
    amount: string;
    price: number;
    pnl?: number;
    pnlPercent?: number;
    timestamp: number;
    source: 'POLYMARKET' | 'BINANCE' | 'DEX';
    type: 'live' | 'institutional';
}

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}

export function PositionStream() {
    const [items, setItems] = useState<PositionCard[]>([]);

    useEffect(() => {
        async function fetchRealTrades() {
            try {
                // Fetch recent trades for all major assets
                const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'JUPUSDT', 'RAYUSDT', 'WIFUSDT', 'PEPEUSDT', 'DOGEUSDT', 'SHIBUSDT', 'AVAXUSDT'];

                const tradesPromises = symbols.map(async (symbol) => {
                    try {
                        const response = await fetch(`/api/market/trades?symbol=${symbol}&limit=5`);
                        if (!response.ok) return [];
                        const trades = await response.json();

                        return trades.map((trade: any) => ({
                            id: `${symbol}-${trade.id}`,
                            symbol: symbol.replace('USDT', ''),
                            side: trade.isBuyerMaker ? 'short' : 'long', // If buyer is maker, it's a sell (short)
                            amount: parseFloat(trade.qty).toFixed(3),
                            price: parseFloat(trade.price),
                            timestamp: trade.time,
                            source: 'BINANCE' as const,
                            type: 'live' as const
                        }));
                    } catch (err) {
                        console.error(`Failed to fetch trades for ${symbol}:`, err);
                        return [];
                    }
                });

                const allTrades = await Promise.all(tradesPromises);
                const flatTrades = allTrades.flat();

                // Sort by timestamp (most recent first) and take top 30
                const sortedTrades = flatTrades
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 30);

                setItems(sortedTrades);
            } catch (err) {
                console.error('Failed to fetch trade stream data', err);
            }
        }

        // Initial fetch
        fetchRealTrades();

        // Update every 2 seconds for real-time feel
        const interval = setInterval(fetchRealTrades, 2000);
        return () => clearInterval(interval);
    }, []);

    const displayItems = items;

    return (
        <div className="flex flex-col h-full bg-black/40 font-mono text-[10px]">
            {/* Header Row */}
            <div className="grid grid-cols-4 px-6 py-2 border-b border-white/[0.04] text-zinc-600 uppercase tracking-widest font-black">
                <div className="col-span-1">Time</div>
                <div className="col-span-1 text-center">Price</div>
                <div className="col-span-1 text-right">Size</div>
                <div className="col-span-1 text-right">Sym</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {displayItems.map((item, idx) => (
                    <div
                        key={`${item.id}-${idx}`}
                        className="grid grid-cols-4 px-6 py-2.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors items-center"
                    >
                        <div className="col-span-1 text-zinc-500 font-medium">
                            {new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className={cn(
                            "col-span-1 text-center font-black",
                            item.side === 'long' ? "text-blue-500" : "text-rose-500"
                        )}>
                            {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 text-right text-zinc-300 font-bold">
                            {item.amount.replace(/[^0-9.]/g, '')}
                        </div>
                        <div className="col-span-1 text-right text-zinc-600 font-bold uppercase truncate">
                            {item.symbol.replace('/USDT', '')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
