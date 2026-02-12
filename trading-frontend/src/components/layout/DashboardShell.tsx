"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-white flex selection:bg-accent-primary/30 font-sans relative overflow-hidden">
            {/* Global Refinement Layers */}
            <div className="noise-overlay" />
            <div className="dot-pattern fixed inset-0 z-0 pointer-events-none opacity-[0.4]" />

            {/* Soft Ambient Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <Sidebar />

            <main className="flex-1 ml-64 min-h-screen relative z-10 overflow-y-auto scroll-smooth">
                <div className="p-8 md:p-16 max-w-[1600px] mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
