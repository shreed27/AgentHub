"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { AgentGrid } from "@/components/dashboard/AgentGrid";
import { SystemLogs } from "@/components/dashboard/SystemLogs";
import { SignalFeed } from "@/components/trading/SignalFeed";
import { WhaleAlerts } from "@/components/trading/WhaleAlerts";
import { AIReasoning } from "@/components/trading/AIReasoning";
import { ConnectionStatus } from "@/components/trading/ConnectionStatus";
import { Search, Bell, Rocket, Clock, Cpu, Activity, Zap, Crown, Brain } from "lucide-react";

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
            <ConnectionStatus />
            <span className="w-px h-3 bg-border mx-1" />
            <span className="font-mono text-xs opacity-70 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Gateway: localhost:4000
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <input
              type="text"
              placeholder="Search markets or agents..."
              className="h-10 pl-9 pr-4 rounded-full bg-accent/50 border border-border focus:border-ring focus:bg-accent outline-none text-sm transition-all w-64 placeholder:text-muted-foreground"
            />
          </div>

          <button className="h-10 w-10 rounded-full border border-border bg-card hover:bg-accent flex items-center justify-center transition-colors relative">
            <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-destructive rounded-full border border-background" />
          </button>

          <button className="h-10 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column - Agents & System Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Agent Control */}
          <div className="p-1 rounded-2xl border border-border bg-card/50 backdrop-blur-md overflow-auto flex flex-col shadow-sm">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" /> Agent Status
              </h3>
              <button className="text-xs text-muted-foreground hover:text-foreground">View All</button>
            </div>
            <div className="p-4 overflow-auto">
              <AgentGrid />
            </div>
          </div>

          {/* System Logs */}
          <div className="flex-1 min-h-[300px]">
            <SystemLogs />
          </div>
        </div>

        {/* Center Column - Signal Feed & Whale Alerts */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Signal Feed */}
          <SignalFeed />

          {/* Whale Alerts */}
          <WhaleAlerts />
        </div>

        {/* Right Column - AI Reasoning */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* AI Reasoning */}
          <AIReasoning />

          {/* Quick Stats */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-400" />
              Platform Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-400">Active Markets</span>
                <span className="font-semibold text-white">9</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-400">CEX Exchanges</span>
                <span className="font-semibold text-white">4</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-400">DEX Protocols</span>
                <span className="font-semibold text-white">6</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-400">God Wallets</span>
                <span className="font-semibold text-yellow-400">24</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-400">AI Models</span>
                <span className="font-semibold text-purple-400">6</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
