"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AgentGrid } from "@/components/dashboard/AgentGrid";
import { SignalFeed } from "@/components/trading/SignalFeed";
import { WhaleAlerts } from "@/components/trading/WhaleAlerts";
import { AIReasoning } from "@/components/trading/AIReasoning";
import { AlertTriangle, TrendingUp, Zap, Activity, Layers, Cpu, Play, Rocket, ArrowRight, Sparkles } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
    totalPnL: number;
    totalVolume: number;
    activePositions: number;
    avgExecutionTime: number;
    pnlChange: number;
    volumeChange: number;
}

export default function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);

    const generateSparkline = (value: number, positive: boolean) => {
        const base = Math.max(value / 10, 10);
        return Array.from({ length: 12 }, (_, i) => ({
            value: base + (positive ? Math.sin(i) * 20 + i * 2 : Math.cos(i) * 15 - i) + Math.random() * 10
        }));
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const positionsResponse = await api.getPositions();
                if (positionsResponse.success && positionsResponse.data) {
                    const { summary } = positionsResponse.data;
                    setMetrics({
                        totalPnL: summary.totalUnrealizedPnL,
                        totalVolume: summary.totalValue,
                        activePositions: summary.totalPositions,
                        avgExecutionTime: 42,
                        pnlChange: 8.4,
                        volumeChange: 12.2,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setConnectionError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-16 pb-20 pt-8">
            {/* Professional Header Section */}
            <header className="max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <div className="h-1 w-12 bg-white rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#52525b]">Market Intelligence</span>
                </motion.div>
                <h1 className="text-title mb-6">Execution<br />Command.</h1>
                <p className="text-description">Real-time performance monitoring across decentralized liquidity pools and autonomous trade agents.</p>
            </header>

            {/* Premium CTA Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <Link href="/sidex">
                        <div className="group relative overflow-hidden glass-card p-10 min-h-[320px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-accent-primary/20 transition-all duration-700" />

                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white rounded-full border border-white/10">Simulation</span>
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/10">Secure</span>
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-4 tracking-[-0.03em]">Paper Trading</h2>
                                <p className="text-[#a1a1aa] text-base leading-relaxed max-w-sm">
                                    Execute high-frequency strategies with a $10,000 risk-free virtual balance. Zero latency execution.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-white font-bold text-sm group-hover:gap-4 transition-all duration-300">
                                <span className="underline underline-offset-8 decoration-white/20 group-hover:decoration-white transition-all">Engage Terminal</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    <Link href="/polymarket">
                        <div className="group relative overflow-hidden glass-card p-10 min-h-[320px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />

                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/10">Live Web3</span>
                                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white rounded-full border border-white/10">Prediction</span>
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-4 tracking-[-0.03em]">Predictions</h2>
                                <p className="text-[#a1a1aa] text-base leading-relaxed max-w-sm">
                                    Participate in global outcomes. Politics, crypto markets, and cultural events with real-time settlement.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-white font-bold text-sm group-hover:gap-4 transition-all duration-300">
                                <span className="underline underline-offset-8 decoration-white/20 group-hover:decoration-white transition-all">Launch Markets</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </div>

            {/* Metrics Row - Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-[160px] glass-card animate-pulse shadow-sm" />
                    ))
                ) : (
                    <>
                        <MetricCard
                            title="Total PnL"
                            value={`$ ${(metrics?.totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            change={metrics?.pnlChange || 0}
                            data={generateSparkline(metrics?.totalPnL || 0, true)}
                            accentColor="green"
                        />
                        <MetricCard
                            title="Total Volume"
                            value={`$ ${(metrics?.totalVolume || 0).toLocaleString()}`}
                            change={metrics?.volumeChange || 0}
                            data={generateSparkline(metrics?.totalVolume || 0, true)}
                            accentColor="blue"
                        />
                        <MetricCard
                            title="Active Positions"
                            value={String(metrics?.activePositions || 0)}
                            change={2.4}
                            data={generateSparkline(metrics?.activePositions || 0, true)}
                            accentColor="purple"
                        />
                        <MetricCard
                            title="Avg Latency"
                            value={`${metrics?.avgExecutionTime || 42}ms`}
                            change={-1.2}
                            data={generateSparkline(metrics?.avgExecutionTime || 42, false)}
                            accentColor="orange"
                        />
                    </>
                )}
            </div>

            {/* Main Application Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Section: Signal Intelligence */}
                <div className="lg:col-span-8 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <section className="h-[600px] glass-card p-1">
                            <SignalFeed />
                        </section>
                        <section className="h-[600px] glass-card p-1">
                            <WhaleAlerts />
                        </section>
                    </div>

                    {/* Pro Execution Intelligence */}
                    <section className="glass-card p-10">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                                    <Cpu className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Active Agents</h3>
                                    <p className="text-sm text-[#a1a1aa]">Neural processing units currently in the field.</p>
                                </div>
                            </div>
                        </div>
                        <AgentGrid />
                    </section>
                </div>

                {/* Right Section: Analytics & Reasoning */}
                <aside className="lg:col-span-4 space-y-12 h-full">
                    <AIReasoning />

                    <div className="glass-card p-10 group">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-[0_0_10px_var(--color-accent-primary)]" />
                            <h3 className="text-[11px] font-bold text-white tracking-[0.2em] uppercase">Market Status</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: "Execution Layer", value: "Online", status: "positive" },
                                { label: "Sentiment Index", value: "Neutral", status: "neutral" },
                                { label: "Volatility Rank", value: "Low", status: "neutral" },
                                { label: "Arbitrage Health", value: "Active", status: "positive" }
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b border-white/[0.03] last:border-0 border-dashed">
                                    <span className="text-sm font-medium text-[#a1a1aa]">{stat.label}</span>
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            stat.status === "positive" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                        )} />
                                        <span className="text-sm font-bold text-white tracking-tight">{stat.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
