"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, DollarSign, Gauge, Target, AlertTriangle } from "lucide-react";
import { useDemoTrading } from "@/lib/useDemoTrading";
import { cn } from "@/lib/utils";

export function PortfolioStatsHeader() {
    const { metrics, balance } = useDemoTrading();

    const stats = [
        {
            label: "Open Positions",
            value: metrics.openPositions,
            icon: Activity,
            color: "text-white"
        },
        {
            label: "Total P&L",
            value: `$${metrics.totalPnL >= 0 ? "+" : ""}${metrics.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: metrics.totalPnL >= 0 ? "text-emerald-500" : "text-rose-500",
            subValue: `Balance: $${balance.toLocaleString()}`
        },
        {
            label: "Avg Leverage",
            value: `${metrics.avgLeverage}x`,
            icon: Gauge,
            color: "text-white"
        },
        {
            label: "Win Rate",
            value: `${metrics.winRate}%`,
            icon: Target,
            color: "text-white"
        },
        {
            label: "Total Margin",
            value: `$${metrics.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: AlertTriangle,
            color: "text-white"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-surface/30 backdrop-blur-md border border-white/[0.04] p-5 rounded-3xl group hover:border-white/[0.08] transition-all relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <stat.icon className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <stat.icon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest">
                            {stat.label}
                        </span>
                    </div>

                    <div className={cn("text-2xl font-black font-mono tracking-tighter", stat.color)}>
                        {stat.value}
                    </div>

                    {stat.subValue && (
                        <div className="text-[9px] font-bold font-mono text-zinc-600 mt-1 uppercase tracking-wider">
                            {stat.subValue}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
