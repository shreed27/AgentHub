"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Cpu,
    Globe,
    Shield,
    Terminal,
    Zap,
    Search,
    Command,
    Wifi,
    Server,
    Database,
    Lock,
    Maximize2,
    Share2,
    MoreHorizontal,
    Play,
    Pause,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    DollarSign
} from "lucide-react";
import React from 'react';
import { PositionStream } from "@/components/trading/PositionStream";
import { cn } from "@/lib/utils";
import { useDemoTrading } from "@/lib/useDemoTrading";
import dynamic from 'next/dynamic';

const GlitchText = ({ text }: { text: string }) => {
    return (
        <span className="relative inline-block group">
            <span className="relative z-10">{text}</span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-blue-500 opacity-0 group-hover:opacity-70 animate-pulse translate-x-[1px]">
                {text}
            </span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-0 group-hover:opacity-70 animate-pulse -translate-x-[1px]">
                {text}
            </span>
        </span>
    );
};

const LogStream = () => {
    const [logs, setLogs] = useState<{ id: string, time: string, type: 'INFO' | 'WARN' | 'EXEC' | 'SUCCESS', msg: string }[]>([
        { id: '1', time: 'INITIAL', type: 'INFO', msg: 'System initialized v2.4.1' },
        { id: '2', time: 'INITIAL', type: 'SUCCESS', msg: 'Connected to mainnet node' },
    ]);

    useEffect(() => {
        const messages = [
            { type: 'INFO', msg: 'Scanning mempool for arbitrage opps...' },
            { type: 'INFO', msg: 'Updating order book depth L2...' },
            { type: 'EXEC', msg: 'Smart Router: Split trade 4 ways' },
            { type: 'WARN', msg: 'High volatility detected on SOL-PERP' },
            { type: 'SUCCESS', msg: 'Block 249102 synced (12ms)' },
            { type: 'INFO', msg: 'Rebalancing portfolio weights...' },
            { type: 'EXEC', msg: 'Flash loan simulation: PROFITABLE' },
            { type: 'INFO', msg: 'Garbage collection: filtered 240 events' },
            { type: 'WARN', msg: 'Gas price spike: 42 gwei' },
        ];

        const interval = setInterval(() => {
            const randomMsg = messages[Math.floor(Math.random() * messages.length)];
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            setLogs(prev => {
                const newLogs = [...prev, {
                    id: Math.random().toString(36).substring(7),
                    time,
                    type: randomMsg.type as any,
                    msg: randomMsg.msg
                }];
                return newLogs.slice(-20); // Keep last 20
            });
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll dummy ref
    const endRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return null;
};

// Custom hook for live market data from Binance
const useLiveMarketData = () => {
    const symbols = [
        { symbol: "BTCUSDT", display: "BTC/USDT", mcap: "1.8T" },
        { symbol: "ETHUSDT", display: "ETH/USDT", mcap: "320B" },
        { symbol: "SOLUSDT", display: "SOL/USDT", mcap: "85B" },
        { symbol: "JUPUSDT", display: "JUP/USDT", mcap: "1.6B" },
        { symbol: "RAYUSDT", display: "RAY/USDT", mcap: "450M" },
        { symbol: "WIFUSDT", display: "WIF/USDT", mcap: "2.1B" },
        { symbol: "PEPEUSDT", display: "PEPE/USDT", mcap: "8.5B" },
        { symbol: "DOGEUSDT", display: "DOGE/USDT", mcap: "45B" },
        { symbol: "SHIBUSDT", display: "SHIB/USDT", mcap: "12B" },
        { symbol: "AVAXUSDT", display: "AVAX/USDT", mcap: "15B" },
    ];

    const [data, setData] = useState<any[]>([]);
    const prevPricesRef = React.useRef<Record<string, number>>({});

    const fetchMarketData = useCallback(async () => {
        try {
            // Fetch 24hr ticker data from our API route (bypasses CORS)
            const symbolsParam = symbols.map(s => `"${s.symbol}"`).join(',');
            const response = await fetch(`/api/market/binance?symbols=[${symbolsParam}]`);

            if (!response.ok) throw new Error('Failed to fetch market data');

            const tickers = await response.json();

            const formattedData = tickers.map((ticker: any, idx: number) => {
                const symbolConfig = symbols[idx];
                const price = parseFloat(ticker.lastPrice);
                const change = parseFloat(ticker.priceChangePercent);
                const high = parseFloat(ticker.highPrice);
                const low = parseFloat(ticker.lowPrice);
                const volume = parseFloat(ticker.quoteVolume);

                // Format volume
                let volStr = "";
                if (volume >= 1e9) volStr = `${(volume / 1e9).toFixed(1)}B`;
                else if (volume >= 1e6) volStr = `${(volume / 1e6).toFixed(0)}M`;
                else if (volume >= 1e3) volStr = `${(volume / 1e3).toFixed(0)}K`;
                else volStr = volume.toFixed(0);

                // Determine trend based on previous price
                const prevPrice = prevPricesRef.current[symbolConfig.symbol] || price;
                const trend = price > prevPrice ? "up" : price < prevPrice ? "down" : "up";

                return {
                    s: symbolConfig.display,
                    p: price,
                    c: change,
                    h: high,
                    l: low,
                    v: volStr,
                    m: symbolConfig.mcap,
                    t: trend as "up" | "down"
                };
            });

            // Update previous prices for trend detection
            const newPrevPrices: Record<string, number> = {};
            tickers.forEach((ticker: any, idx: number) => {
                newPrevPrices[symbols[idx].symbol] = parseFloat(ticker.lastPrice);
            });
            prevPricesRef.current = newPrevPrices;

            setData(formattedData);
        } catch (error) {
            console.error('Error fetching market data:', error);
            // Keep existing data on error
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchMarketData();

        // Update every 2 seconds
        const interval = setInterval(fetchMarketData, 2000);

        return () => clearInterval(interval);
    }, [fetchMarketData]);

    return data;
};

// Market Ticker Component
const MarketTicker = ({ data }: { data: any[] }) => {
    return (
        <div className="flex items-center gap-6 overflow-hidden">
            {data.slice(0, 4).map((m, i) => (
                <motion.div
                    key={i}
                    layout
                    className="flex items-center gap-2 text-[10px] font-mono group"
                >
                    <span className="font-bold text-zinc-500 group-hover:text-blue-500 transition-colors uppercase tracking-widest">{m.s.split('/')[0]}</span>
                    <span className="text-white tabular-nums">${m.p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={cn("tabular-nums", m.c >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {m.c > 0 ? "+" : ""}{m.c.toFixed(2)}%
                    </span>
                </motion.div>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [command, setCommand] = useState("");
    const { balance, metrics } = useDemoTrading();
    const marketData = useLiveMarketData();

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toISOString().replace("T", " ").split(".")[0] + " :: UTC");
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex-1 grid grid-cols-12 gap-4 h-full min-h-0 overflow-hidden pr-2 pb-2 font-mono">
            {/* LEFT: DATA STREAM (3/12) */}
            <div className="col-span-3 flex flex-col h-full bg-black/40 border-r border-white/5 overflow-hidden relative">
                {/* Header */}
                <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">Net_Stream</span>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-mono italic opacity-50">RELAY_SYNCED</span>
                </div>

                {/* Stream Component */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none z-10" />
                    <PositionStream />

                    {/* Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] bg-[length:100%_2px,3px_100%] opacity-20" />
                </div>

                {/* Mini Stats Footer */}
                <div className="h-24 border-t border-white/[0.05] bg-black/60 p-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col justify-between">
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Latency</span>
                        <div className="text-xl text-white font-black">12<span className="text-[10px] text-zinc-500 font-normal ml-1">ms</span></div>
                    </div>
                    <div className="flex flex-col justify-between">
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Uptime</span>
                        <div className="text-xl text-emerald-500 font-black">99.99<span className="text-[10px] text-zinc-500 font-normal ml-1">%</span></div>
                    </div>
                </div>
            </div>

            {/* RIGHT: MAIN TERMINAL (9/12) */}
            <div className="col-span-9 flex flex-col h-full min-h-0 relative">

                {/* HEADER HUD */}
                <div className="h-32 shrink-0 grid grid-cols-4 gap-4 mb-4">
                    {/* Total Liquidity */}
                    <div className="bg-black/40 border border-white/[0.05] p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Activity className="w-5 h-5 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Total_Liquidity
                            </span>
                            <div>
                                <div className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                                    <span className="text-emerald-500">+2.4%</span> vs last epoch
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 24h Volume */}
                    <div className="bg-black/40 border border-white/[0.05] p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Globe className="w-5 h-5 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Globe className="w-3 h-3" /> 24h_Volume
                            </span>
                            <div>
                                <div className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                    $14.2M
                                </div>
                                <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                                    Global aggregate
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Nodes */}
                    <div className="bg-black/40 border border-white/[0.05] p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Cpu className="w-5 h-5 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Cpu className="w-3 h-3" /> Active_Nodes
                            </span>
                            <div>
                                <div className="text-2xl font-black text-emerald-500 tracking-tighter tabular-nums">
                                    8/12
                                </div>
                                <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                                    <span className="text-blue-500">Optimized</span> for speed
                                </div>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/[0.05]">
                            <div className="h-full bg-blue-500 w-[66%]" />
                        </div>
                    </div>

                    {/* Security Level */}
                    <div className="bg-black/40 border border-white/[0.05] p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Shield className="w-5 h-5 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Security_Lvl
                            </span>
                            <div>
                                <div className="text-2xl font-black text-blue-500 tracking-tighter tabular-nums text-shadow-glow">
                                    MAXIMUM
                                </div>
                                <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                                    Encryption: AES-256
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 bg-black/40 border border-white/[0.05] relative overflow-hidden flex flex-col p-0">
                    {/* Header */}
                    <div className="h-10 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between px-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-blue-500 px-2 py-0.5 rounded bg-blue-500/5 border border-blue-500/10">
                                <Terminal className="w-3 h-3" />
                                <span className="text-[9px] font-black tracking-widest uppercase italic">System_Console</span>
                            </div>
                            <MarketTicker data={marketData} />
                        </div>
                        <div className="text-[9px] font-mono text-zinc-600 tabular-nums">{currentTime}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative p-6 grid grid-cols-3 gap-6 overflow-hidden">
                        {/* Background Grid */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

                        {/* Col 1: Market Depth (New Professional Table) */}
                        <div className="col-span-3 flex flex-col gap-4 z-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Database className="w-3 h-3 text-blue-500" />
                                    Active_Markets
                                </h3>
                                <div className="flex gap-2">
                                    <button className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-bold rounded border border-blue-500/20">SPOT</button>
                                    <button className="px-2 py-1 bg-white/5 text-zinc-500 text-[9px] font-bold rounded border border-white/5 hover:text-white">PERP</button>
                                </div>
                            </div>

                            <div className="flex-1 border border-white/[0.05] bg-black/20 backdrop-blur-sm overflow-hidden flex flex-col">
                                <div className="grid grid-cols-8 bg-white/[0.02] border-b border-white/[0.05] p-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                    <div className="col-span-1 pl-2">Asset</div>
                                    <div className="col-span-1 text-right">Price</div>
                                    <div className="col-span-1 text-right">24h Change</div>
                                    <div className="col-span-1 text-right">24h High</div>
                                    <div className="col-span-1 text-right">24h Low</div>
                                    <div className="col-span-1 text-right">24h Vol</div>
                                    <div className="col-span-1 text-right">Mkt Cap</div>
                                    <div className="col-span-1 text-right pr-2">Trend</div>
                                </div>
                                <div className="divide-y divide-white/[0.02]">
                                    {marketData.map((row, i) => (
                                        <motion.div
                                            key={i}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="grid grid-cols-8 p-3 hover:bg-white/[0.02] transition-colors items-center text-[10px] font-mono group cursor-pointer border-l-2 border-l-transparent hover:border-l-blue-500/50"
                                        >
                                            <div className="col-span-1 pl-2 font-bold text-white group-hover:text-blue-400 transition-colors uppercase">{row.s}</div>
                                            <motion.div
                                                animate={{
                                                    color: row.t === "up" ? ["#10b981", "#d1d5db"] : ["#f43f5e", "#d1d5db"],
                                                    transition: { duration: 1 }
                                                }}
                                                className="col-span-1 text-right tabular-nums font-bold"
                                            >
                                                ${row.p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </motion.div>
                                            <div className={cn("col-span-1 text-right font-bold tabular-nums", row.c >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {row.c >= 0 ? "+" : ""}{row.c.toFixed(2)}%
                                            </div>
                                            <div className="col-span-1 text-right text-zinc-400 tabular-nums">
                                                ${row.h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="col-span-1 text-right text-zinc-400 tabular-nums">
                                                ${row.l.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="col-span-1 text-right text-zinc-500 uppercase tracking-tighter">{row.v}</div>
                                            <div className="col-span-1 text-right text-zinc-500 uppercase tracking-tighter">${row.m}</div>
                                            <div className="col-span-1 text-right pr-2 flex justify-end">
                                                {row.t === "up" ? (
                                                    <div className="flex items-center text-emerald-500">
                                                        <TrendingUp className="w-3 h-3" />
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500 absolute animate-ping ml-1" />
                                                    </div>
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-rose-500" />
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Footer / Console Input */}
                    <div className="h-10 border-t border-white/[0.05] bg-black/60 flex items-center px-4 gap-2">
                        <span className="text-blue-500 font-bold text-xs">{">"}</span>
                        <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="ENTER_COMMAND..."
                            className="bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder-zinc-700 flex-1 uppercase"
                        />
                        <div className="px-1.5 py-0.5 border border-white/10 rounded text-[8px] font-mono text-zinc-600">BASH_V4.2</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
