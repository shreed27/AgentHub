"use client";

import { useEffect, useState } from "react";
import { PredictionCard } from "@/components/market/PredictionCard";
import { TokenRow } from "@/components/market/TokenRow";
import { GodWalletPanel } from "@/features/god-wallets/components/GodWalletPanel";
import { Search, Filter, Flame, Zap, Trophy, BarChart3, Globe, Loader2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

interface Prediction {
    question: string;
    volume: string;
    chance: number;
    category: "Crypto" | "Macro" | "Sports" | "Politics";
    timeLeft: string;
    chartData: Array<{ time: string; value: number }>;
}

interface Token {
    rank: number;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume: string;
    mcap: string;
    liquidity: string;
}

interface MarketStats {
    sentiment: string;
    fearGreedIndex: number;
    topGainers: Array<{ symbol: string; change: number }>;
}

export default function MarketIntelligencePage() {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
    const [signals, setSignals] = useState<Array<{ id: string; source: string; data: unknown; timestamp: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch prediction markets
                const predResponse = await api.getPredictionMarkets();
                if (predResponse.success && predResponse.data) {
                    const preds = predResponse.data.slice(0, 3).map(p => ({
                        question: p.question,
                        volume: formatVolume(p.volume24h),
                        chance: Math.round((p.outcomes[0]?.price || 0.5) * 100),
                        category: "Crypto" as const,
                        timeLeft: "24h",
                        chartData: [
                            { time: 'A', value: 40 },
                            { time: 'B', value: Math.round((p.outcomes[0]?.price || 0.5) * 100 * 0.9) },
                            { time: 'C', value: Math.round((p.outcomes[0]?.price || 0.5) * 100) },
                        ],
                    }));
                    setPredictions(preds);
                }

                // Fetch trending tokens
                const trendingResponse = await api.getTrendingTokens();
                if (trendingResponse.success && trendingResponse.data) {
                    const tokenList = trendingResponse.data.slice(0, 12).map((t, i) => ({
                        rank: i + 1,
                        symbol: t.symbol,
                        name: t.name,
                        price: t.price,
                        change24h: t.change24h,
                        volume: "-",
                        mcap: "-",
                        liquidity: "-",
                    }));
                    setTokens(tokenList);
                }

                // Fetch market stats
                const statsResponse = await api.getMarketStats();
                if (statsResponse.success && statsResponse.data) {
                    setMarketStats({
                        sentiment: statsResponse.data.sentiment,
                        fearGreedIndex: statsResponse.data.fearGreedIndex,
                        topGainers: statsResponse.data.topGainers || [],
                    });
                }

                // Fetch recent signals for Alpha Stream
                const signalsResponse = await api.getSignals({ limit: 5 });
                if (signalsResponse.success && signalsResponse.data) {
                    setSignals(signalsResponse.data);
                }
            } catch (error) {
                console.error('Failed to fetch market data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
        if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
        return vol.toString();
    };

    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };
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
                    {loading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                        <>
                            <div className="relative z-10 w-40 h-40 rounded-full border-8 border-white/5 border-t-green-500 border-r-green-500/50 flex items-center justify-center mb-4 rotate-45">
                                <div className="-rotate-45">
                                    <div className="text-4xl font-bold text-white">{marketStats?.fearGreedIndex || 50}</div>
                                    <div className="text-xs uppercase text-green-400 font-bold tracking-widest mt-1">
                                        {marketStats?.sentiment || 'Neutral'}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground relative z-10">Market Sentiment Index</p>
                            <div className="mt-4 flex gap-2">
                                <span className={`text-xs px-2 py-1 rounded border ${
                                    (marketStats?.fearGreedIndex || 50) > 50
                                        ? 'bg-green-500/10 text-green-400 border-green-500/10'
                                        : 'bg-red-500/10 text-red-400 border-red-500/10'
                                }`}>
                                    {(marketStats?.fearGreedIndex || 50) > 50 ? 'Bullish' : 'Bearish'}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Prediction Cards (Right) */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {loading ? (
                        <>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-48 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ))}
                        </>
                    ) : predictions.length > 0 ? (
                        predictions.map((pred, i) => (
                            <PredictionCard key={i} {...pred} />
                        ))
                    ) : (
                        <div className="lg:col-span-3 h-48 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center text-muted-foreground">
                            No prediction markets available
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content: Split View (Screener + Chart) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[600px]">

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
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : tokens.length > 0 ? (
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
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                No trending tokens available
                            </div>
                        )}
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
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : signals.length > 0 ? (
                                signals.map((signal) => (
                                    <div key={signal.id} className="text-xs p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-blue-300">@{signal.source}</span>
                                            <span className="text-muted-foreground opacity-50">{formatTimeAgo(signal.timestamp)}</span>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed">
                                            {typeof signal.data === 'object' && signal.data !== null
                                                ? JSON.stringify(signal.data).slice(0, 100)
                                                : String(signal.data).slice(0, 100)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                                    No signals available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Gainer Mini Card */}
                    <div className="h-32 rounded-2xl border border-white/5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                        {loading ? (
                            <div className="flex items-center justify-center w-full">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : marketStats?.topGainers && marketStats.topGainers.length > 0 ? (
                            <>
                                <div className="relative z-10">
                                    <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> Top Performer
                                    </div>
                                    <div className="text-2xl font-bold text-white">{marketStats.topGainers[0].symbol}</div>
                                    <div className="text-green-400 font-mono">+{marketStats.topGainers[0].change.toFixed(1)}%</div>
                                </div>
                                <div className="w-20 h-full relative z-10">
                                    <div className="w-full h-full opacity-50">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={[{ v: 10 }, { v: 20 }, { v: 15 }, { v: 40 }, { v: 30 }, { v: 50 }, { v: 45 }]}>
                                                <Area type="monotone" dataKey="v" stroke="#22c55e" fill="#22c55e" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="relative z-10 text-muted-foreground text-sm">
                                No top performers data
                            </div>
                        )}
                    </div>

                    {/* God Wallet Tracker */}
                    <GodWalletPanel />

                </div>

            </div>

        </div>
    );
}
