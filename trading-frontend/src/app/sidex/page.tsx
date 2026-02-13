"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  DollarSign,
  Search,
  RefreshCw,
  Clock,
  BarChart3,
  Globe,
  Cpu,
  ExternalLink,
  Zap,
  Wallet,
  X,
  TrendingUp,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useDemoTrading } from "@/lib/useDemoTrading";

// ==================== Types ====================

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  category?: string;
  description?: string;
}

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function getTimeUntil(dateStr: string): string {
  const now = new Date();
  const end = new Date(dateStr);
  const diff = end.getTime() - now.getTime();

  if (diff < 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo`;
  }
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;
  return "<1h";
}

const MOCK_MARKETS: PolymarketMarket[] = [
  {
    id: "1",
    question: "Will Solana reach $250 before April 2026?",
    slug: "sol-250-apr-2026",
    outcomes: [{ name: "Yes", price: 0.64 }, { name: "No", price: 0.36 }],
    volume24h: 1250000,
    totalVolume: 8500000,
    liquidity: 450000,
    endDate: "2026-04-01T00:00:00Z",
    active: true,
    category: "Crypto"
  },
  {
    id: "2",
    question: "DeepSeek-V4 release before June 2026?",
    slug: "deepseek-v4-release",
    outcomes: [{ name: "Yes", price: 0.42 }, { name: "No", price: 0.58 }],
    volume24h: 890000,
    totalVolume: 3200000,
    liquidity: 210000,
    endDate: "2026-06-01T00:00:00Z",
    active: true,
    category: "AI"
  },
  {
    id: "3",
    question: "US Fed to cut rates in Q2 2026?",
    slug: "fed-rate-cut-q2",
    outcomes: [{ name: "Yes", price: 0.78 }, { name: "No", price: 0.22 }],
    volume24h: 4500000,
    totalVolume: 25000000,
    liquidity: 1200000,
    endDate: "2026-06-30T00:00:00Z",
    active: true,
    category: "Economics"
  },
  {
    id: "4",
    question: "SpaceX Starship orbital success by July?",
    slug: "spacex-starship-orbital",
    outcomes: [{ name: "Yes", price: 0.55 }, { name: "No", price: 0.45 }],
    volume24h: 2100000,
    totalVolume: 12000000,
    liquidity: 850000,
    endDate: "2026-07-15T00:00:00Z",
    active: true,
    category: "Science"
  },
  {
    id: "5",
    question: "DAIN OS v3.0 release in Q3 2026?",
    slug: "dain-v3-release",
    outcomes: [{ name: "Yes", price: 0.92 }, { name: "No", price: 0.08 }],
    volume24h: 560000,
    totalVolume: 1500000,
    liquidity: 300000,
    endDate: "2026-09-30T00:00:00Z",
    active: true,
    category: "Tech"
  }
];

// ==================== Components ====================

function MarketCard({
  market,
  isSelected,
  onClick,
}: {
  market: PolymarketMarket;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden p-8 cursor-pointer transition-all duration-500 rounded-3xl border bg-surface/30 backdrop-blur-md",
        isSelected
          ? "border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
          : "border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] shadow-lg"
      )}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/[0.05] transition-all" />

      {/* Header */}
      <div className="flex justify-between items-start gap-6 mb-8">
        <h3 className="text-lg font-black text-white leading-tight font-mono tracking-tighter group-hover:text-emerald-400 transition-colors">
          {market.question}
        </h3>
        {market.category && (
          <span className="shrink-0 text-[9px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em] border border-white/[0.06] px-2.5 py-1 rounded-lg bg-black/40">
            {market.category}
          </span>
        )}
      </div>

      {/* Prices Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black font-mono text-emerald-500 uppercase tracking-widest">YES</span>
            <span className="text-white text-xl font-black font-mono">{(market.outcomes[0]?.price * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-emerald-500/10 h-1 rounded-full mt-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${market.outcomes[0]?.price * 100}%` }}
              className="bg-emerald-500 h-full"
            />
          </div>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black font-mono text-rose-500 uppercase tracking-widest">NO</span>
            <span className="text-white text-xl font-black font-mono">{(market.outcomes[1]?.price * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-rose-500/10 h-1 rounded-full mt-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${market.outcomes[1]?.price * 100}%` }}
              className="bg-rose-500 h-full"
            />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-6 group-hover:border-white/[0.08] transition-colors">
        <div className="flex gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black font-mono text-zinc-600 uppercase tracking-widest">Volume_24h</span>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-zinc-500" />
              <span className="text-xs font-black font-mono text-white tracking-widest">{formatCurrency(market.volume24h)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/[0.04] pl-6">
            <span className="text-[8px] font-black font-mono text-zinc-600 uppercase tracking-widest">Ends</span>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-rose-500/60" />
              <span className="text-xs font-black font-mono text-rose-500/80 tracking-widest uppercase">{getTimeUntil(market.endDate)}</span>
            </div>
          </div>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all">
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ==================== Main Page ====================

export default function SidexPage() {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [outcomeType, setOutcomeType] = useState<"yes" | "no">("yes");
  const [orderAmount, setOrderAmount] = useState<string>("");

  const { balance, executeTrade, updateLivePrice, positions } = useDemoTrading();

  const selectedPosition = positions.find(p => p.symbol === (selectedMarket ? selectedMarket.slug : ""));

  // Update live prices from fetched markets periodically
  useEffect(() => {
    markets.forEach(market => {
      // For prediction markets, price is the outcome price (0 to 1)
      const price = outcomeType === "yes" ? market.outcomes[0].price : market.outcomes[1].price;
      updateLivePrice(market.slug, price);
    });
  }, [markets, outcomeType, updateLivePrice]);

  // Fetch live markets
  const fetchMarkets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getPolymarketMarkets({
        active: true,
        limit: 12,
        closed: false,
        order: "volume24h",
        ascending: false
      });

      if (response.success && response.data && Array.isArray(response.data)) {
        const transformedMarkets = response.data.map((m: any) => ({
          id: m.id,
          question: m.question,
          slug: m.slug,
          outcomes: JSON.parse(m.outcomes || "[]").map((name: string, idx: number) => ({
            name,
            price: Number(JSON.parse(m.outcomePrices || "[]")[idx]) || 0
          })),
          volume24h: Number(m.volume24h) || 0,
          totalVolume: Number(m.volume) || 0,
          liquidity: Number(m.liquidity) || 0,
          endDate: m.endDate,
          active: m.active,
          category: m.tags?.[0] || "General"
        }));
        setMarkets(transformedMarkets);
      } else {
        setMarkets(MOCK_MARKETS);
      }
    } catch (err) {
      console.warn("Market fetch failed, using mock data:", err);
      setMarkets(MOCK_MARKETS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredMarkets = markets.filter(m =>
    m.question.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase())
  );

  const displayedMarkets = search.trim() === ""
    ? filteredMarkets.slice(0, 3)
    : filteredMarkets;

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000); // Sync more frequently for "Live" feel
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // Add micro-fluctuations to make the UI feel alive (jitter effect)
  useEffect(() => {
    const jitterInterval = setInterval(() => {
      setMarkets(prev => prev.map(m => {
        const outcomes = [...m.outcomes];
        if (outcomes.length >= 2) {
          const change = (Math.random() - 0.5) * 0.005;
          const newPrice0 = Math.max(0.01, Math.min(0.99, outcomes[0].price + change));
          const newPrice1 = 1 - newPrice0;
          return {
            ...m,
            outcomes: [
              { ...outcomes[0], price: newPrice0 },
              { ...outcomes[1], price: newPrice1 }
            ]
          };
        }
        return m;
      }));
    }, 2500);
    return () => clearInterval(jitterInterval);
  }, []);

  const handlePlaceOrder = () => {
    if (!selectedMarket || !orderAmount || isNaN(parseFloat(orderAmount))) return;
    const price = outcomeType === "yes" ? selectedMarket.outcomes[0].price : selectedMarket.outcomes[1].price;
    try {
      executeTrade({
        symbol: selectedMarket.slug,
        type: outcomeType === "yes" ? "buy" : "sell", // Using internal mapping
        amount: parseFloat(orderAmount) / price, // Correcting for share purchase
        price: price
      });
      setOrderAmount("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className={cn("space-y-10 pb-20 transition-all duration-500", selectedMarket ? "pr-[400px]" : "")}>

        {/* Control Header */}
        <div className="shrink-0 flex items-center justify-between gap-6 p-6 rounded-3xl border border-white/[0.04] bg-surface/50 backdrop-blur-2xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] to-transparent pointer-events-none" />

          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Intelligence_Node</span>
              <h2 className="text-xl font-black font-mono text-white tracking-widest uppercase">Sidex_Pro</h2>
            </div>
            <div className="h-10 w-[1px] bg-white/[0.06]" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Protocol_Stream</span>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-black font-mono text-emerald-500 uppercase tracking-widest">POLMARKET_DATA_V4.1</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH_ASSETS..."
                className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-2.5 pl-11 pr-4 text-[10px] font-black font-mono text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/30 focus:bg-black/60 transition-all uppercase tracking-widest"
              />
            </div>
            <button
              onClick={fetchMarkets}
              disabled={isLoading}
              className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-black font-mono uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              Sync_Feed
            </button>
          </div>
        </div>

        {/* High-Level Global Metrics */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Active_Flux", value: markets.length, icon: Activity, trend: "+12.4%", trendUp: true },
            { label: "Global_Volume", value: "$4.18M", icon: BarChart3, trend: "+5.2%", trendUp: true },
            { label: "Open_Interest", value: "$12.8M", icon: DollarSign, trend: "-2.1%", trendUp: false },
            { label: "Network_Grid", value: "ONLINE", icon: Cpu, trend: "99.9% Uptime", trendUp: true, color: "text-emerald-500" },
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

        {/* Main Grid Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {displayedMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                isSelected={selectedMarket?.id === market.id}
                onClick={() => setSelectedMarket(selectedMarket?.id === market.id ? null : market)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Network Verification Footer */}
        <div className="pt-10 flex items-center justify-center gap-4 opacity-40">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-white/10" />
          <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-[0.5em] italic">Sidex_Integrity_Verified_v2.4.1</span>
          <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-white/10" />
        </div>

      </div>

      {/* Prediction Execution Sidebar */}
      <AnimatePresence>
        {selectedMarket && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed top-[100px] bottom-10 right-10 w-[360px] bg-surface/80 backdrop-blur-3xl border border-white/[0.08] rounded-[40px] shadow-2xl p-8 flex flex-col z-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-emerald-500">
                <Target className="w-5 h-5 fill-emerald-500/20" />
                <span className="text-[11px] font-black font-mono uppercase tracking-[0.2em]">Prediction_Entry</span>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-black text-white font-mono tracking-tighter leading-tight mb-8 group-hover:text-emerald-400 transition-colors uppercase italic">
                {selectedMarket.question}
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-10">
                <button
                  onClick={() => setOutcomeType("yes")}
                  className={cn(
                    "h-16 rounded-2xl border font-black font-mono text-xs uppercase tracking-widest transition-all transition-all",
                    outcomeType === "yes"
                      ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10"
                  )}
                >
                  YES ({(selectedMarket.outcomes[0].price * 100).toFixed(0)}%)
                </button>
                <button
                  onClick={() => setOutcomeType("no")}
                  className={cn(
                    "h-16 rounded-2xl border font-black font-mono text-xs uppercase tracking-widest transition-all",
                    outcomeType === "no"
                      ? "bg-rose-500 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                      : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10"
                  )}
                >
                  NO ({(selectedMarket.outcomes[1].price * 100).toFixed(0)}%)
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-widest">Entry_Liquidity ($)</label>
                  <span className="text-[10px] font-black font-mono text-emerald-500/60 uppercase tracking-widest">Balance: ${balance.toLocaleString()}</span>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="AMOUNT_USD"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-3xl py-6 px-8 text-2xl font-black font-mono text-white placeholder:text-zinc-800 focus:border-emerald-500/30 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1 text-[10px] font-mono text-zinc-500">
                    <span className="uppercase tracking-widest">Estimated_Shares</span>
                    <span className="text-white">
                      {(parseFloat(orderAmount || "0") / (outcomeType === "yes" ? selectedMarket.outcomes[0].price : selectedMarket.outcomes[1].price)).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    className={cn(
                      "w-full h-20 rounded-[32px] font-black text-[12px] uppercase tracking-[0.3em] shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex flex-col items-center justify-center",
                      outcomeType === "yes"
                        ? "bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                        : "bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                    )}
                  >
                    Deploy_Prediction
                    <span className="text-[8px] opacity-60 mt-1 font-mono uppercase italic">Secure_On_Chain_Node</span>
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-white/[0.04] space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest">Active_Position</span>
                    <BarChart3 className="w-4 h-4 text-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-600">SHARES_HEDGED</span>
                      <span className="text-white font-black">{selectedPosition ? selectedPosition.amount.toFixed(2) : "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-600">UNREALIZED_PNL</span>
                      <span className={cn("font-black", (selectedPosition?.unrealizedPnL || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        ${(selectedPosition?.unrealizedPnL || 0) >= 0 ? "+" : ""}{(selectedPosition?.unrealizedPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] font-mono text-zinc-500 leading-relaxed italic">Verified market depth satisfies liquidity requirements for deployment. Executing across decentralized oracle nodes.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
