"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Save,
  Loader2,
  CheckCircle2,
  MessageCircle,
  Hash,
  Slack,
  Mail,
  TrendingUp,
  AlertTriangle,
  Activity,
  Target,
  BarChart3,
  XCircle,
  Terminal,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationSettings as NotificationSettingsType, NotificationEvent, ConnectedPlatform } from "../types";

interface NotificationSettingsProps {
  connectedPlatforms: ConnectedPlatform[];
  notificationEvents: NotificationEvent[];
  settings: NotificationSettingsType;
  onSave: (settings: NotificationSettingsType) => Promise<{ success: boolean; error?: string }>;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: MessageCircle,
  discord: Hash,
  slack: Slack,
  email: Mail,
};

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trade_executed: Zap,
  signal_received: BarChart3,
  whale_alert: AlertTriangle,
  price_alert: Activity,
  agent_status: Activity,
  bounty_update: Target,
};

export function NotificationSettings({
  connectedPlatforms,
  notificationEvents,
  settings,
  onSave,
}: NotificationSettingsProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettingsType>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const messagingPlatforms = connectedPlatforms.filter(p => p.category === "messaging");

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const toggleSetting = (platform: string, eventType: string) => {
    setLocalSettings(prev => {
      const platformSettings = prev[platform] || {};
      const currentSetting = platformSettings[eventType] || { enabled: false };

      return {
        ...prev,
        [platform]: {
          ...platformSettings,
          [eventType]: {
            ...currentSetting,
            enabled: !currentSetting.enabled,
          },
        },
      };
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const toggleAllForPlatform = (platform: string, enabled: boolean) => {
    setLocalSettings(prev => {
      const newPlatformSettings: Record<string, { enabled: boolean }> = {};
      for (const event of notificationEvents) {
        newPlatformSettings[event.id] = { enabled };
      }
      return {
        ...prev,
        [platform]: newPlatformSettings,
      };
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const toggleAllForEvent = (eventType: string, enabled: boolean) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      for (const platform of messagingPlatforms) {
        newSettings[platform.platform] = {
          ...newSettings[platform.platform],
          [eventType]: { enabled },
        };
      }
      return newSettings;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await onSave(localSettings);
    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const isEnabled = (platform: string, eventType: string): boolean => {
    return localSettings[platform]?.[eventType]?.enabled ?? false;
  };

  if (messagingPlatforms.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-12 rounded-[32px] border border-white/[0.04] bg-surface/30 backdrop-blur-md text-center group"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 text-zinc-600 group-hover:text-zinc-400 transition-all">
          <BellOff className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-3">NODE_SIGNAL_OFFLINE</h3>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
          Uplink detected: none. Connect a messaging node (Telegram/Discord) to initiate encrypted signal routing.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] italic">Routing_Protocol</span>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mt-0.5">Signal Distribution</h2>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
            hasChanges
              ? "bg-blue-500 text-black hover:bg-blue-600 scale-10"
              : "bg-white/[0.03] text-zinc-600 border border-white/5 cursor-not-allowed",
            saveSuccess && "bg-emerald-500 text-black shadow-emerald-500/20"
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "SYNCING..." : saveSuccess ? "SYNCED" : "UPLOAD_CHANGES"}
        </button>
      </div>

      <div className="rounded-[32px] border border-white/[0.04] bg-surface/30 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  EVENT_VECTORS
                </th>
                {messagingPlatforms.map(platform => {
                  const Icon = platformIcons[platform.platform] || Bell;
                  return (
                    <th key={platform.platform} className="p-6 text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-400">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">{platform.name}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {notificationEvents.map((event) => {
                const EventIcon = eventIcons[event.id] || Bell;
                return (
                  <tr key={event.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.03] flex items-center justify-center text-zinc-500 group-hover:text-blue-500 group-hover:bg-blue-500/5 transition-all">
                          <EventIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5">{event.name}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{event.description}</p>
                        </div>
                      </div>
                    </td>
                    {messagingPlatforms.map(platform => {
                      const enabled = isEnabled(platform.platform, event.id);
                      return (
                        <td key={platform.platform} className="p-6 text-center">
                          <button
                            onClick={() => toggleSetting(platform.platform, event.id)}
                            className={cn(
                              "w-10 h-6 rounded-full relative cursor-pointer transition-all mx-auto",
                              enabled ? "bg-blue-500" : "bg-zinc-800"
                            )}
                          >
                            <motion.div
                              initial={false}
                              animate={{ x: enabled ? 16 : 0 }}
                              className={cn(
                                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                                enabled ? "right-1" : "left-1"
                              )}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-black/40 border-t border-white/[0.04] flex items-center justify-between">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-3">
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            Datalink encryption: AES-256-GCM Active
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                for (const platform of messagingPlatforms) {
                  toggleAllForPlatform(platform.platform, true);
                }
              }}
              className="text-[9px] font-black text-blue-500/60 hover:text-blue-500 uppercase tracking-widest transition-all"
            >
              GLOBAL_ENABLE
            </button>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={() => {
                for (const platform of messagingPlatforms) {
                  toggleAllForPlatform(platform.platform, false);
                }
              }}
              className="text-[9px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-all"
            >
              GLOBAL_DISABLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
