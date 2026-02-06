"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
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

    const colors = {
        blue: { stroke: "#3b82f6", fill: "url(#blueGradient)" },
        green: { stroke: "#22c55e", fill: "url(#greenGradient)" },
        purple: { stroke: "#a855f7", fill: "url(#purpleGradient)" },
        orange: { stroke: "#f97316", fill: "url(#orangeGradient)" },
    };

    const selectedColor = colors[accentColor];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6 hover:bg-white/5 transition-all duration-300 group"
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-white tracking-tight">{value}</h3>
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border border-white/5",
                    isPositive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                )}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(change)}%
                </div>
            </div>

            <div className="h-[60px] w-full absolute bottom-0 left-0 right-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={selectedColor.stroke}
                            strokeWidth={2}
                            fill={selectedColor.fill}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
