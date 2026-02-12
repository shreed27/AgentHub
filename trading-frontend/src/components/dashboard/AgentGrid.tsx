"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, Cpu, Pause, Play, ChevronRight, Plus } from "lucide-react";
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
        async function fetchAgents() {
            try {
                const sidexResponse = await api.getSidexAgents();
                if (sidexResponse.success && sidexResponse.data && sidexResponse.data.length > 0) {
                    const mappedAgents: Agent[] = sidexResponse.data.map((agent: any) => {
                        const uptimeMs = agent.startedAt ? Date.now() - agent.startedAt : 0;
                        const hours = Math.floor(uptimeMs / 3600000);
                        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
                        const agentStatus: 'active' | 'paused' | 'error' = agent.status === 'running' ? 'active' : agent.status === 'paused' ? 'paused' : 'error';
                        return {
                            id: agent.id,
                            name: agent.name || 'Agent Unit',
                            type: agent.strategy || 'Custom',
                            status: agentStatus,
                            performance: agent.stats?.pnlPercent || agent.stats?.winRate || 0,
                            lastAction: agent.lastTrade ? `Order filled for ${agent.lastTrade.symbol}` : 'Scanning market',
                            uptime: `${hours}h ${minutes}m`
                        };
                    });
                    setAgents(mappedAgents);
                }
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAgents();
        const interval = setInterval(fetchAgents, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 glass-card animate-pulse opacity-20" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
                {agents.map((agent, i) => (
                    <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    <Cpu className="w-6 h-6" />
                                </div>

                                <div>
                                    <h4 className="text-lg font-bold text-white tracking-tight">{agent.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05]">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                agent.status === 'active' ? "bg-[#2dce89]" : "bg-[#ffb800]"
                                            )} />
                                            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-tight">{agent.status}</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-[#424245]">•</span>
                                        <span className="text-[11px] font-bold text-[#86868b]">{agent.type} Strategy</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right flex flex-col items-end">
                                    <div className={cn(
                                        "text-xl font-bold tracking-tight",
                                        agent.performance >= 0 ? "text-[#2dce89]" : "text-[#f53d2d]"
                                    )}>
                                        {agent.performance >= 0 ? "+" : ""}{agent.performance}%
                                    </div>
                                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-tight">Net Performance</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-[#424245] group-hover:text-white transition-colors" />
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.03] flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2 text-[12px] font-medium text-[#86868b]">
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                <span className="italic text-zinc-400 font-medium">{agent.lastAction}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-[#424245]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>UPTIME {agent.uptime}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            <button className="w-full py-6 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all group flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-[#86868b] group-hover:text-white transition-colors">Deploy New Strategy Unit</span>
            </button>
        </div>
    );
}
