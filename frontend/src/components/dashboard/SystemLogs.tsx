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
    const bottomRef = useRef<HTMLDivElement>(null);

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

            setLogs(prev => [...prev.slice(-49), newLog]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="flex flex-col h-full rounded-2xl border border-white/5 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">System Terminals</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 px-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                </div>
            </div>

            {/* Log Area */}
            <div className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-1.5 scrollbar-hide">
                {logs.map((log) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={log.id}
                        className="flex items-start gap-3 hover:bg-white/[0.02] -mx-2 px-2 py-0.5 rounded"
                    >
                        <span className="text-muted-foreground opacity-50 shrink-0">{log.timestamp}</span>
                        <span className={cn(
                            "font-bold uppercase tracking-wider shrink-0 w-16 text-center text-[10px] py-0.5 rounded border border-white/5",
                            log.type === "info" && "text-blue-400 bg-blue-400/10",
                            log.type === "success" && "text-green-400 bg-green-400/10",
                            log.type === "warning" && "text-yellow-400 bg-yellow-400/10",
                            log.type === "error" && "text-red-400 bg-red-400/10",
                            log.type === "exec" && "text-purple-400 bg-purple-400/10",
                        )}>
                            {log.type}
                        </span>
                        <span className={cn(
                            "break-all",
                            log.type === "exec" ? "text-purple-200" : "text-gray-300"
                        )}>
                            {log.message}
                        </span>
                    </motion.div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">➜</span>
                    <input
                        type="text"
                        placeholder="Enter system command..."
                        className="bg-transparent border-none outline-none text-xs font-mono text-white w-full placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>
        </div>
    );
}
