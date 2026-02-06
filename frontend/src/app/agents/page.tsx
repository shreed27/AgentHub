"use client";

import { motion } from "framer-motion";
import { Plus, Play, Pause, Settings, BarChart2, MoreVertical, Bot, Zap, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
    id: string;
    name: string;
    type: "Market Maker" | "Arbitrage" | "Sentiment" | "Liquidation";
    status: "active" | "idle" | "error" | "paused";
    uptime: string;
    pnl: number;
    trades: number;
}

const agents: Agent[] = [
    { id: "1", name: "Alpha-1", type: "Market Maker", status: "active", uptime: "4d 12h", pnl: 12450, trades: 1420 },
    { id: "2", name: "Gamma-Ray", type: "Arbitrage", status: "active", uptime: "12h 30m", pnl: 8200, trades: 850 },
    { id: "3", name: "Delta-V", type: "Sentiment", status: "paused", uptime: "0m", pnl: -120, trades: 45 },
    { id: "4", name: "Omega-X", type: "Liquidation", status: "idle", uptime: "1d 4h", pnl: 0, trades: 0 },
    { id: "5", name: "Theta-Prime", type: "Market Maker", status: "active", uptime: "2d 8h", pnl: 5600, trades: 620 },
];

export default function AgentsPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Fleet</h1>
                    <p className="text-muted-foreground">Manage and monitor distributed autonomous trading agents.</p>
                </div>
                <button className="h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-4 h-4" />
                    New Agent
                </button>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agents.map((agent, i) => (
                    <AgentCard key={agent.id} agent={agent} index={i} />
                ))}
            </div>

        </div>
    );
}

function AgentCard({ agent, index }: { agent: Agent, index: number }) {
    const isPositive = agent.pnl >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group backdrop-blur-sm relative overflow-hidden"
        >
            {/* Background Glow */}
            <div className={cn(
                "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none",
                agent.status === 'active' ? "from-green-500 to-emerald-600" :
                    agent.status === 'error' ? "from-red-500 to-rose-600" :
                        "from-blue-500 to-indigo-600"
            )} />

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border border-white/10",
                        agent.status === 'active' ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"
                    )}>
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{agent.name}</h3>
                        <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {agent.type}
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        agent.status === "active" ? "bg-green-500 animate-pulse" :
                            agent.status === "paused" ? "bg-yellow-500" :
                                agent.status === "error" ? "bg-red-500" : "bg-gray-500"
                    )} />
                    {agent.status === "active" && (
                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
                    )}
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Target className="w-3 h-3" /> PnL (24h)
                    </span>
                    <span className={cn("font-mono font-bold", isPositive ? "text-green-400" : "text-red-400")}>
                        {isPositive ? "+" : ""}${agent.pnl.toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Trades
                    </span>
                    <span className="font-mono text-white">{agent.trades}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Uptime
                    </span>
                    <span className="font-mono text-white opacity-70">{agent.uptime}</span>
                </div>
            </div>

            <div className="flex gap-2">
                {agent.status === 'active' ? (
                    <button className="flex-1 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/5 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-white">
                        <Pause className="w-4 h-4" /> Pause
                    </button>
                ) : (
                    <button className="flex-1 h-9 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                        <Play className="w-4 h-4" /> Start
                    </button>
                )}
                <button className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

        </motion.div>
    );
}
