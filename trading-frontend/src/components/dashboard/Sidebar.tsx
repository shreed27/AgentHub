"use client";

import {
    LayoutDashboard, Users, Activity, Settings, Wallet, Globe
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { WalletButton } from "@/components/wallet/WalletButton";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Activity, label: "Trading", href: "/trading" },
    { icon: Globe, label: "Analytics", href: "/analytics" },
    { icon: Users, label: "Agents", href: "/agents" },
    { icon: Wallet, label: "Portfolio", href: "/portfolio" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="h-full w-64 border-r border-border/40 bg-background/60 backdrop-blur-xl flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300">
            {/* Branding */}
            <div className="h-20 flex items-center px-6">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
                    <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                    <span className="font-bold text-lg tracking-tight text-foreground block leading-none">Orchestrator</span>
                    <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">PRO v2.4</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group overflow-hidden",
                                isActive
                                    ? "text-primary-foreground bg-primary shadow-md shadow-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 bg-primary z-0 rounded-lg"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <item.icon className={cn(
                                "w-4 h-4 transition-colors relative z-10 flex-shrink-0",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span className="relative z-10 truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Wallet Connection */}
            <div className="p-4 border-t border-border/40 bg-card/10">
                <WalletButton />
            </div>
        </aside>
    );
}
