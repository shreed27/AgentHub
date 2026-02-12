"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Search,
  RefreshCw,
  AlertTriangle,
  Zap,
  X,
  ChevronRight,
  Clock,
  BarChart3,
  Users,
  Wallet,
  Target,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  Globe,
  Building2,
  Gamepad2,
  Cpu,
  Beaker,
  Banknote,
  Film,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// ==================== Types ====================

interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: Array<{
    tokenId: string;
    name: string;
    price: number;
  }>;
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  category?: string;
}

interface PolymarketPosition {
  id: string;
  platform: "polymarket";
  marketId: string;
  marketQuestion?: string;
  outcome: "yes" | "no";
  shares: number;
  entryPrice: number;
  currentPrice: number;
  cost: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

// ==================== Demo Data ====================

const DEMO_MARKETS: PolymarketMarket[] = [
  {
    id: "demo-trump-2024",
    question: "Will Donald Trump win the 2024 Presidential Election?",
    slug: "trump-2024",
    outcomes: [
      { tokenId: "yes-trump", name: "Yes", price: 0.52 },
      { tokenId: "no-trump", name: "No", price: 0.48 },
    ],
    volume24h: 2_450_000,
    totalVolume: 89_000_000,
    liquidity: 4_200_000,
    endDate: "2024-11-05T00:00:00Z",
    active: true,
    category: "politics",
  },
  {
    id: "demo-btc-100k",
    question: "Will Bitcoin exceed $100,000 by December 31, 2024?",
    slug: "btc-100k-2024",
    outcomes: [
      { tokenId: "yes-btc", name: "Yes", price: 0.38 },
      { tokenId: "no-btc", name: "No", price: 0.62 },
    ],
    volume24h: 890_000,
    totalVolume: 24_500_000,
    liquidity: 1_800_000,
    endDate: "2024-12-31T23:59:59Z",
    active: true,
    category: "crypto",
  },
  {
    id: "demo-fed-rate",
    question: "Will the Federal Reserve cut rates in March 2025?",
    slug: "fed-rate-march-2025",
    outcomes: [
      { tokenId: "yes-fed", name: "Yes", price: 0.67 },
      { tokenId: "no-fed", name: "No", price: 0.33 },
    ],
    volume24h: 456_000,
    totalVolume: 8_900_000,
    liquidity: 920_000,
    endDate: "2025-03-19T00:00:00Z",
    active: true,
    category: "economy",
  },
  {
    id: "demo-eth-10k",
    question: "Will Ethereum reach $10,000 before 2026?",
    slug: "eth-10k-2025",
    outcomes: [
      { tokenId: "yes-eth", name: "Yes", price: 0.24 },
      { tokenId: "no-eth", name: "No", price: 0.76 },
    ],
    volume24h: 320_000,
    totalVolume: 5_600_000,
    liquidity: 680_000,
    endDate: "2025-12-31T23:59:59Z",
    active: true,
    category: "crypto",
  },
  {
    id: "demo-superbowl",
    question: "Will the Kansas City Chiefs win Super Bowl 2025?",
    slug: "superbowl-2025-chiefs",
    outcomes: [
      { tokenId: "yes-chiefs", name: "Yes", price: 0.31 },
      { tokenId: "no-chiefs", name: "No", price: 0.69 },
    ],
    volume24h: 780_000,
    totalVolume: 12_300_000,
    liquidity: 1_450_000,
    endDate: "2025-02-09T00:00:00Z",
    active: true,
    category: "sports",
  },
  {
    id: "demo-agi-2025",
    question: "Will OpenAI announce AGI by end of 2025?",
    slug: "agi-2025",
    outcomes: [
      { tokenId: "yes-agi", name: "Yes", price: 0.08 },
      { tokenId: "no-agi", name: "No", price: 0.92 },
    ],
    volume24h: 234_000,
    totalVolume: 3_400_000,
    liquidity: 420_000,
    endDate: "2025-12-31T23:59:59Z",
    active: true,
    category: "science",
  },
  {
    id: "demo-sol-flip",
    question: "Will Solana flip Ethereum market cap in 2025?",
    slug: "sol-flip-eth-2025",
    outcomes: [
      { tokenId: "yes-sol", name: "Yes", price: 0.12 },
      { tokenId: "no-sol", name: "No", price: 0.88 },
    ],
    volume24h: 567_000,
    totalVolume: 7_800_000,
    liquidity: 890_000,
    endDate: "2025-12-31T23:59:59Z",
    active: true,
    category: "crypto",
  },
  {
    id: "demo-recession",
    question: "Will the US enter a recession by Q4 2025?",
    slug: "us-recession-2025",
    outcomes: [
      { tokenId: "yes-recess", name: "Yes", price: 0.29 },
      { tokenId: "no-recess", name: "No", price: 0.71 },
    ],
    volume24h: 345_000,
    totalVolume: 6_200_000,
    liquidity: 720_000,
    endDate: "2025-10-01T00:00:00Z",
    active: true,
    category: "economy",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Markets", icon: Globe },
  { id: "politics", label: "Politics", icon: Building2 },
  { id: "crypto", label: "Crypto", icon: Banknote },
  { id: "sports", label: "Sports", icon: Gamepad2 },
  { id: "economy", label: "Economy", icon: BarChart3 },
  { id: "science", label: "Science", icon: Beaker },
  { id: "entertainment", label: "Entertainment", icon: Film },
  { id: "tech", label: "Technology", icon: Cpu },
];

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m`;
}

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
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");
  const yesPrice = yesOutcome?.price ?? 0.5;
  const noPrice = noOutcome?.price ?? 0.5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border cursor-pointer transition-all duration-300",
        isSelected
          ? "bg-white/[0.08] border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]"
      )}
    >
      {/* Question */}
      <h3 className="text-[15px] font-semibold text-white mb-4 leading-snug line-clamp-2">
        {market.question}
      </h3>

      {/* Prices */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-green-500/10 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-400">YES</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1">
            {(yesPrice * 100).toFixed(0)}%
          </p>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            ${yesPrice.toFixed(2)}
          </p>
        </div>
        <div className="flex-1 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400">NO</span>
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-xl font-bold text-white mt-1">
            {(noPrice * 100).toFixed(0)}%
          </p>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            ${noPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-[11px] text-[#86868b]">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>{formatCurrency(market.volume24h)} 24h</span>
        </div>
        <div className="flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          <span>{formatCurrency(market.liquidity)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{getTimeUntil(market.endDate)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function TradingPanel({
  market,
  onClose,
  onTrade,
  isTrading,
}: {
  market: PolymarketMarket | null;
  onClose: () => void;
  onTrade: (side: "yes" | "no", amount: number) => void;
  isTrading: boolean;
}) {
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");

  if (!market) return null;

  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");
  const selectedPrice =
    selectedSide === "yes"
      ? yesOutcome?.price ?? 0.5
      : noOutcome?.price ?? 0.5;
  const amountNum = parseFloat(amount) || 0;
  const shares = amountNum > 0 ? amountNum / selectedPrice : 0;
  const potentialPayout = shares;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sticky top-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 pr-4">
          <h3 className="text-sm font-bold text-white mb-1">Trade</h3>
          <p className="text-xs text-[#86868b] line-clamp-2">
            {market.question}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-4 h-4 text-[#86868b]" />
        </button>
      </div>

      {/* Side Selection */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          onClick={() => setSelectedSide("yes")}
          className={cn(
            "p-4 rounded-xl border transition-all duration-200",
            selectedSide === "yes"
              ? "bg-green-500/20 border-green-500/50"
              : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2
              className={cn(
                "w-5 h-5",
                selectedSide === "yes" ? "text-green-400" : "text-[#86868b]"
              )}
            />
            <span
              className={cn(
                "font-bold text-lg",
                selectedSide === "yes" ? "text-green-400" : "text-white"
              )}
            >
              YES
            </span>
          </div>
          <p className="text-xl font-bold text-white mt-2">
            ${(yesOutcome?.price ?? 0.5).toFixed(2)}
          </p>
        </button>
        <button
          onClick={() => setSelectedSide("no")}
          className={cn(
            "p-4 rounded-xl border transition-all duration-200",
            selectedSide === "no"
              ? "bg-red-500/20 border-red-500/50"
              : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <XCircle
              className={cn(
                "w-5 h-5",
                selectedSide === "no" ? "text-red-400" : "text-[#86868b]"
              )}
            />
            <span
              className={cn(
                "font-bold text-lg",
                selectedSide === "no" ? "text-red-400" : "text-white"
              )}
            >
              NO
            </span>
          </div>
          <p className="text-xl font-bold text-white mt-2">
            ${(noOutcome?.price ?? 0.5).toFixed(2)}
          </p>
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="text-xs font-medium text-[#86868b] mb-2 block">
          Amount (USD)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-9 pr-4 text-white placeholder-[#86868b] focus:outline-none focus:border-blue-500/50"
          />
        </div>
        {/* Quick amounts */}
        <div className="flex gap-2 mt-2">
          {[25, 50, 100, 250].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(String(val))}
              className="flex-1 py-1.5 text-xs font-medium text-[#86868b] bg-white/[0.03] rounded-lg hover:bg-white/[0.05] hover:text-white transition-colors"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Estimate */}
      <div className="bg-white/[0.02] rounded-xl p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#86868b]">Est. Shares</span>
          <span className="text-white font-medium">{shares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#86868b]">Potential Payout</span>
          <span className="text-green-400 font-medium">
            ${potentialPayout.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#86868b]">Potential Profit</span>
          <span className="text-green-400 font-medium">
            +${(potentialPayout - amountNum).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trade Button */}
      <button
        onClick={() => onTrade(selectedSide, amountNum)}
        disabled={amountNum <= 0 || isTrading}
        className={cn(
          "w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200",
          selectedSide === "yes"
            ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
            : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400",
          (amountNum <= 0 || isTrading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isTrading ? (
          <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
        ) : (
          `Buy ${selectedSide.toUpperCase()} for $${amountNum.toFixed(2)}`
        )}
      </button>

      {/* Paper trading notice */}
      <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-[#86868b]">
        <Sparkles className="w-3 h-3 text-blue-400" />
        <span>Paper trading - No real money at risk</span>
      </div>
    </motion.div>
  );
}

function PositionCard({
  position,
  onClose,
  isClosing,
}: {
  position: PolymarketPosition;
  onClose: () => void;
  isClosing: boolean;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-white line-clamp-1">
            {position.marketQuestion || position.marketId}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                position.outcome === "yes"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              )}
            >
              {position.outcome}
            </span>
            <span className="text-[11px] text-[#86868b]">
              {position.shares.toFixed(2)} shares
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-bold",
              position.pnl >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
          </p>
          <p className="text-[11px] text-[#86868b]">
            {position.pnlPercent >= 0 ? "+" : ""}
            {position.pnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-[#86868b] mb-3">
        <span>Entry: ${position.entryPrice.toFixed(2)}</span>
        <span>Current: ${position.currentPrice.toFixed(2)}</span>
      </div>
      <button
        onClick={onClose}
        disabled={isClosing}
        className="w-full py-2 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        {isClosing ? "Closing..." : "Close Position"}
      </button>
    </div>
  );
}

// ==================== Main Page ====================

export default function PolymarketPage() {
  // State
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const [closingPositionId, setClosingPositionId] = useState<string | null>(
    null
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "demo" | "error"
  >("demo");
  const [totalPnl, setTotalPnl] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      const response = await api.getPolymarketMarkets({ active: true, limit: 50 });
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        setMarkets(response.data);
        setConnectionStatus("connected");
      } else {
        // Use demo data
        setMarkets(DEMO_MARKETS);
        setConnectionStatus("demo");
      }
    } catch (error) {
      console.error("Failed to fetch markets:", error);
      setMarkets(DEMO_MARKETS);
      setConnectionStatus("demo");
    } finally {
      setIsLoading(false);
      setLastRefresh(Date.now());
    }
  }, []);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    try {
      const response = await api.getSidexPolymarketPositions();
      if (response.success && response.data && Array.isArray(response.data)) {
        setPositions(response.data);
        const total = response.data.reduce(
          (sum: number, p: PolymarketPosition) => sum + (p.pnl || 0),
          0
        );
        setTotalPnl(total);
      }
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchMarkets();
    fetchPositions();

    const interval = setInterval(() => {
      fetchMarkets();
      fetchPositions();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMarkets, fetchPositions]);

  // Filter markets
  const filteredMarkets = markets.filter((market) => {
    const matchesCategory =
      selectedCategory === "all" || market.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      market.question.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Trade handler
  const handleTrade = async (side: "yes" | "no", amount: number) => {
    if (!selectedMarket || amount <= 0) return;

    setIsTrading(true);
    try {
      const response = await api.sidexTradePolymarket({
        marketId: selectedMarket.id,
        side,
        shares: amount / (side === "yes"
          ? (selectedMarket.outcomes.find(o => o.name.toLowerCase() === "yes")?.price ?? 0.5)
          : (selectedMarket.outcomes.find(o => o.name.toLowerCase() === "no")?.price ?? 0.5)),
      });

      if (response.success) {
        // Refresh positions
        await fetchPositions();
        setSelectedMarket(null);
      } else {
        console.error("Trade failed:", response.error);
      }
    } catch (error) {
      console.error("Trade error:", error);
    } finally {
      setIsTrading(false);
    }
  };

  // Close position handler
  const handleClosePosition = async (positionId: string) => {
    setClosingPositionId(positionId);
    try {
      const response = await api.sidexClosePolymarket(positionId);
      if (response.success) {
        await fetchPositions();
      }
    } catch (error) {
      console.error("Close position error:", error);
    } finally {
      setClosingPositionId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 pt-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-apple-title text-5xl md:text-6xl font-bold tracking-tight">
              Polymarket
            </h1>
            <div
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                connectionStatus === "connected"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : connectionStatus === "demo"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              )}
            >
              {connectionStatus === "connected" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </>
              ) : connectionStatus === "demo" ? (
                <>
                  <Sparkles className="w-3 h-3" />
                  Demo
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Error
                </>
              )}
            </div>
          </div>
          <p className="text-[#86868b] text-lg font-medium">
            Live prediction markets with real-time data
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchMarkets();
              fetchPositions();
            }}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-[#86868b]" />
          </button>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-sm text-[#86868b] hover:text-white"
          >
            <ExternalLink className="w-4 h-4" />
            <span>polymarket.com</span>
          </a>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#86868b] mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(
              markets.reduce((sum, m) => sum + m.totalVolume, 0)
            )}
          </p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#86868b] mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Active Markets</span>
          </div>
          <p className="text-2xl font-bold text-white">{markets.length}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#86868b] mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">Your Positions</span>
          </div>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#86868b] mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Total P&L</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              totalPnl >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 pl-11 pr-4 text-white placeholder-[#86868b] focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all duration-200",
                  selectedCategory === cat.id
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/[0.02] text-[#86868b] border border-white/[0.05] hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Markets List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {selectedCategory === "all"
                ? "All Markets"
                : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <span className="text-sm text-[#86868b]">
              {filteredMarkets.length} markets
            </span>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[180px] bg-white/[0.02] rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
              <p className="text-[#86868b]">No markets found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {filteredMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    isSelected={selectedMarket?.id === market.id}
                    onClick={() =>
                      setSelectedMarket(
                        selectedMarket?.id === market.id ? null : market
                      )
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Trading Panel */}
          <AnimatePresence>
            {selectedMarket && (
              <TradingPanel
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
                onTrade={handleTrade}
                isTrading={isTrading}
              />
            )}
          </AnimatePresence>

          {/* Positions */}
          {positions.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Your Positions</h3>
                <span
                  className={cn(
                    "text-sm font-bold",
                    totalPnl >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                </span>
              </div>
              <div className="space-y-3">
                {positions.map((position) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    onClose={() => handleClosePosition(position.id)}
                    isClosing={closingPositionId === position.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Help Card */}
          {!selectedMarket && positions.length === 0 && (
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  How to Trade
                </h3>
              </div>
              <ol className="space-y-3 text-sm text-[#86868b]">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-xs text-white">
                    1
                  </span>
                  <span>Select a market from the list</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-xs text-white">
                    2
                  </span>
                  <span>Choose YES or NO based on your prediction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-xs text-white">
                    3
                  </span>
                  <span>Enter your trade amount and execute</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-xs text-white">
                    4
                  </span>
                  <span>Track your positions and P&L in real-time</span>
                </li>
              </ol>
              <div className="mt-4 pt-4 border-t border-white/[0.05] text-[11px] text-[#86868b]">
                This is paper trading - no real money is at risk.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
