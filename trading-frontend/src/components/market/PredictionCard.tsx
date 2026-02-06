"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionCardProps {
    question: string;
    volume: string;
    chance: number;
    chartData: { time: string; value: number }[];
    category: "Crypto" | "Macro" | "Tech";
    timeLeft: string;
}

export function PredictionCard({ question, volume, chance, chartData, category, timeLeft }: PredictionCardProps) {
    const isHighChance = chance > 50;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all backdrop-blur-sm"
        >
            <div className="p-4 relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded">
                            {category}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> ${volume} Vol
                        </span>
                    </div>
                    <span className="text-[10px] text-orange-400 font-mono">{timeLeft}</span>
                </div>

                <h3 className="font-semibold text-sm leading-tight mb-4 min-h-[40px]">
                    {question}
                </h3>

                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-2xl font-bold tracking-tighter",
                            isHighChance ? "text-green-400" : "text-red-400"
                        )}>
                            {chance}%
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">Yes Probability</span>
                    </div>

                    <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`grad-${question}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isHighChance ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={isHighChance ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isHighChance ? "#22c55e" : "#ef4444"}
                                    strokeWidth={2}
                                    fill={`url(#grad-${question})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Betting Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    <button className="h-8 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20 transition-colors">
                        Bet YES
                    </button>
                    <button className="h-8 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-colors">
                        Bet NO
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
