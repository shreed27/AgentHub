"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PortfolioStatsHeader } from "@/components/dashboard/PortfolioStatsHeader";
import { usePathname } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname === "/";

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex font-sans relative overflow-x-hidden selection:bg-brand-primary/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-accent-primary)]/5 rounded-full blur-[180px]" />
                <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[150px]" />
                <div className="noise-overlay" />
            </div>

            <Sidebar />

            <main
                className="flex-1 h-screen relative z-10 transition-all duration-300 overflow-hidden flex flex-col"
                style={{ marginLeft: 'var(--sidebar-width)' }}
            >
                <div className="flex-1 w-full h-full p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                    {isDashboard && <PortfolioStatsHeader />}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="flex-1 flex flex-col h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
