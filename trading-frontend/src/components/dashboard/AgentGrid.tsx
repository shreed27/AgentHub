"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, Cpu, Play, ChevronRight, Plus, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Agent {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'paused' | 'error';
    performance: number;
    lastAction: string;
    uptime: string;
}

export function AgentGrid() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch agents logic here (mock for now to match structure)
        const mockAgents: Agent[] = [
            { id: "1", name: "ALPHA_PRIME", type: "MOMENTUM_V4", status: "active", performance: 12.4, lastAction: "BUY BTC @ 68200", uptime: "12h 45m" },
            { id: "2", name: "SCALPER_X", type: "HFT_ARBITRAGE", status: "active", performance: 5.8, lastAction: "SELL ETH/SOL", uptime: "4h 12m" },
            { id: "3", name: "SENTINEL_AI", type: "SENTIMENT_LLM", status: "paused", performance: -1.2, lastAction: "HALTED: LOW VOL", uptime: "0h 00m" }
        ];
        setAgents(mockAgents);
        setLoading(false);
    }, []);

    if (loading) {
        return <div className="animate-pulse h-[200px] bg-white/5" />;
    }

    return (
        <div className="flex flex-col bg-surface/50 border border-white/[0.04] rounded-2xl overflow-hidden backdrop-blur-sm shadow-lg relative">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />

            <div className="p-5 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                    <h3 className="text-xs font-black font-mono text-white tracking-[0.2em] uppercase">Deployment_Status</h3>
                </div>
                <div className="text-[10px] font-black font-mono text-zinc-500 tracking-widest bg-white/[0.03] px-2 py-1 rounded-md">
                    UNITS: {agents.filter(a => a.status === 'active').length}/{agents.length}
                </div>
            </div>

            <div className="flex-1 p-5 space-y-4">
                <AnimatePresence mode="popLayout">
                    {agents.map((agent) => (
                        <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/[0.05] group-hover:bg-emerald-500 transition-all duration-500" />

                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-500",
                                    agent.status === 'active'
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500 group-hover:text-black"
                                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                                )}>
                                    <Terminal className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black font-mono text-white tracking-normal group-hover:text-emerald-400 transition-colors uppercase italic">{agent.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest">Protocol:</span>
                                        <span className="text-[9px] font-black font-mono text-zinc-400 uppercase tracking-widest">{agent.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-10 mt-4 md:mt-0">
                                <div className="flex flex-col items-end min-w-[70px]">
                                    <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest mb-1">State</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("w-1 h-1 rounded-full animate-pulse", agent.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500')} />
                                        <span className={cn(
                                            "text-[10px] font-black font-mono uppercase tracking-widest",
                                            agent.status === 'active' ? "text-emerald-500" : "text-amber-500"
                                        )}>{agent.status}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end min-w-[70px]">
                                    <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest mb-1">Return</span>
                                    <span className={cn(
                                        "text-[10px] font-black font-mono tracking-wider",
                                        agent.performance >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>{agent.performance >= 0 ? "+" : ""}{agent.performance}%</span>
                                </div>
                                <div className="hidden lg:flex flex-col items-end min-w-[140px]">
                                    <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest mb-1">Last_Operation</span>
                                    <span className="text-[10px] font-black font-mono text-white/70 truncate max-w-[140px] uppercase italic">{agent.lastAction}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="p-5 border-t border-white/[0.04] bg-white/[0.01]">
                <button className="w-full flex items-center justify-center gap-3 py-3 text-[10px] font-black font-mono text-zinc-500 hover:text-white hover:bg-emerald-500/10 transition-all rounded-xl border border-dashed border-white/5 hover:border-emerald-500/30 uppercase tracking-[0.2em] group">
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    Initialize_Agent_Unit
                </button>
            </div>
        </div>
    );
}
