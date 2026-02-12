"use client";

import { motion } from "framer-motion";
import { Trophy, Sword, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColosseumHeaderProps {
    title: string;
    subtitle?: string;
}

export function ColosseumHeader({ title, subtitle }: ColosseumHeaderProps) {
    return (
        <div className="relative py-12 mb-12 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.1),transparent_70%)] pointer-events-none" />

            <div className="container relative z-10 mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="inline-flex items-center gap-4 mb-6 px-4 py-1 border border-gold/30 bg-gold/5 rounded-full"
                >
                    <Trophy className="w-4 h-4 text-gold" />
                    <span className="text-[10px] font-orbitron uppercase tracking-[0.3em] text-gold/80">Arena Status: Active</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="text-6xl md:text-8xl font-orbitron font-black tracking-tighter mb-4 text-warrior"
                >
                    {title}
                </motion.h1>

                {subtitle && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="text-zinc-500 font-exo2 text-lg md:text-xl max-w-2xl mx-auto uppercase tracking-widest"
                    >
                        {subtitle}
                    </motion.p>
                )}


            </div>

            {/* Decorative Side Elements */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-64 border-y border-r border-gold/10 opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-32 h-64 border-y border-l border-gold/10 opacity-20 pointer-events-none" />
        </div>
    );
}
