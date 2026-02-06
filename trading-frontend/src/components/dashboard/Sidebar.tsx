"use client";

import { LayoutDashboard, Users, Activity, Settings, Terminal, Wallet, LogOut, Globe, Moon, Sun, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Globe, label: "Market Intel", href: "/market-intelligence" },
    { icon: Users, label: "Agents", href: "/agents" },
    { icon: Activity, label: "Live Execution", href: "/execution" },
    { icon: Target, label: "Bounties", href: "/bounties" },
    { icon: Terminal, label: "Logs", href: "/logs" },
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
            <nav className="flex-1 py-8 px-4 space-y-1">
                <div className="px-3 mb-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
                    Platform
                </div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative group overflow-hidden",
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
                                "w-4 h-4 transition-colors relative z-10",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span className="relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 space-y-1">
                <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Disconnect
                </button>
            </div>

            {/* User Profile Snippet */}
            <div className="p-4 border-t border-border/40 bg-card/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-white/10" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Admin Account</p>
                        <p className="text-[10px] text-muted-foreground truncate">admin@collesium.io</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
