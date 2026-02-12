"use client";

import {
    LayoutDashboard, Users, Activity, Settings, Wallet, Globe, Zap, Command, Menu, TrendingUp, Cpu, Shovel as Shield
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";
import { motion } from "framer-motion";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Activity, label: "Terminal", href: "/trading" },
    { icon: TrendingUp, label: "Predictions", href: "/polymarket" },
    { icon: Zap, label: "Execution Pro", href: "/sidex" },
    { icon: Globe, label: "Intelligence", href: "/analytics" },
    { icon: Users, label: "Agents", href: "/agents" },
    { icon: Wallet, label: "Portfolio", href: "/portfolio" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="h-full w-64 glass-sidebar flex flex-col fixed left-0 top-0 bottom-0 z-50">
            {/* Branding - Ultra Minimal */}
            <div className="h-24 flex items-center px-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="h-10 w-10 bg-white text-black flex items-center justify-center rounded-xl transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <Command className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-xl tracking-[-0.05em] text-white">
                        TRACER
                    </span>
                </Link>
            </div>

            {/* Navigation - Professional & Spaced */}
            <nav className="flex-1 px-4 space-y-1">
                <div className="px-4 mb-4">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Navigation</span>
                </div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="block relative group"
                        >
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 text-[13px] font-medium rounded-2xl transition-all duration-300 relative z-10",
                                isActive
                                    ? "text-white"
                                    : "text-[#a1a1aa] hover:text-white"
                            )}>
                                <item.icon className={cn(
                                    "w-[18px] h-[18px] transition-all duration-300",
                                    isActive ? "text-white" : "text-[#52525b] group-hover:text-white"
                                )} />
                                <span>{item.label}</span>

                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 bg-white/[0.05] border border-white/[0.08] rounded-2xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Status & Wallet Area */}
            <div className="p-6">
                <div className="mb-6 px-4 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-widest text-[#52525b]">
                        <span>Execution Engine</span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-emerald-500">Online</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-[#a1a1aa]">Latency</span>
                            <span className="text-white font-bold">12ms</span>
                        </div>
                        <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "12%" }}
                                className="h-full bg-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="transition-all active:scale-[0.98]">
                    <WalletButton />
                </div>
            </div>
        </aside>
    );
}
