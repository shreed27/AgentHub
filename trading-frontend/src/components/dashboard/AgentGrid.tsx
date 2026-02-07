"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, AlertCircle, RefreshCw, Cpu, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Agent {
    id: string;
    name: string;
    type: string;
    status: "active" | "idle" | "error" | "paused";
    performance: number;
    lastAction: string;
}

export function AgentGrid() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAgents() {
            try {
                const response = await api.getAgents();
                if (response.success && response.data) {
                    setAgents(response.data.map((a: { id: string; name: string; type: string; status: string; performance?: { winRate?: number } }) => ({
                        id: a.id,
                        name: a.name,
                        type: a.type,
                        status: a.status as "active" | "idle" | "error" | "paused",
                        performance: a.performance?.winRate || 0,
                        lastAction: a.status === "active" ? "Monitoring markets" : "Paused",
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch agents:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAgents();
        const interval = setInterval(fetchAgents, 15000);
        return () => clearInterval(interval);
    }, []);
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (agents.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Cpu className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No agents deployed</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" />
                    Active Agents ({agents.length})
                </h2>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Online</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {agents.map((agent, i) => (
                    <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative flex items-center p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card hover:border-border/80 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                        <div className="mr-3 relative z-10">
                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-sm",
                                agent.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                                    agent.status === "paused" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400"
                            )}>
                                <Cpu className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-sm truncate text-foreground">{agent.name}</h3>
                                {agent.status === "active" && (
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                <span className="uppercase tracking-wider opacity-70">{agent.type}</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                                <span className="truncate opacity-50 font-normal">{agent.lastAction}</span>
                            </div>
                        </div>

                        <div className="text-right pl-4 relative z-10 min-w-[70px]">
                            <div className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-0.5">Yield</div>
                            <div className={cn(
                                "text-sm font-bold tracking-tight tabular-nums",
                                agent.performance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {agent.performance > 0 ? "+" : ""}{agent.performance}%
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
