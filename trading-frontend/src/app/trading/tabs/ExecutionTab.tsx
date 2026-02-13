"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Activity, Timer, Layers, Search, TrendingUp, Globe, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import TradingViewChart from "@/components/charts/TradingViewChart";
import { useDemoTrading } from "@/lib/useDemoTrading";

interface Order {
    id: string;
    price: number;
    size: number;
    total: number;
    type: "bid" | "ask";
    depth: number;
}

interface Trade {
    id: string;
    time: string;
    price: number;
    size: number;
    side: "buy" | "sell";
}

export default function ExecutionTab() {
    const [symbol, setSymbol] = useState("SOL/USDT");
    const [searchInput, setSearchInput] = useState("");
    const [bids, setBids] = useState<Order[]>([]);
    const [asks, setAsks] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [price, setPrice] = useState(0);
    const [priceChange, setPriceChange] = useState(0);
    const [connected, setConnected] = useState(false);
    const [latency, setLatency] = useState(0);
    const [logTab, setLogTab] = useState<"market" | "portfolio">("market");


    const wsRef = useRef<WebSocket | null>(null);
    const { balance, trades: demoTrades } = useDemoTrading();

    const normalizeSymbol = (s: string) => s.replace("/", "").toLowerCase();

    const connectWebSocket = useCallback((targetSymbol: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const binanceSymbol = normalizeSymbol(targetSymbol);
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws`);
        wsRef.current = ws;

        const startTime = Date.now();

        ws.onopen = () => {
            setConnected(true);
            setLatency(Date.now() - startTime);

            const msg = {
                method: "SUBSCRIBE",
                params: [
                    `${binanceSymbol}@depth20@100ms`,
                    `${binanceSymbol}@trade`,
                    `${binanceSymbol}@ticker`
                ],
                id: 1
            };
            ws.send(JSON.stringify(msg));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            const bidsData = data.bids || data.b;
            const asksData = data.asks || data.a;

            if (bidsData || asksData) {
                if (bidsData) {
                    const newBids = bidsData.slice(0, 15).map((b: any, i: number) => ({
                        id: `bid-${i}-${Date.now()}`,
                        price: parseFloat(b[0]),
                        size: parseFloat(b[1]),
                        total: parseFloat(b[0]) * parseFloat(b[1]),
                        type: "bid" as const,
                        depth: Math.min(100, (parseFloat(b[1]) / 2) * 100)
                    }));
                    setBids(newBids);
                }

                if (asksData) {
                    const newAsks = asksData.slice(0, 15).map((a: any, i: number) => ({
                        id: `ask-${i}-${Date.now()}`,
                        price: parseFloat(a[0]),
                        size: parseFloat(a[1]),
                        total: parseFloat(a[0]) * parseFloat(a[1]),
                        type: "ask" as const,
                        depth: Math.min(100, (parseFloat(a[1]) / 2) * 100)
                    }));
                    setAsks(newAsks.reverse());
                }
            }

            if (data.e === "24hrTicker") {
                setPrice(parseFloat(data.c));
                setPriceChange(parseFloat(data.P));
            }

            if (data.e === "trade" || data.e === "aggTrade") {
                const newTrade: Trade = {
                    id: (data.t || data.a).toString(),
                    time: new Date(data.T || data.E).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                    price: parseFloat(data.p),
                    size: parseFloat(data.q),
                    side: data.m ? "sell" : "buy"
                };
                setTrades(prev => [newTrade, ...prev].slice(0, 25));
                setPrice(parseFloat(data.p));
            }
        };

        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);
    }, []);

    useEffect(() => {
        connectWebSocket(symbol);
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [symbol, connectWebSocket]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            let s = searchInput.toUpperCase().trim();
            // Handle cases like "SOL" -> "SOL/USDT", "SOL/USDT" -> "SOL/USDT", "BTCUSDT" -> "BTC/USDT"
            if (!s.includes("/")) {
                if (s.endsWith("USDT") && s.length > 4) {
                    s = `${s.slice(0, -4)}/USDT`;
                } else if (!["USDT", "USDC", "SOL", "BNB"].includes(s)) {
                    s = `${s}/USDT`;
                }
            }
            setSymbol(s);
            setSearchInput("");
        }
    };



    return (
        <div className="h-[calc(100vh-14rem)] flex flex-col gap-5 overflow-hidden">
            <div className="shrink-0 flex items-center gap-6 p-4 rounded-3xl border border-white/[0.04] bg-surface/50 backdrop-blur-2xl shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] to-transparent pointer-events-none" />
                <form onSubmit={handleSearch} className="relative w-64 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="SEARCH_MARKET..."
                        className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-2.5 pl-11 pr-4 text-[10px] font-black font-mono text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/30 focus:bg-black/60 transition-all uppercase tracking-widest"
                    />
                </form>
                <div className="h-6 w-[1px] bg-white/[0.06]" />
                <div className="flex items-center gap-10">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] leading-none">Ticker</span>
                        <span className="text-xs font-black font-mono text-white tracking-widest uppercase">{symbol}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] leading-none">Price_Index</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-mono text-white tracking-tighter">
                                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={cn("text-[10px] font-bold font-mono", priceChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {priceChange >= 0 ? "↑" : "↓"} {Math.abs(priceChange).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em] leading-none">Latency</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                            <span className="text-xs font-black font-mono text-emerald-500/80">{latency}ms</span>
                        </div>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-6 pr-2">
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Demo_Liquidity</span>
                        <span className="text-lg font-black font-mono text-emerald-500 tracking-tighter">
                            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-5 min-h-0">
                <div className="w-[300px] flex flex-col rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-md overflow-hidden shadow-xl">
                    <div className="shrink-0 h-12 px-5 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                        <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Flux_Orders</span>
                        <Layers className="w-3.5 h-3.5 text-zinc-700" />
                    </div>
                    <div className="flex text-[8px] font-black font-mono text-zinc-600 px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.04] uppercase tracking-widest">
                        <span className="w-1/2">Price_USD</span>
                        <span className="w-1/4 text-right">Size</span>
                        <span className="w-1/4 text-right">Liquidity</span>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-hidden flex flex-col justify-end">
                            {asks.map((ask) => (
                                <div key={ask.id} className="relative flex items-center text-[10px] font-mono py-1 px-5 hover:bg-rose-500/5 transition-colors group cursor-crosshair">
                                    <div className="absolute inset-y-0 right-0 bg-rose-500/10 transition-all duration-300" style={{ width: `${ask.depth}%` }} />
                                    <span className="w-1/2 text-rose-400 font-bold relative z-10">{ask.price.toFixed(price > 100 ? 2 : 4)}</span>
                                    <span className="w-1/4 text-zinc-300 text-right relative z-10">{ask.size.toFixed(2)}</span>
                                    <span className="w-1/4 text-zinc-600 text-right relative z-10">{(ask.total / 1000).toFixed(1)}k</span>
                                </div>
                            ))}
                        </div>
                        <div className="py-4 px-5 border-y border-white/[0.04] bg-white/[0.02] flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className={cn("text-xl font-black font-mono tracking-tighter", priceChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[8px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em]">Network_Consensus</span>
                            </div>
                            <Activity className="w-4 h-4 text-emerald-500/40 animate-pulse" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {bids.map((bid) => (
                                <div key={bid.id} className="relative flex items-center text-[10px] font-mono py-1 px-5 hover:bg-emerald-500/5 transition-colors group cursor-crosshair">
                                    <div className="absolute inset-y-0 right-0 bg-emerald-500/10 transition-all duration-300" style={{ width: `${bid.depth}%` }} />
                                    <span className="w-1/2 text-emerald-400 font-bold relative z-10">{bid.price.toFixed(price > 100 ? 2 : 4)}</span>
                                    <span className="w-1/4 text-zinc-300 text-right relative z-10">{bid.size.toFixed(2)}</span>
                                    <span className="w-1/4 text-zinc-600 text-right relative z-10">{(bid.total / 1000).toFixed(1)}k</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 min-w-0">
                    <div className="flex-1 flex flex-col rounded-3xl border border-white/[0.06] bg-black overflow-hidden relative shadow-2xl group">
                        <div className="shrink-0 h-12 px-6 border-b border-white/[0.04] bg-white/[0.02] flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.3em]">{symbol}_MASTER_RENDER</span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <TradingViewChart symbol={symbol} />
                        </div>
                    </div>


                </div>

                <div className="w-[340px] flex flex-col rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-md overflow-hidden shadow-xl">
                    <div className="shrink-0 h-12 px-6 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                        <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Execution_Log</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLogTab("market")} className={cn("px-3 py-1 text-[9px] font-black font-mono rounded-lg transition-all", logTab === "market" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white")}>Market</button>
                            <button onClick={() => setLogTab("portfolio")} className={cn("px-3 py-1 text-[9px] font-black font-mono rounded-lg transition-all", logTab === "portfolio" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white")}>My_Trade</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {(logTab === "market" ? trades : demoTrades).map((t: any) => (
                                <motion.div key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center text-[10px] font-mono py-2 px-6 border-b border-white/[0.02]">
                                    <span className="w-1/3 text-zinc-600 truncate">{t.time}</span>
                                    <span className={cn("w-1/3 text-right font-black", t.side === "buy" || t.type === "buy" ? "text-emerald-400" : "text-rose-400")}>{t.price}</span>
                                    <span className="w-1/3 text-right text-zinc-400 font-bold">{t.size || t.amount}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
