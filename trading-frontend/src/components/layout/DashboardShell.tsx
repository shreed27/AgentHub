"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-purple-500/20 font-sans relative">
            <div className="bg-noise" />
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[0%] left-[20%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {children}
            </main>
        </div>
    );
}
