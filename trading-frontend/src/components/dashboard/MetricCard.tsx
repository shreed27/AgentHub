"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: string;
    change: number;
    data: { value: number }[];
    accentColor: "blue" | "green" | "purple" | "orange" | "emerald" | "amber";
}

export function MetricCard({ title, value, change, data, accentColor }: MetricCardProps) {
    const isPositive = change >= 0;

    const accentMap: Record<string, { stroke: string, fill: string }> = {
        blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.1)" },
        green: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.1)" },
        emerald: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.1)" },
        purple: { stroke: "#8b5cf6", fill: "rgba(139, 92, 246, 0.1)" },
        orange: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.1)" },
        amber: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.1)" },
    };

    const selectedColor = accentMap[accentColor] || accentMap.blue;

    return (
        <div className="group relative p-6 border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent overflow-hidden hover:border-white/10 transition-all duration-500">
            {/* Technical Corner Markers - Framer Style svg */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-white/10 group-hover:border-white/30 transition-colors" />
            <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-white/10 group-hover:border-white/30 transition-colors" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-white/10 group-hover:border-white/30 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-white/10 group-hover:border-white/30 transition-colors" />

            <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-zinc-700">//</span> {title}
                    </span>
                    <div className={cn(
                        "font-mono text-[10px] flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-white/[0.02] border border-white/5",
                        isPositive ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {isPositive ? "+" : ""}{change}%
                        <span className={cn(
                            "w-1 h-1 rounded-full animate-pulse",
                            isPositive ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                    </div>
                </div>

                <div className="mt-2 mb-4">
                    <h3 className="text-3xl font-sans font-medium text-white tracking-tight">
                        {value}
                    </h3>
                </div>

                {/* Micro Chart */}
                <div className="h-[40px] w-full -mb-2 opacity-40 group-hover:opacity-100 transition-opacity duration-500 mask-image-b">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`gradient-${accentColor}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={selectedColor.stroke} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={selectedColor.stroke} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={selectedColor.stroke}
                                strokeWidth={1.5}
                                fill={`url(#gradient-${accentColor})`}
                                isAnimationActive={true}
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
    );
}
