"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Maximize2, Minimize2, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Log {
    id: string;
    timestamp: string;
    type: "info" | "success" | "warning" | "error" | "exec";
    message: string;
}

export function SystemLogs() {
    const [logs, setLogs] = useState<Log[]>([
        { id: "1", timestamp: "10:42:01", type: "info", message: "System initialized. Connecting to Solana RPC..." },
        { id: "2", timestamp: "10:42:02", type: "success", message: "Connected to Helius RPC (latency: 12ms)" },
        { id: "3", timestamp: "10:42:05", type: "info", message: "Loading market data for 12 watched tokens..." },
        { id: "4", timestamp: "10:42:08", type: "exec", message: "Strategy [Alpha] initialized with budget: 15 SOL" },
    ]);

    // Simulate incoming logs
    useEffect(() => {
        const interval = setInterval(() => {
            const types: Log["type"][] = ["info", "success", "exec", "warning"];
            const newLog: Log = {
                id: Math.random().toString(36),
                timestamp: new Date().toLocaleTimeString([], { hour12: false }),
                type: types[Math.floor(Math.random() * types.length)],
                message: `Simulated event: market update tick #${Math.floor(Math.random() * 1000)}`
            };
            setLogs(prev => [newLog, ...prev].slice(0, 12));
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-card backdrop-blur-xl overflow-hidden shadow-sm relative">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/5 z-20">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Logs</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
                </div>
            </div>

            {/* Log Area */}
            <div className="flex-1 overflow-hidden relative p-3 font-mono text-[11px]">
                <div className="absolute inset-0 overflow-y-auto scrollbar-none pb-12">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                key={log.id}
                                className="flex items-start gap-3 py-1.5 border-b border-border/20 last:border-0"
                            >
                                <span className="text-muted-foreground/40 shrink-0 select-none min-w-[50px]">{log.timestamp}</span>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={cn(
                                        "w-1 h-1 rounded-full shrink-0",
                                        log.type === "info" && "bg-blue-500",
                                        log.type === "success" && "bg-green-500",
                                        log.type === "warning" && "bg-yellow-500",
                                        log.type === "error" && "bg-red-500",
                                        log.type === "exec" && "bg-purple-500",
                                    )} />
                                    <span className={cn(
                                        "truncate",
                                        log.type === "exec" ? "text-purple-600 dark:text-purple-400" :
                                            log.type === "error" ? "text-red-600 dark:text-red-400" :
                                                "text-foreground/80"
                                    )}>
                                        {log.message}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Input Overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-card border-t border-border/50 z-20">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/20 border border-transparent focus-within:border-primary/20 transition-colors">
                    <span className="text-green-500 font-bold text-xs">➜</span>
                    <input
                        type="text"
                        placeholder="Type a command..."
                        className="bg-transparent border-none outline-none text-[11px] font-mono text-foreground w-full placeholder:text-muted-foreground/40"
                    />
                </div>
            </div>
        </div>
    );
}
