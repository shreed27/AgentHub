"use client";

import {
    LayoutDashboard, Users, Activity, Settings, Wallet, Globe, Zap, Command, Menu, TrendingUp, Cpu, Shield, Terminal, History
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";
import { motion } from "framer-motion";

const menuItems = [
    { icon: LayoutDashboard, label: "DASHBOARD", href: "/", id: "01" },
    { icon: Terminal, label: "TRADING", href: "/trading", id: "02" },
    { icon: TrendingUp, label: "MARKETS", href: "/polymarket", id: "03" },
    { icon: Zap, label: "SIDEX", href: "/sidex", id: "04" },
    { icon: Globe, label: "ANALYTICS", href: "/analytics", id: "05" },
    { icon: History, label: "P&L", href: "/pnl", id: "09" },
    { icon: Users, label: "AGENTS", href: "/agents", id: "06" },
    // { icon: Wallet, label: "PORTFOLIO", href: "/portfolio", id: "07" },
    { icon: Settings, label: "SETTINGS", href: "/settings", id: "08" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-surface border-r border-white/[0.04] shadow-2xl" style={{ width: 'var(--sidebar-width)' }}>
            {/* Branding */}
            <div className="h-20 flex items-center px-8 border-b border-white/[0.04] bg-white/[0.01]">
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="h-10 w-10 bg-blue-500 text-black flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-500">
                        <Command className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono font-black text-xl tracking-tighter text-white leading-none uppercase">
                            Dain
                        </span>
                        <span className="text-[10px] font-mono text-blue-500/80 uppercase tracking-[0.3em] font-black leading-none mt-1.5">
                            V.1
                        </span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-10 px-4 space-y-2">
                <div className="px-4 mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-[0.2em]">Navigation</span>
                    <div className="h-[1px] flex-1 ml-4 bg-white/5" />
                </div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <div key={item.href} className="mb-2">
                            <Link
                                href={item.href}
                                className="block relative group"
                            >
                                <div className={cn(
                                    "flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-mono font-bold border transition-all duration-300",
                                    isActive
                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
                                        : "text-zinc-500 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-blue-500" : "text-zinc-600 group-hover:text-zinc-400")} />
                                        <span className="tracking-[0.15em] uppercase">{item.label}</span>
                                    </div>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav-glow"
                                            className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
                                        />
                                    )}
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* System Status Footer */}
            <div className="p-6 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 text-[10px] font-black font-mono uppercase text-zinc-500 tracking-[0.2em]">
                        <span>Registry_Stats</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                            <span className="text-blue-500">Verified</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[10px] font-mono text-zinc-400">
                        <div className="flex items-center justify-between border border-white/5 p-2.5 rounded-xl bg-background/50 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-2">
                                <Globe className="w-3 h-3 text-zinc-600" />
                                <span>NET: SECURE</span>
                            </div>
                            <span className="text-blue-500/70 font-bold">12ms</span>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <WalletButton />
                </div>
            </div>
        </aside>
    );
}
