"use client";

import { motion } from "framer-motion";
import { Play, Pause, AlertCircle, RefreshCw, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
    id: string;
    name: string;
    type: string;
    status: "active" | "idle" | "error" | "paused";
    performance: number;
    lastAction: string;
}

const agents: Agent[] = [
    { id: "1", name: "Alpha-1", type: "Market Maker", status: "active", performance: 12.5, lastAction: "Placed limit order #X92A" },
    { id: "2", name: "Gamma-Ray", type: "Arbitrage", status: "active", performance: 8.2, lastAction: "Scanning detailed order books" },
    { id: "3", name: "Delta-V", type: "Momentum", status: "paused", performance: -1.2, lastAction: "Paused by risk control" },
];

export function AgentGrid() {
    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    Active Agents
                </h2>
                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full border border-white/5">
                    3 Online
                </span>
            </div>

            {agents.map((agent, i) => (
                <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                >
                    {/* Status Indicator */}
                    <div className="mr-4 relative">
                        <div className={cn(
                            "w-3 h-3 rounded-full",
                            agent.status === "active" ? "bg-green-500 animate-pulse" :
                                agent.status === "paused" ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        {agent.status === "active" && (
                            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground border border-white/10 px-1 rounded">
                                {agent.type}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                            {agent.lastAction}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-muted-foreground uppercase opacity-50">Performance</div>
                            <div className={cn(
                                "text-sm font-bold font-mono",
                                agent.performance >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {agent.performance > 0 ? "+" : ""}{agent.performance}%
                            </div>
                        </div>

                        <button className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
                            {agent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
