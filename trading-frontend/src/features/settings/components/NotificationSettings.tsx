'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationSettings as NotificationSettingsType, NotificationEvent, ConnectedPlatform } from '../types';

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
  trade_executed: TrendingUp,
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

  // Filter to only messaging platforms
  const messagingPlatforms = connectedPlatforms.filter(p => p.category === 'messaging');

  // Sync with prop changes
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

  const allEnabledForPlatform = (platform: string): boolean => {
    return notificationEvents.every(event => isEnabled(platform, event.id));
  };

  const someEnabledForPlatform = (platform: string): boolean => {
    return notificationEvents.some(event => isEnabled(platform, event.id));
  };

  if (messagingPlatforms.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card/50 p-8 text-center"
      >
        <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Messaging Platforms Connected</h3>
        <p className="text-sm text-muted-foreground">
          Connect a messaging platform (Telegram, Discord, Slack, or Email) to configure notifications.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Notification Preferences</h3>
            <p className="text-xs text-muted-foreground">
              Choose which events trigger notifications on each platform
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            hasChanges
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
            saveSuccess && 'bg-green-500 text-white'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Event
              </th>
              {messagingPlatforms.map(platform => {
                const Icon = platformIcons[platform.platform] || Bell;
                const allEnabled = allEnabledForPlatform(platform.platform);
                const someEnabled = someEnabledForPlatform(platform.platform);

                return (
                  <th
                    key={platform.platform}
                    className="text-center p-3 min-w-[100px]"
                  >
                    <button
                      onClick={() => toggleAllForPlatform(platform.platform, !allEnabled)}
                      className="flex flex-col items-center gap-1 mx-auto hover:opacity-80 transition-opacity"
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        allEnabled ? 'text-primary' : someEnabled ? 'text-primary/50' : 'text-muted-foreground'
                      )} />
                      <span className="text-xs font-medium">{platform.name}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {notificationEvents.map((event, idx) => {
              const EventIcon = eventIcons[event.id] || Bell;
              const anyEnabled = messagingPlatforms.some(p => isEnabled(p.platform, event.id));

              return (
                <tr
                  key={event.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/30',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                  )}
                >
                  <td className="p-3">
                    <button
                      onClick={() => toggleAllForEvent(event.id, !anyEnabled)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <EventIcon className={cn(
                        'w-4 h-4',
                        anyEnabled ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <div className="text-left">
                        <p className="text-sm font-medium">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </button>
                  </td>
                  {messagingPlatforms.map(platform => {
                    const enabled = isEnabled(platform.platform, event.id);

                    return (
                      <td key={platform.platform} className="text-center p-3">
                        <button
                          onClick={() => toggleSetting(platform.platform, event.id)}
                          className={cn(
                            'w-10 h-6 rounded-full relative transition-colors',
                            enabled ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <motion.div
                            initial={false}
                            animate={{ x: enabled ? 16 : 0 }}
                            className={cn(
                              'absolute top-1 left-1 w-4 h-4 rounded-full transition-colors',
                              enabled ? 'bg-primary-foreground' : 'bg-muted-foreground/50'
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

      {/* Footer with quick actions */}
      <div className="flex items-center justify-between p-4 bg-muted/20 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Click platform icons or event names to toggle all
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              for (const platform of messagingPlatforms) {
                toggleAllForPlatform(platform.platform, true);
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Enable All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={() => {
              for (const platform of messagingPlatforms) {
                toggleAllForPlatform(platform.platform, false);
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>
    </motion.div>
  );
}
