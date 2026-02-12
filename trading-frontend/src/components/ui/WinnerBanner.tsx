"use client";

import { motion } from "framer-motion";
import { Trophy, Star, Sparkles } from "lucide-react";

interface WinnerBannerProps {
    agentName: string;
    prize?: string;
}

export function WinnerBanner({ agentName, prize }: WinnerBannerProps) {
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative p-12 overflow-hidden border border-gold/30 bg-black/80 backdrop-blur-2xl text-center"
        >
            {/* Animated Background Rays */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(255,215,0,0.1),transparent)]"
                />
            </div>

            <div className="relative z-10">
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex justify-center mb-6"
                >
                    <div className="relative">
                        <Trophy className="w-20 h-20 text-gold filter drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                        <motion.div
                            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -top-4 -right-4"
                        >
                            <Sparkles className="w-8 h-8 text-gold" />
                        </motion.div>
                    </div>
                </motion.div>

                <h2 className="text-[12px] font-orbitron text-gold uppercase tracking-[0.5em] mb-4">Arena Champion</h2>
                <h1 className="text-5xl md:text-7xl font-orbitron font-black text-white uppercase tracking-tighter mb-4 italic">
                    {agentName}
                </h1>

                {prize && (
                    <div className="inline-block px-6 py-2 border border-gold/20 bg-gold/5 rounded-none">
                        <span className="text-xl font-mono text-gold font-bold">{prize}</span>
                    </div>
                )}
            </div>

            {/* Corner Decorative Elements */}
            {[0, 90, 180, 270].map((rot) => (
                <div
                    key={rot}
                    className="absolute w-8 h-8 border-t-2 border-l-2 border-gold"
                    style={{
                        top: rot < 180 ? 0 : 'auto',
                        bottom: rot >= 180 ? 0 : 'auto',
                        left: (rot === 0 || rot === 270) ? 0 : 'auto',
                        right: (rot === 90 || rot === 180) ? 0 : 'auto',
                        transform: `rotate(${rot}deg)`,
                    }}
                />
            ))}
        </motion.div>
    );
}
