"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Activity, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000';

interface Log {
    id: string;
    timestamp: string;
    type: "info" | "success" | "warning" | "error" | "exec";
    message: string;
}

export function SystemLogs() {
    const [logs, setLogs] = useState<Log[]>([
        { id: "init-5", timestamp: new Date().toLocaleTimeString([], { hour12: false }), type: "success", message: "Secure handshake completed. Node encrypted." },
        { id: "init-4", timestamp: new Date().toLocaleTimeString([], { hour12: false }), type: "info", message: "Market data provider synced: Binance Core V2" },
        { id: "init-3", timestamp: new Date().toLocaleTimeString([], { hour12: false }), type: "exec", message: "Bounty monitor active. Scanning for liquidation events..." },
        { id: "init-2", timestamp: new Date().toLocaleTimeString([], { hour12: false }), type: "info", message: "Risk engine initialized. Circuit breakers set to 15% delta." },
        { id: "init-1", timestamp: new Date().toLocaleTimeString([], { hour12: false }), type: "info", message: "Terminal initialized. Secure link established." },
    ]);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io(GATEWAY_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        const addLog = (type: Log["type"], message: string) => {
            const newLog: Log = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date().toLocaleTimeString([], { hour12: false }),
                type,
                message: message
            };
            setLogs(prev => [newLog, ...prev].slice(0, 30));
        };

        socket.on('connect', () => {
            addLog('success', `Connected to execution gateway at ${GATEWAY_URL}`);
            socket.emit('subscribe', 'signals');
        });

        socket.on('disconnect', () => {
            addLog('warning', 'Network uplink lost. Attempting to reconnect...');
        });

        socket.on('price_service_connected', () => {
            addLog('success', 'Market data provider synced: Binance Core');
        });

        socket.on('sidex_agent_trade', (data: any) => {
            addLog('exec', `Strategy Unit ${data.agentName || 'Unit'} executed ${data.side} on ${data.symbol}`);
        });

        socket.on('sidex_position_opened', (data: any) => {
            addLog('success', `Position engaged: ${data.symbol} ${data.side} @ ${data.entryPrice}`);
        });

        socket.on('circuit_breaker_triggered', (data: any) => {
            addLog('error', `Risk Mitigation: Circuit breaker triggered. Reason: ${data.reason}`);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="glass-card flex flex-col h-full min-h-[500px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.05] bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05]">
                        <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold text-white uppercase tracking-widest leading-none">Console</h3>
                        <p className="text-[11px] text-[#86868b] mt-1 font-medium italic">Tracing systemic events...</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.03] rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2dce89] shadow-[0_0_8px_rgba(45,206,137,0.4)]" />
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-tight">Live Console</span>
                </div>
            </div>

            {/* Log Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono">
                <AnimatePresence mode="popLayout" initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            layout
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-start gap-4 group/log"
                        >
                            <span className="text-[#424245] shrink-0 select-none text-[11px] font-medium leading-relaxed">
                                {log.timestamp}
                            </span>
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "w-[2px] h-[14px] shrink-0 mt-[3px] rounded-full",
                                    log.type === "info" && "bg-white/20",
                                    log.type === "success" && "bg-[#2dce89]",
                                    log.type === "warning" && "bg-[#ffb800]",
                                    log.type === "error" && "bg-[#f53d2d]",
                                    log.type === "exec" && "bg-blue-500",
                                )} />
                                <span className={cn(
                                    "text-[12px] leading-relaxed tracking-tight group-hover/log:text-white transition-colors",
                                    log.type === "error" ? "text-[#f53d2d] font-bold" : "text-[#86868b]"
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input Overlay */}
            <div className="p-6 border-t border-white/[0.05] bg-black/[0.2]">
                <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.05] focus-within:border-white/[0.2] transition-all group">
                    <Command className="w-3.5 h-3.5 text-[#424245] group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Terminal command sequence..."
                        className="bg-transparent border-none outline-none text-[13px] font-medium text-white w-full placeholder:text-[#424245] transition-colors"
                    />
                    <div className="text-[10px] font-bold text-[#424245] bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">Enter</div>
                </div>
            </div>
        </div>
    );
}
