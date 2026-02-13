"use client";

import { useState, useEffect } from "react";
import { Download, Search, Filter, Activity, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoTrading } from "@/lib/useDemoTrading";
import { motion, AnimatePresence } from "framer-motion";

export default function PnLPage() {
    const [view, setView] = useState<'realized' | 'unrealized'>('realized');
    const { positions, trades, balance } = useDemoTrading();
    const [searchTerm, setSearchTerm] = useState("");

    // Real data from provider
    const activePositions = positions.map(p => ({
        symbol: p.symbol,
        amount: p.amount,
        entryPrice: p.entryPrice,
        markPrice: p.currentPrice,
        pnl: p.unrealizedPnL,
        pnlPercent: (p.unrealizedPnL / (p.amount * p.entryPrice)) * 100,
        type: 'POSITION'
    }));

    // For "Realized" view, we could show historical trades
    const historicalTrades = trades.map(t => ({
        symbol: t.symbol,
        amount: t.amount,
        entryPrice: t.price,
        markPrice: t.price, // Closed
        pnl: 0, // Need to implement realized PnL in provider for better history
        pnlPercent: 0,
        type: 'TRADE'
    }));

    const displayData = (view === 'unrealized' ? activePositions : historicalTrades).filter(item =>
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPnL = activePositions.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
    const totalVolume = activePositions.reduce((acc, curr) => acc + (curr.amount * curr.entryPrice), 0);
    const totalPnLPerc = totalVolume > 0 ? (totalPnL / totalVolume) * 100 : 0;

    return (
        <div className="h-full flex flex-col font-mono overflow-hidden bg-[#09090b] relative">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

            {/* Header */}
            <div className="h-16 border-b border-white/[0.05] bg-surface/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Asset_Evaluation</span>
                        <h1 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <History className="w-5 h-5 text-blue-500" />
                            P&L Terminal
                        </h1>
                    </div>
                    <div className="h-10 w-px bg-white/10 mx-2" />

                    {/* View Switcher */}
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setView('realized')}
                            className={cn(
                                "px-4 py-1.5 text-[10px] uppercase font-bold rounded-lg transition-all",
                                view === 'realized'
                                    ? "bg-blue-500 text-black shadow-lg"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Realized
                        </button>
                        <button
                            onClick={() => setView('unrealized')}
                            className={cn(
                                "px-4 py-1.5 text-[10px] uppercase font-bold rounded-lg transition-all",
                                view === 'unrealized'
                                    ? "bg-blue-500 text-black shadow-lg"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Unrealized
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest leading-none mb-1">Total_Balance</span>
                            <span className="text-sm font-black text-white leading-none">${balance.toLocaleString()}</span>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Wallet className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="py-10 px-8 border-b border-white/[0.05] bg-black/20 shrink-0 z-10">
                <div className="grid grid-cols-4 gap-12 max-w-6xl">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Trading_Volume
                        </span>
                        <div className="text-3xl font-black text-zinc-300 tracking-tighter">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase italic tracking-widest">Aggregate_Positions</div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Net_Result
                        </span>
                        <div className={cn("text-3xl font-black tracking-tighter", totalPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {totalPnL >= 0 ? "+" : ""}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase italic tracking-widest">Global_Consensus</div>
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                        <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-xs self-start",
                            totalPnL >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        )}>
                            {totalPnL >= 0 ? "+" : ""}{totalPnLPerc.toFixed(2)}% Performance
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">
                <div className="max-w-6xl space-y-4">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="relative group w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter Ledger..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-surface/50 border border-white/[0.06] rounded-2xl py-2.5 pl-11 pr-4 text-[10px] font-black font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/30 transition-all uppercase tracking-widest"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-white transition-all">
                                <Download className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-white transition-all">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {displayData.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center opacity-40">
                                <Activity className="w-12 h-12 text-zinc-700 mb-6" />
                                <p className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-[0.5em] text-center max-w-sm leading-relaxed">
                                    No {view} data found in the current session ledger.
                                </p>
                            </div>
                        )}
                        {displayData.map((item, i) => {
                            const isPos = (item.pnl || 0) >= 0;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group grid grid-cols-6 items-center p-6 bg-surface/30 border border-white/[0.04] rounded-3xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer shadow-sm shadow-black/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center font-black text-white text-xs">
                                            {item.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white tracking-widest">{item.symbol}</div>
                                            <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Spot_Asset</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Quantity</span>
                                        <span className="text-xs font-black text-zinc-300 font-mono">{item.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Avg_Price</span>
                                        <span className="text-xs font-black text-zinc-300 font-mono">${item.entryPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">LTP</span>
                                        <span className="text-xs font-black text-white font-mono">${item.markPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-10">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Net_Profit</span>
                                            <div className={cn("text-sm font-black font-mono", isPos ? "text-emerald-500" : "text-rose-500")}>
                                                {isPos ? "+" : ""}{(item.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-20 px-3 py-1.5 rounded-xl border text-[10px] font-black font-mono text-center",
                                            isPos ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                        )}>
                                            {isPos ? "+" : ""}{(item.pnlPercent || 0).toFixed(2)}%
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Analytics Footer */}
            <div className="h-12 border-t border-white/[0.05] bg-black/40 flex items-center justify-center px-8 shrink-0 z-10">
                <div className="flex items-center gap-10 opacity-30 text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                    <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> SECURED_LEDGER</div>
                    <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> REALTIME_SYNC</div>
                    <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500" /> V2.4.1_STABLE</div>
                </div>
            </div>
        </div>
    );
}

const History = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
)
