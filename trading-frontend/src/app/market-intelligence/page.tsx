"use client";

import { PredictionCard } from "@/components/market/PredictionCard";
import { TokenRow } from "@/components/market/TokenRow";
import { Search, Filter, Flame, Zap, Trophy, BarChart3, Globe } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// Mock Data
const predictions = [
    { question: "Will Sol reach $200 by Friday?", volume: "2.4M", chance: 72, category: "Crypto" as const, timeLeft: "3d", chartData: [{ time: 'A', value: 40 }, { time: 'B', value: 60 }, { time: 'C', value: 72 }] },
    { question: "Fed Rate Cut in March?", volume: "15M", chance: 24, category: "Macro" as const, timeLeft: "12d", chartData: [{ time: 'A', value: 80 }, { time: 'B', value: 40 }, { time: 'C', value: 24 }] },
    { question: "ETH ETF Approval this week", volume: "850K", chance: 55, category: "Crypto" as const, timeLeft: "18h", chartData: [{ time: 'A', value: 50 }, { time: 'B', value: 50 }, { time: 'C', value: 55 }] },
];

const tokens = [
    { rank: 1, symbol: "POPCAT", name: "Popcat", price: 0.4523, change24h: 12.5, volume: "12M", mcap: "450M", liquidity: "2.1M" },
    { rank: 2, symbol: "WIF", name: "dogwifhat", price: 2.145, change24h: -5.2, volume: "145M", mcap: "2.1B", liquidity: "15M" },
    { rank: 3, symbol: "BONK", name: "Bonk", price: 0.000012, change24h: 3.8, volume: "45M", mcap: "850M", liquidity: "8.5M" },
    { rank: 4, symbol: "JUP", name: "Jupiter", price: 0.98, change24h: 1.2, volume: "85M", mcap: "1.2B", liquidity: "25M" },
    { rank: 5, symbol: "PYTH", name: "Pyth Network", price: 0.35, change24h: -2.1, volume: "12M", mcap: "540M", liquidity: "5.2M" },
    { rank: 6, symbol: "DRIFT", name: "Drift Protocol", price: 0.45, change24h: 15.4, volume: "8.5M", mcap: "120M", liquidity: "1.8M" },
];

export default function MarketIntelligencePage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <Globe className="w-8 h-8 text-blue-400" /> Market Intelligence
                    </h1>
                    <p className="text-muted-foreground">Predictive markets layered with real-time on-chain data.</p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                    <button className="px-4 py-1.5 rounded-md bg-white/10 text-white text-sm font-medium shadow">Overview</button>
                    <button className="px-4 py-1.5 rounded-md text-muted-foreground hover:text-white text-sm font-medium transition-colors">Watchlist</button>
                    <button className="px-4 py-1.5 rounded-md text-muted-foreground hover:text-white text-sm font-medium transition-colors">Alerts</button>
                </div>
            </div>

            {/* Hero Section: Sentiment & Top Movers */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Sentiment Gauge (Left) */}
                <div className="lg:col-span-1 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-950/30 to-purple-950/30 backdrop-blur-md relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                    <div className="relative z-10 w-40 h-40 rounded-full border-8 border-white/5 border-t-green-500 border-r-green-500/50 flex items-center justify-center mb-4 rotate-45">
                        <div className="-rotate-45">
                            <div className="text-4xl font-bold text-white">72</div>
                            <div className="text-xs uppercase text-green-400 font-bold tracking-widest mt-1">Greed</div>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground relative z-10">Market Sentiment Index</p>
                    <div className="mt-4 flex gap-2">
                        <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/10">Bullish</span>
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/10">High Vol</span>
                    </div>
                </div>

                {/* Prediction Cards (Right) */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {predictions.map((pred, i) => (
                        <PredictionCard key={i} {...pred} />
                    ))}
                </div>
            </div>

            {/* Main Content: Split View (Screener + Chart) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[600px]">

                {/* Token Screener List */}
                <div className="xl:col-span-2 flex flex-col rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-400" /> Trending Pairs
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input type="text" placeholder="Filter..." className="h-8 pl-8 pr-3 rounded bg-black/40 border border-white/10 text-xs w-32 focus:w-48 transition-all outline-none" />
                            </div>
                            <button className="h-8 w-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 border border-white/5">
                                <Filter className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground w-8 text-center">#</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Token</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Price</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">24h %</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Vol</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right hidden md:table-cell">Liq</th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right hidden md:table-cell">M.Cap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token) => (
                                    <TokenRow key={token.rank} {...token} />
                                ))}
                                {/* Duplicate for scroll demo */}
                                {tokens.map((token) => (
                                    <TokenRow key={`dup-${token.rank}`} {...{ ...token, rank: token.rank + 6 }} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar: Active Bets / Alpha Stream */}
                <div className="flex flex-col gap-4">

                    {/* Alpha Stream */}
                    <div className="flex-1 rounded-2xl border border-white/5 bg-gradient-to-b from-blue-900/5 to-transparent backdrop-blur-md p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" /> Alpha Stream
                            </h3>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>

                        <div className="space-y-3 flex-1 overflow-auto pr-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="text-xs p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-blue-300">@WhaleAlert</span>
                                        <span className="text-muted-foreground opacity-50">2m</span>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed">
                                        Large accumulation of <span className="text-white font-bold">$SOL</span> detected on Coinbase.
                                        <span className="text-green-400 block mt-1">+ $2.4M Spot Buy</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Gainer Mini Card */}
                    <div className="h-32 rounded-2xl border border-white/5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                        <div className="relative z-10">
                            <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Top Performer
                            </div>
                            <div className="text-2xl font-bold text-white">POPCAT</div>
                            <div className="text-green-400 font-mono">+12.5%</div>
                        </div>
                        <div className="w-20 h-full relative z-10">
                            {/* Mini Chart Placeholder */}
                            <div className="w-full h-full opacity-50">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[{ v: 10 }, { v: 20 }, { v: 15 }, { v: 40 }, { v: 30 }, { v: 50 }, { v: 45 }]}>
                                        <Area type="monotone" dataKey="v" stroke="#22c55e" fill="#22c55e" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}
