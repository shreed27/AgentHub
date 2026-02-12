"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Shield, TrendingUp, Zap, Target } from "lucide-react";

interface GladiatorCardProps {
    name: string;
    rank: string;
    pnl: string;
    winRate: string;
    status: 'Champion' | 'Contender' | 'Veteran';
    className?: string;
}

export function GladiatorCard({ name, rank, pnl, winRate, status, className }: GladiatorCardProps) {
    const isChampion = status === 'Champion';

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "relative p-6 transition-all duration-500",
                isChampion ? "winner-card" : "cyber-card",
                className
            )}
        >
            {/* Status Badge */}
            <div className={cn(
                "absolute top-0 right-0 px-4 py-1 text-[10px] font-orbitron uppercase tracking-widest",
                isChampion ? "bg-gold text-black font-bold" : "bg-white/10 text-white/50"
            )}>
                {status}
            </div>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h3 className={cn(
                        "text-2xl font-orbitron font-black uppercase tracking-tighter mb-1",
                        isChampion ? "text-gold" : "text-white"
                    )}>
                        {name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        <Shield className="w-3 h-3" />
                        Rank #{rank}
                    </div>
                </div>
                <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-none border",
                    isChampion ? "border-gold/50 bg-gold/10" : "border-white/10 bg-white/5"
                )}>
                    {isChampion ? <Zap className="w-6 h-6 text-gold" /> : <Shield className="w-6 h-6 text-zinc-500" />}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-orbitron text-zinc-500 uppercase tracking-widest">Net Yield</p>
                    <p className={cn(
                        "text-xl font-black font-mono tracking-tighter",
                        pnl.startsWith('+') ? "text-neon-green" : "text-neon-red"
                    )}>
                        {pnl}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-orbitron text-zinc-500 uppercase tracking-widest">Win Rate</p>
                    <p className="text-xl font-black font-mono tracking-tighter text-white">
                        {winRate}
                    </p>
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Sync Active</span>
                </div>
                <TrendingUp className={cn("w-4 h-4", isChampion ? "text-gold" : "text-zinc-500")} />
            </div>

            {/* Scanning line for champion */}
            {isChampion && <div className="scan-line opacity-30" />}
        </motion.div>
    );
}
