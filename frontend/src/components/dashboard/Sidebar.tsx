"use client";

import { LayoutDashboard, Users, Activity, Settings, Terminal, Wallet, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Users, label: "Agents", href: "/agents" },
    { icon: Activity, label: "Live Execution", href: "/execution" },
    { icon: Terminal, label: "Logs", href: "/logs" },
    { icon: Wallet, label: "Portfolio", href: "/portfolio" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="h-full w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col fixed left-0 top-0 bottom-0 z-50">
            {/* Branding */}
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
                    <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">Orchestrator</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Platform
                </div>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "text-white bg-white/5"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 transition-colors",
                                isActive ? "text-blue-400" : "text-muted-foreground group-hover:text-blue-400"
                            )} />
                            {item.label}
                            {isActive && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full shadow-[0_0_10px_2px_rgba(59,130,246,0.5)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Disconnect
                </button>
            </div>
        </div>
    );
}
