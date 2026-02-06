"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { AgentGrid } from "@/components/dashboard/AgentGrid";
import { SystemLogs } from "@/components/dashboard/SystemLogs";
import { Search, Bell, Rocket, TrendingUp, Cpu, Activity, Clock } from "lucide-react";

export default function Dashboard() {
  const pnlData = [
    { value: 120 }, { value: 132 }, { value: 101 }, { value: 154 }, { value: 190 }, { value: 240 }, { value: 210 }
  ];
  const volData = [
    { value: 400 }, { value: 300 }, { value: 550 }, { value: 480 }, { value: 600 }, { value: 500 }, { value: 700 }
  ];
  const speedData = [
    { value: 850 }, { value: 900 }, { value: 880 }, { value: 920 }, { value: 950 }, { value: 940 }, { value: 980 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Command Center</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Operational
            <span className="w-px h-3 bg-white/20 mx-1" />
            <span className="font-mono text-xs opacity-70 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Latency: 12ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search markets or agents..."
              className="h-10 pl-9 pr-4 rounded-full bg-white/5 border border-white/5 focus:border-white/20 focus:bg-white/10 outline-none text-sm transition-all w-64"
            />
          </div>

          <button className="h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors relative">
            <Bell className="w-4 h-4 text-muted-foreground hover:text-white" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black" />
          </button>

          <button className="h-10 px-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95">
            <Rocket className="w-4 h-4" />
            Deploy Agent
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Profit (24h)"
          value="$12,450.00"
          change={5.2}
          data={pnlData}
          accentColor="green"
        />
        <MetricCard
          title="Trading Volume"
          value="$1.2M"
          change={12.8}
          data={volData}
          accentColor="blue"
        />
        <MetricCard
          title="Active Positions"
          value="14"
          change={-2}
          data={pnlData}
          accentColor="purple"
        />
        <MetricCard
          title="Execution Speed"
          value="45ms"
          change={2.1}
          data={speedData}
          accentColor="orange"
        />
      </div>

      {/* content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

        {/* Main Panel - Agents & Map */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Agent Control */}
          <div className="p-1 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md flex-1 overflow-auto flex flex-col">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" /> Agent Status
              </h3>
              <button className="text-xs text-muted-foreground hover:text-white">View All</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <AgentGrid />
            </div>
          </div>

          {/* Quick Actions / Market Scanner (Placeholder) */}
          <div className="h-48 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-900/10 to-purple-900/10 backdrop-blur-md flex items-center justify-center border-dashed relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="text-center relative z-10">
              <Activity className="w-8 h-8 text-blue-400 mx-auto mb-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              <p className="text-sm font-medium">Market Map Visualization</p>
              <p className="text-xs text-muted-foreground mt-1">Real-time liquidity heatmaps coming soon</p>
            </div>
          </div>

        </div>

        {/* Right Panel - Terminal */}
        <div className="lg:col-span-1 h-full">
          <SystemLogs />
        </div>

      </div>

    </div>
  );
}
