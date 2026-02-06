"use client";

import { motion } from "framer-motion";
import { Terminal, Search, Filter, Download, AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LogEntry {
    id: string;
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
    source: string;
    message: string;
}

const mockLogs: LogEntry[] = Array.from({ length: 50 }).map((_, i) => ({
    id: i.toString(),
    timestamp: new Date(Date.now() - i * 1000 * 60).toISOString(),
    level: Math.random() > 0.9 ? "ERROR" : Math.random() > 0.7 ? "WARN" : Math.random() > 0.5 ? "SUCCESS" : "INFO",
    source: Math.random() > 0.5 ? "MarketMaker" : "RiskEngine",
    message: `Process executed successfully with latency ${Math.floor(Math.random() * 50)}ms in block #${Math.floor(Math.random() * 100000)}`
}));

export default function LogsPage() {
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const filteredLogs = mockLogs.filter(log => {
        if (filter !== "ALL" && log.level !== filter) return false;
        if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <Terminal className="w-8 h-8 text-blue-400" /> System Logs
                    </h1>
                    <p className="text-muted-foreground">Real-time system diagnostics and event tracing history.</p>
                </div>
                <button className="h-10 px-6 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium flex items-center gap-2 border border-white/10 transition-colors">
                    <Download className="w-4 h-4" />
                    Export Logs
                </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        type="text"
                        placeholder="Search logs with regex..."
                        className="h-10 pl-10 pr-4 rounded-lg bg-black/20 border border-white/10 focus:border-blue-500/50 focus:bg-white/5 outline-none text-sm w-full font-mono transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    <FilterButton label="ALL" count={mockLogs.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
                    <FilterButton label="ERROR" count={mockLogs.filter(l => l.level === 'ERROR').length} active={filter === "ERROR"} onClick={() => setFilter("ERROR")} color="text-red-400" />
                    <FilterButton label="WARN" count={mockLogs.filter(l => l.level === 'WARN').length} active={filter === "WARN"} onClick={() => setFilter("WARN")} color="text-yellow-400" />
                    <FilterButton label="INFO" count={mockLogs.filter(l => l.level === 'INFO').length} active={filter === "INFO"} onClick={() => setFilter("INFO")} color="text-blue-400" />
                </div>
            </div>

            {/* Log Terminal */}
            <div className="flex-1 rounded-xl border border-white/5 bg-black/60 font-mono text-sm overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] text-xs text-muted-foreground">
                    <div className="flex gap-4">
                        <span className="w-40">Timestamp</span>
                        <span className="w-20">Level</span>
                        <span className="w-32">Source</span>
                        <span>Message</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="flex gap-4 py-1.5 hover:bg-white/[0.03] rounded px-2 -mx-2 items-start group">
                            <span className="w-40 text-muted-foreground shrink-0 text-xs mt-0.5">{log.timestamp.replace('T', ' ').split('.')[0]}</span>
                            <div className="w-20 shrink-0">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                    log.level === 'INFO' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                        log.level === 'WARN' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                            log.level === 'ERROR' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                "bg-green-500/10 text-green-400 border-green-500/20"
                                )}>
                                    {log.level}
                                </span>
                            </div>
                            <span className="w-32 text-purple-300/70 shrink-0 text-xs mt-0.5">{log.source}</span>
                            <span className={cn(
                                "flex-1 text-gray-300 break-all",
                                log.level === 'ERROR' && "text-red-300"
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-muted-foreground">No logs found matching criteria.</div>
                    )}
                </div>
            </div>

        </div>
    );
}

function FilterButton({ label, count, active, onClick, color }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "h-8 px-3 rounded-md text-xs font-medium border transition-all flex items-center gap-2",
                active
                    ? "bg-white/10 border-white/20 text-white shadow"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
            )}
        >
            <span className={color}>{label}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] opacity-70">{count}</span>
        </button>
    )
}
