"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plug, Bell, Shield, User, ChevronRight, Activity, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntegrationsPage } from "@/features/settings";

type SettingsTab = "general" | "integrations" | "notifications" | "security";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "GENERAL_CORE", icon: User },
  { id: "integrations", label: "NODE_CONNECT", icon: Plug },
  { id: "notifications", label: "SIGNAL_HUB", icon: Bell },
  { id: "security", label: "VAULT_SHIELD", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations");

  return (
    <div className="h-full flex flex-col font-mono overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between gap-6 p-8 rounded-3xl border border-white/[0.04] bg-surface/50 backdrop-blur-2xl shadow-xl relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] to-transparent pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-none italic">System_Configuration</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">Protocol_Settings</h1>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10 mx-2" />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] leading-none italic">Core_Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">V2.4.1_STABLE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right max-w-[200px] leading-relaxed">
            Configure node integrations and sub-system security protocols.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit relative z-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isActive
                  ? "bg-blue-500 text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-black" : "text-zinc-600")} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="active-settings-tab"
                  className="absolute inset-0 rounded-xl bg-blue-500 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="pb-20"
          >
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "integrations" && <IntegrationsPage />}
            {activeTab === "notifications" && <NotificationsSettings />}
            {activeTab === "security" && <SecuritySettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="mb-8 pl-4 border-l-2 border-blue-500/20">
      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-1">{title}</h3>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{subtitle}</p>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-8">
        <div className="p-8 rounded-[32px] bg-surface/30 border border-white/[0.04] backdrop-blur-md relative overflow-hidden group">
          <SectionHeader title="Protocol_Identity" subtitle="Core identification parameters" />
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Display_Alias</label>
              <input
                type="text"
                defaultValue="Admin_Node_01"
                className="bg-black/40 border border-white/[0.06] rounded-2xl py-4 px-6 text-xs font-black font-mono text-white outline-none focus:border-blue-500/30 transition-all uppercase"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Master_Proxy_Email</label>
              <input
                type="email"
                defaultValue="core@collesium.io"
                className="bg-black/40 border border-white/[0.06] rounded-2xl py-4 px-6 text-xs font-black font-mono text-zinc-400 outline-none focus:border-blue-500/30 transition-all uppercase"
              />
            </div>
          </div>
          <button className="mt-8 px-6 py-3 rounded-xl bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
            UPATE_IDENTITY
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="p-8 rounded-[32px] bg-surface/30 border border-white/[0.04] backdrop-blur-md relative overflow-hidden">
          <SectionHeader title="Interface_Options" subtitle="System visualization preference" />
          <div className="space-y-4">
            {[
              { label: "Dark_Protocol", desc: "Forced spectral theme active", checked: true },
              { label: "Compact_Datalink", desc: "Optimize for data density", checked: false },
              { label: "Glow_Effects", desc: "Enable ambient luminosity", checked: true },
            ].map((opt, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all">
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5">{opt.label}</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{opt.desc}</p>
                </div>
                <div className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-all", opt.checked ? "bg-blue-500" : "bg-zinc-800")}>
                  <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md", opt.checked ? "right-1" : "left-1")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <div className="max-w-3xl">
      <div className="p-8 rounded-[32px] bg-surface/30 border border-white/[0.04] backdrop-blur-md relative overflow-hidden">
        <SectionHeader title="Signal_Distribution" subtitle="Configure event broadcast channels" />
        <div className="space-y-4 mb-8">
          {[
            { label: "Critical_Broadcast", desc: "Immediate execution and panic alerts", status: "ENABLED", active: true },
            { label: "System_Telemetry", desc: "Regular performance and health metrics", status: "ENABLED", active: true },
            { label: "Market_Intelligence", desc: "Whale alerts and price shifts", status: "OFFLINE", active: false },
          ].map((n, i) => (
            <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-6">
                <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5", n.active ? "text-blue-500" : "text-zinc-700")}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-2">{n.label}</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{n.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={cn("text-[9px] font-black font-mono tracking-widest", n.active ? "text-blue-500" : "text-zinc-700")}>{n.status}</span>
                <div className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-all", n.active ? "bg-blue-500/20 border border-blue-500/30" : "bg-zinc-900 border border-white/5")}>
                  <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all", n.active ? "bg-blue-500 right-1 shadow-[0_0_8px_#3b82f6]" : "bg-zinc-700 left-1")} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
          <Terminal className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
            Broadcast signals are priority-routed through the encrypted relay mesh. Integration-specific settings can be managed via the Node_Connect tab.
          </p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div className="p-8 rounded-[32px] bg-surface/30 border border-white/[0.04] backdrop-blur-md relative overflow-hidden">
        <SectionHeader title="Protocol_Hardening" subtitle="Enhanced defensive parameters" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                2FA_ENCRYPTION
              </p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">
                Double shield authentication for all critical execution signatures.
              </p>
            </div>
            <button className="w-full py-4 rounded-xl border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 transition-all">
              ENABLE_SHIELD
            </button>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest mb-2">SESSION_TIMEDOUT</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-6 leading-relaxed">
                Automatic terminal lockout after specified inactivity period.
              </p>
            </div>
            <div className="flex gap-2">
              {["1H", "4H", "24H", "NEVER"].map((t) => (
                <button key={t} className={cn(
                  "flex-1 py-3 rounded-lg border text-[9px] font-black transition-all",
                  t === "1H" ? "bg-blue-500 border-blue-500 text-black" : "bg-black/40 border-white/5 text-zinc-600 hover:text-zinc-400"
                )}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-rose-500/[0.02] border border-rose-500/10 backdrop-blur-md relative overflow-hidden">
        <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.3em] mb-1">DESTRUCT_SEQUENCE</h3>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mb-8">Permanent data erasure and identity purge</p>
        <div className="flex items-center justify-between p-6 rounded-2xl bg-rose-500/[0.04] border border-rose-500/10">
          <p className="text-[10px] text-rose-500/60 font-black uppercase tracking-widest max-w-sm leading-relaxed">
            WARNING: This action cannot be reversed. All trade ledgers and identity keys will be purged from the decentralized mesh.
          </p>
          <button className="px-8 py-4 rounded-xl bg-rose-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-[0_0_20px_rgba(244,63,94,0.1)]">
            INITIATE_PURGE
          </button>
        </div>
      </div>
    </div>
  );
}
