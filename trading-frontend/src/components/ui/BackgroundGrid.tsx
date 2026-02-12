"use client";

import { motion } from "framer-motion";

export function BackgroundGrid() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black">
            {/* Liquid Blobs */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -100, 50, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]"
            />

            <motion.div
                animate={{
                    x: [0, -150, 50, 0],
                    y: [0, 100, -80, 0],
                    scale: [1, 1.3, 0.8, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px]"
            />

            <motion.div
                animate={{
                    opacity: [0.05, 0.1, 0.05],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_70%)]"
            />

            {/* Mesh Grain Overlay */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none">
                <div className="refined-noise" />
            </div>

            {/* Subtle Grid - very faint, only visible on deep interaction */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                    backgroundSize: '80px 80px'
                }}
            />
        </div>
    );
}
