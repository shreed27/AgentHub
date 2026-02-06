"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
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
        blue: { stroke: "#3b82f6", fill: "var(--primary)" },
        green: { stroke: "#22c55e", fill: "var(--primary)" },
        purple: { stroke: "#a855f7", fill: "var(--primary)" },
        orange: { stroke: "#f97316", fill: "var(--primary)" },
    };

    const selectedColor = accentMap[accentColor];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-6 hover:bg-card/80 transition-all duration-500 group shadow-sm hover:shadow-md"
        >
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest leading-none mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-foreground tracking-tighter tabular-nums">{value}</h3>
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shadow-sm transition-colors tabular-nums",
                    isPositive
                        ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10"
                        : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10"
                )}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(change)}%
                </div>
            </div>

            <div className="h-[80px] w-[120%] -ml-[10%] absolute bottom-[-5px] left-0 right-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 grayscale group-hover:grayscale-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`${accentColor}Gradient`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={selectedColor.stroke} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={selectedColor.stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={selectedColor.stroke}
                            strokeWidth={2}
                            fill={`url(#${accentColor}Gradient)`}
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
