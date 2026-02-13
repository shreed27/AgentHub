"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Download,
    Cpu,
    Zap,
    History,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    BarChart3,
    PieChart,
    Wallet,
    X,
    Target as TargetIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from "recharts";
import { useDemoTrading } from "@/lib/useDemoTrading";

// Mock Data Generators for "Cracked" Look
const generateEquityCurve = (startBalance: number, days: number) => {
    let current = startBalance;
    const data = [];
    for (let i = 0; i < days; i++) {
        const change = (Math.random() - 0.48) * 2000; // Slight upward drift
        current += change;
        data.push({
            date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: current,
            pnl: change
        });
    }
    return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-[10px] font-mono text-zinc-400 mb-1">{label}</p>
                <p className="text-sm font-black font-mono text-white">
                    ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                        "text-[10px] font-bold font-mono",
                        payload[0].payload.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {payload[0].payload.pnl >= 0 ? "+" : ""}{payload[0].payload.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Daily_PnL</span>
                </div>
            </div>
        );
    }
    return null;
};

// Helper icon component
const Target = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

export default function AnalyticsPage() {
    const { balance, trades, positions, metrics, executeTrade, updateLivePrice } = useDemoTrading();
    const data = useMemo(() => generateEquityCurve(100000, 30), []); // Mock 30 days
    const totalEq = balance + (metrics?.totalPnL || 0);

    // Chaos Monkey / Live Price Simulation for Active Positions
    useEffect(() => {
        if (positions.length === 0) return;

        const interval = setInterval(() => {
            positions.forEach(pos => {
                // Simulate random price movement of +/- 0.5%
                const move = (Math.random() - 0.5) * 0.01;
                const newPrice = pos.entryPrice * (1 + move);
                // In a real app we'd fetch this, here we push fake updates to animate PnL
                updateLivePrice(pos.symbol, newPrice);
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [positions, updateLivePrice]);

    const handleClosePosition = (position: any) => {
        try {
            executeTrade({
                symbol: position.symbol,
                type: position.side === 'long' ? 'sell' : 'buy', // Opposite side to close
                amount: position.amount,
                price: position.entryPrice // In real matching engine this would be market price, for simplicty using entry
            });
        } catch (e) {
            console.error("Failed to close position", e);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 p-1 overflow-hidden">
            {/* Header / Top Bar */}
            <div className="shrink-0 flex items-center justify-between p-6 rounded-3xl border border-white/[0.04] bg-surface/50 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                        <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black font-mono text-white tracking-tight uppercase italic leading-none mb-1">
                            Portfolio_Analytics<span className="text-blue-500">_v3.0</span>
                        </h1>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <span>Hash: <span className="text-zinc-300">0x8a...f29c</span></span>
                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span>Node: <span className="text-blue-500">Synced</span></span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8 relative z-10">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Net_Liquid_Value</span>
                        <div className="text-3xl font-black font-mono text-white tracking-tighter">
                            ${totalEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="h-10 w-[1px] bg-white/[0.08]" />
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Total_Return</span>
                        <div className={cn("text-xl font-black font-mono tracking-tighter flex items-center gap-2", totalEq >= 100000 ? "text-emerald-500" : "text-rose-500")}>
                            {totalEq >= 100000 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {((totalEq - 100000) / 100000 * 100).toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">

                {/* Left Column: Charts & Metrics (8/12) */}
                <div className="col-span-8 flex flex-col gap-6 h-full min-h-0">

                    {/* Chart Card */}
                    <div className="flex-[2] min-h-0 rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-sm p-6 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-2">
                                {['1H', '4H', '1D', '1W', '1M', 'ALL'].map((tf) => (
                                    <button key={tf} className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[9px] font-bold font-mono text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all">
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em]">Equity_Curve_Simulation</span>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#52525b"
                                        tick={{ fontSize: 10, fontFamily: 'monospace' }}
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="#52525b"
                                        tick={{ fontSize: 10, fontFamily: 'monospace' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val: number) => `$${(val / 1000).toFixed(0)}k`}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex-1 min-h-0 grid grid-cols-4 gap-4">
                        {[
                            { label: "Win_Rate", value: "64.2%", sub: "High Confidence", color: "text-emerald-500", icon: Target },
                            { label: "Profit_Factor", value: "2.41", sub: "Optimal", color: "text-blue-400", icon: TrendingUp },
                            { label: "Sharpe_Ratio", value: "1.85", sub: "Risk Adjusted", color: "text-purple-400", icon: Activity },
                            { label: "Max_Drawdown", value: "-4.2%", sub: "Conservative", color: "text-rose-500", icon: AlertTriangle },
                        ].map((stat, i) => (
                            <div key={i} className="rounded-2xl border border-white/[0.04] bg-surface/30 p-5 flex flex-col justify-between hover:bg-white/[0.02] transition-colors group">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                                    {/* <stat.icon className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" /> */}
                                </div>
                                <div>
                                    <div className={cn("text-2xl font-black font-mono tracking-tighter mb-1", stat.color)}>
                                        {stat.value}
                                    </div>
                                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                                        {stat.sub}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Right Column: Execution Log & Active (4/12) */}
                <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">

                    {/* Active Allocation */}
                    <div className="h-[200px] shrink-0 rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em]">Asset_Distribution</span>
                            <PieChart className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div className="flex-1 flex items-center justify-center relative">
                            {/* Simple CSS Donut or placeholders since raw SVG pie is tedious */}
                            <div className="w-32 h-32 rounded-full border-[12px] border-emerald-500/20 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-[12px] border-emerald-500 border-t-transparent border-l-transparent rotate-45" />
                                <div className="text-center">
                                    <div className="text-xs font-black font-mono text-white">65%</div>
                                    <div className="text-[8px] font-mono text-zinc-500 uppercase">Cash</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-mono text-zinc-400 uppercase">Cash</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                                <span className="text-[9px] font-mono text-zinc-400 uppercase">Positions</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Positions Board */}
                    <div className="flex-1 min-h-0 rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-sm overflow-hidden flex flex-col shadow-2xl">
                        <div className="shrink-0 h-14 px-6 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                            <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em]">Active_Positions</span>
                            <div className="flex gap-2">
                                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-500 font-bold uppercase animate-pulse">
                                    Live_Feed
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            {positions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30">
                                    <Wallet className="w-8 h-8 text-zinc-500" />
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">No_Active_Positions</span>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {positions.map((pos) => (
                                        <div key={pos.symbol} className="p-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black font-mono text-white uppercase">{pos.symbol}</span>
                                                    <span className={cn(
                                                        "text-[9px] font-bold uppercase tracking-wider",
                                                        pos.side === 'long' ? "text-blue-500" : "text-rose-500"
                                                    )}>
                                                        {pos.side} 20x
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className={cn(
                                                        "text-xs font-black font-mono",
                                                        pos.unrealizedPnL >= 0 ? "text-emerald-500" : "text-rose-500"
                                                    )}>
                                                        {(pos.unrealizedPnL || 0) >= 0 ? "+" : ""}{(pos.unrealizedPnL || 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-500 font-mono">
                                                        {pos.amount && pos.entryPrice
                                                            ? (((pos.unrealizedPnL || 0) / (pos.amount * pos.entryPrice)) * 100).toFixed(2)
                                                            : "0.00"}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-[9px] font-mono text-zinc-500 mb-3">
                                                <div>
                                                    <span className="block opacity-50 uppercase tracking-widest">Size</span>
                                                    <span className="text-zinc-300">{pos.amount.toFixed(4)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block opacity-50 uppercase tracking-widest">Entry</span>
                                                    <span className="text-zinc-300">{(pos.entryPrice || 0).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleClosePosition(pos)}
                                                className="w-full py-1.5 rounded bg-white/[0.05] hover:bg-rose-500 hover:text-white border border-white/[0.05] hover:border-rose-500 text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                            >
                                                Close_Position
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* System Status Footer */}
            <div className="shrink-0 h-6 flex items-center justify-between opacity-40 px-2">
                <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">System_Health: 100%</span>
                <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Analytics_Engine_v2.1</span>
            </div>
        </div>
    );
}
