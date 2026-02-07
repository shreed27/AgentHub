"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Play, Pause, Settings, Zap, Shield, Target, Cpu, Activity, Signal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Agent {
    id: string;
    name: string;
    type: string;
    status: string;
    pnl: number;
    trades: number;
    winRate: number;
    createdAt?: number;
}

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAgents = async () => {
        try {
            const response = await api.getAgents();
            if (response.success && response.data) {
                const agentList = response.data.map(a => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    status: a.status,
                    pnl: a.performance?.totalPnL || 0,
                    trades: a.performance?.totalTrades || 0,
                    winRate: a.performance?.winRate || 0,
                }));
                setAgents(agentList);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleStatus = async (agentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const response = await api.updateAgentStatus(agentId, newStatus);
            if (response.success) {
                setAgents(prev => prev.map(a =>
                    a.id === agentId ? { ...a, status: newStatus } : a
                ));
            }
        } catch (error) {
            console.error('Failed to update agent status:', error);
        }
    };
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-blue-400" /> Agent Fleet
                    </h1>
                    <p className="text-muted-foreground">Manage and monitor distributed autonomous trading agents.</p>
                </div>
                <button className="h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95 border border-blue-400/20">
                    <Plus className="w-4 h-4" />
                    New Agent
                </button>
            </div>

            {/* Agent Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : agents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {agents.map((agent, i) => (
                        <AgentCard key={agent.id} agent={agent} index={i} onToggleStatus={handleToggleStatus} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Cpu className="w-12 h-12 mb-4 opacity-50" />
                    <p>No agents deployed yet</p>
                    <p className="text-sm mt-1">Click "New Agent" to create your first agent</p>
                </div>
            )}

        </div>
    );
}

function AgentCard({ agent, index, onToggleStatus }: { agent: Agent, index: number, onToggleStatus: (id: string, status: string) => void }) {
    const isPositive = agent.pnl >= 0;
    const isActive = agent.status === 'active';

    // Smoother simulated sparkline
    const sparklinePath = isPositive
        ? "M0,35 C30,35 30,15 60,15 C90,15 90,5 120,5"
        : "M0,5 C30,5 30,25 60,25 C90,25 90,35 120,35";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative h-[340px] rounded-2xl border border-border/60 bg-card hover:border-primary/20 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 flex flex-col"
        >
            {/* Dynamic Status Glow */}
            {isActive && (
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-green-500/10 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            )}

            <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-sm",
                            isActive
                                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 group-hover:scale-110 group-hover:bg-green-500/20"
                                : "bg-muted/50 border-border text-muted-foreground"
                        )}>
                            <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-foreground tracking-tight">{agent.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                                    isActive ? "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" : "text-muted-foreground bg-muted"
                                )}>
                                    {agent.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Metric - Clean Layout */}
                <div className="flex items-baseline justify-between mb-8">
                    <div>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Net PnL</div>
                        <div className={cn("text-3xl font-bold tracking-tighter tabular-nums", isPositive ? "text-foreground" : "text-foreground")}>
                            {isPositive ? "+" : ""}${agent.pnl.toLocaleString()}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Win Rate</div>
                        <div className={cn("text-xl font-bold tracking-tight tabular-nums", isPositive ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                            {agent.winRate}%
                        </div>
                    </div>
                </div>

                {/* Visualization Area */}
                <div className="flex-1 relative -mx-6 mt-auto">
                    <div className="h-full w-full opacity-30 group-hover:opacity-100 transition-opacity duration-500">
                        <svg className="w-full h-[80px]" preserveAspectRatio="none" viewBox="0 0 120 40">
                            <defs>
                                <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <path d={sparklinePath} fill="none" stroke={isPositive ? "#22c55e" : "#ef4444"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            <path d={`${sparklinePath} L120,40 L0,40 Z`} fill={`url(#grad-${index})`} stroke="none" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Subtle Footer */}
            <div className="p-4 border-t border-border/40 bg-muted/5 flex gap-3">
                <button
                    onClick={() => onToggleStatus(agent.id, agent.status)}
                    className={cn(
                        "flex-1 h-9 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-all shadow-sm active:scale-[0.98]",
                        isActive
                            ? "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-border hover:border-zinc-400 dark:hover:border-zinc-500"
                            : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
                    )}
                >
                    {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isActive ? "Pause Agent" : "Deploy Algorithm"}
                </button>
                <button className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
