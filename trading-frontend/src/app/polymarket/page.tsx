"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  DollarSign,
  Search,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Globe,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Wallet,
  X,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoTrading } from "@/lib/useDemoTrading";
import dynamic from "next/dynamic";

const TradingViewChart = dynamic(() => import("@/components/charts/TradingViewChart"), { ssr: false });

// ==================== Types ====================

interface CryptoMarket {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  category: string;
  sparkline: number[];
}

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

const FEATURED_SYMBOLS = ["BTC", "ETH", "SOL"];

const MOCK_CRYPTO: CryptoMarket[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 96450.42,
    change24h: 2.45,
    volume24h: 35000000000,
    marketCap: 1800000000000,
    high24h: 97500.0,
    low24h: 94000.0,
    category: "Currency",
    sparkline: [40, 45, 42, 48, 55, 52, 60]
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 2750.18,
    change24h: -1.2,
    volume24h: 15152000000,
    marketCap: 330000000000,
    high24h: 2820.0,
    low24h: 2710.0,
    category: "L1 Platform",
    sparkline: [30, 28, 35, 32, 28, 25, 22]
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 188.45,
    change24h: 5.67,
    volume24h: 4200000000,
    marketCap: 87000000000,
    high24h: 192.0,
    low24h: 180.0,
    category: "L1 High-Speed",
    sparkline: [20, 25, 30, 35, 45, 55, 65]
  }
];

// ==================== Components ====================

function CryptoCard({ crypto, isSelected, onClick }: { crypto: CryptoMarket; isSelected: boolean; onClick: () => void }) {
  const isPositive = crypto.change24h >= 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden p-8 cursor-pointer transition-all duration-500 rounded-[32px] border bg-surface/30 backdrop-blur-md",
        isSelected
          ? "border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.1)]"
          : "border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] shadow-lg"
      )}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-20 transition-all",
        isPositive ? "bg-emerald-500" : "bg-rose-500"
      )} />

      {/* Header */}
      <div className="flex justify-between items-start gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center font-black text-white text-lg">
            {crypto.symbol[0]}
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-white leading-tight font-mono tracking-tighter group-hover:text-blue-400 transition-colors">
              {crypto.name}
            </h3>
            <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest">{crypto.symbol} / USDT</span>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em] border border-white/[0.06] px-3 py-1.5 rounded-xl bg-black/40">
          {crypto.category}
        </span>
      </div>

      {/* Price Detail */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black font-mono text-white tracking-tighter">
            ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-black font-mono py-1 px-2.5 rounded-lg",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(crypto.change24h)}%
          </div>
        </div>
      </div>

      {/* Mini Visual Line */}
      <div className="h-16 flex items-end gap-1 mb-8 overflow-hidden">
        {crypto.sparkline.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            className={cn(
              "flex-1 rounded-full opacity-60 group-hover:opacity-100 transition-opacity",
              isPositive ? "bg-emerald-500/40" : "bg-rose-500/40"
            )}
          />
        ))}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-6 group-hover:border-white/[0.08] transition-colors gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest">Market_Cap</span>
          <span className="text-xs font-black font-mono text-white tracking-widest">{formatCurrency(crypto.marketCap)}</span>
        </div>
        <div className="flex-1 flex flex-col gap-1 border-l border-white/[0.04] pl-4">
          <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest">Vol_24h</span>
          <span className="text-xs font-black font-mono text-zinc-400 tracking-widest">{formatCurrency(crypto.volume24h)}</span>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all">
          <Target className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ==================== Main Page ====================

export default function CryptoMarketsPage() {
  const [cryptos, setCryptos] = useState<CryptoMarket[]>(MOCK_CRYPTO);
  const [allSymbols, setAllSymbols] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<CryptoMarket | null>(null);
  const [livePrice, setLivePrice] = useState<number>(0);
  const [orderAmount, setOrderAmount] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  const { balance, executeTrade, updateLivePrice } = useDemoTrading();

  // Fetch all symbols for search index
  useEffect(() => {
    const fetchAllSymbols = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        const data = await response.json();
        const usdtSymbols = data.symbols
          .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s: any) => ({
            id: s.symbol.toLowerCase(),
            symbol: s.baseAsset,
            name: s.baseAsset,
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            high24h: 0,
            low24h: 0,
            category: "Spot Market",
            sparkline: Array.from({ length: 10 }, () => 20 + Math.random() * 60)
          }));
        setAllSymbols(usdtSymbols);
      } catch (err) {
        console.error("Failed to fetch all symbols", err);
      }
    };
    fetchAllSymbols();
  }, []);

  // Sync featured prices
  useEffect(() => {
    const syncPrices = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await response.json();

        setCryptos(prev => prev.map(c => {
          const ticker = data.find((t: any) => t.symbol === `${c.symbol}USDT`);
          if (ticker) {
            return {
              ...c,
              price: parseFloat(ticker.lastPrice),
              change24h: parseFloat(ticker.priceChangePercent),
              volume24h: parseFloat(ticker.quoteVolume),
              high24h: parseFloat(ticker.highPrice),
              low24h: parseFloat(ticker.lowPrice)
            };
          }
          return c;
        }));
      } catch (err) {
        console.error("Failed to sync prices", err);
      }
    };
    syncPrices();
    const interval = setInterval(syncPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  const connectWebSocket = useCallback((symbol: string) => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}usdt@ticker`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.c) {
        const price = parseFloat(data.c);
        setLivePrice(price);
        updateLivePrice(`${symbol.toUpperCase()}/USDT`, price);

        // Update the grid price too if it's visible
        setCryptos(prev => prev.map(c => {
          if (c.symbol === symbol.toUpperCase()) {
            return { ...c, price };
          }
          return c;
        }));
      }
    };

    return () => ws.close();
  }, [updateLivePrice]);

  useEffect(() => {
    if (selectedAsset) {
      setLivePrice(selectedAsset.price);
      connectWebSocket(selectedAsset.symbol);
    } else {
      setLivePrice(0);
      if (wsRef.current) wsRef.current.close();
    }
  }, [selectedAsset, connectWebSocket]);

  const filteredCryptos = search.trim() === ""
    ? cryptos
    : allSymbols.filter(c =>
      c.symbol.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

  const displayedCryptos = search.trim() === ""
    ? filteredCryptos.slice(0, 3)
    : filteredCryptos;

  const handlePlaceOrder = (type: "buy" | "sell") => {
    if (!selectedAsset || !orderAmount || isNaN(parseFloat(orderAmount))) return;
    try {
      executeTrade({
        symbol: `${selectedAsset.symbol}/USDT`,
        type,
        amount: parseFloat(orderAmount),
        price: livePrice || selectedAsset.price
      });
      setOrderAmount("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className={cn("space-y-10 pb-20 transition-all duration-500", selectedAsset ? "pr-[400px]" : "")}>

        {/* Control Header */}
        <div className="shrink-0 flex items-center justify-between gap-6 p-6 rounded-3xl border border-white/[0.04] bg-surface/50 backdrop-blur-2xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] to-transparent pointer-events-none" />

          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Market_Overview</span>
              <h2 className="text-xl font-black font-mono text-white tracking-widest uppercase">Spot Markets</h2>
            </div>
            <div className="h-10 w-[1px] bg-white/[0.06]" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Protocol_Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                <span className="text-xs font-black font-mono text-blue-500 uppercase tracking-widest">NETWORK_LIVE_FEED</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH_10,000+_ASSETS..."
                className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-2.5 pl-11 pr-4 text-[10px] font-black font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/30 focus:bg-black/60 transition-all uppercase tracking-widest"
              />
            </div>
            <button
              onClick={() => setIsLoading(true)}
              className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-black font-mono uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              Sync_Index
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Total_Dominance", value: "BTC: 58.4%", icon: Activity, trend: "+1.2%", trendUp: true },
            { label: "Global_Volume", value: "$84.2B", icon: BarChart3, trend: "+15.8%", trendUp: true, color: "text-blue-500" },
            { label: "Market_Cap", value: "$3.12T", icon: DollarSign, trend: "+2.1%", trendUp: true },
            { label: "Network_Load", value: "OPTIMAL", icon: Cpu, trend: "0.4s Latency", trendUp: true, color: "text-blue-400" },
          ].map((stat, i) => (
            <div key={i} className="p-8 rounded-3xl border border-white/[0.04] bg-surface/30 backdrop-blur-md relative overflow-hidden group hover:border-white/[0.08] transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon className="w-12 h-12 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-4 text-zinc-500">
                <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em]">{stat.label}</span>
              </div>
              <div className={cn("text-3xl font-black font-mono text-white tracking-tighter mb-2", stat.color)}>
                {stat.value}
              </div>
              <div className={cn("text-[10px] font-black font-mono uppercase tracking-widest", stat.trendUp ? "text-emerald-500" : "text-rose-500")}>
                {stat.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Main Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {displayedCryptos.map((crypto) => (
              <CryptoCard
                key={crypto.id}
                crypto={crypto}
                isSelected={selectedAsset?.id === crypto.id}
                onClick={() => setSelectedAsset(selectedAsset?.id === crypto.id ? null : crypto)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State / Hint */}
        {search.trim() === "" && (
          <div className="pt-20 flex flex-col items-center justify-center opacity-40">
            <Globe className="w-12 h-12 text-zinc-700 mb-6" />
            <p className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-[0.5em] text-center max-w-sm leading-relaxed">
              Search over 10,000+ assets indexed from global liquidity pools.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-10 flex items-center justify-center gap-4 opacity-40">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-white/10" />
          <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.5em] italic">Session_Secured_v2.4.1</span>
          <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-white/10" />
        </div>
      </div>

      {/* Execution Sidebar Overlay */}
      <AnimatePresence>
        {selectedAsset && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAsset(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="fixed inset-y-0 right-0 w-[400px] bg-surface/90 backdrop-blur-3xl border-l border-white/[0.08] shadow-2xl p-8 flex flex-col z-50 pt-24"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />

              <div className="flex items-center justify-between mb-10 relative z-10">
                <div className="flex items-center gap-3 text-blue-500">
                  <Zap className="w-5 h-5 fill-blue-500/20" />
                  <span className="text-[12px] font-black font-mono uppercase tracking-[0.2em]">Execution_Node</span>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0 relative z-10">
                <div className="flex flex-col gap-2 mb-8 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-white font-mono tracking-tighter uppercase italic">{selectedAsset.symbol}_Index</h3>
                    <div className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black font-mono text-blue-500 uppercase tracking-widest">LIVE</div>
                  </div>
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">
                    ${(livePrice || selectedAsset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest italic">Network_Consensus</span>
                  </div>
                </div>

                <div className="flex-1 w-full bg-black/40 rounded-3xl overflow-hidden border border-white/[0.05] relative min-h-[250px] mb-8">
                  <TradingViewChart symbol={`${selectedAsset.symbol}USDT`} theme="dark" autosize={true} />
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest block mb-1 text-center">24h_High</span>
                      <span className="text-sm font-black font-mono text-white tracking-widest text-center block">${selectedAsset.high24h.toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest block mb-1 text-center">24h_Low</span>
                      <span className="text-sm font-black font-mono text-white tracking-widest text-center block">${selectedAsset.low24h.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest">Amount</span>
                      <input
                        type="text"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-5 pl-24 pr-6 text-xl font-black font-mono text-white placeholder:text-zinc-800 outline-none focus:border-blue-500/30 transition-all uppercase"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black font-mono text-zinc-500">{selectedAsset.symbol}</div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => handlePlaceOrder("buy")}
                        className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      >
                        Long <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePlaceOrder("sell")}
                        className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-black font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                      >
                        Short <ArrowDownRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
