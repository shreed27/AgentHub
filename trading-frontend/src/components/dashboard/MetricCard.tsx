"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: string;
    change: number;
    data: { value: number }[];
    accentColor: "blue" | "green" | "purple" | "orange";
}

export function MetricCard({ title, value, change, data, accentColor }: MetricCardProps) {
    const isPositive = change >= 0;

    const accentMap = {
        blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.05)" },
        green: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.05)" },
        purple: { stroke: "#8b5cf6", fill: "rgba(139, 92, 246, 0.05)" },
        orange: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.05)" },
    };

    const selectedColor = accentMap[accentColor];

    return (
        <div className="glass-card group p-8 flex flex-col justify-between min-h-[180px] shadow-none hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-bold text-[#52525b] uppercase tracking-[0.2em]">{title}</span>
                    <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md transition-all",
                        isPositive
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                    )}>
                        {isPositive ? "↑" : "↓"} {Math.abs(change)}%
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-white tracking-[-0.04em]">{value}</h3>
            </div>

            {/* Chart Area */}
            <div className="h-[60px] w-full mt-4 -mx-8 mb--8 overflow-hidden relative opacity-40 group-hover:opacity-100 transition-all duration-700">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`${accentColor}Gradient`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={selectedColor.stroke} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={selectedColor.stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={selectedColor.stroke}
                            strokeWidth={1.5}
                            fill={`url(#${accentColor}Gradient)`}
                            isAnimationActive={true}
                            animationDuration={2000}
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Shimmer Effect on Hover */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 shimmer" />
        </div>
    );
}
