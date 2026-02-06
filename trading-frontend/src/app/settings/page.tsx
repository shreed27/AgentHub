'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plug, Bell, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntegrationsPage } from '@/features/settings';

type SettingsTab = 'general' | 'integrations' | 'notifications' | 'security';

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account settings, integrations, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'integrations' && <IntegrationsPage />}
        {activeTab === 'notifications' && <NotificationsSettings />}
        {activeTab === 'security' && <SecuritySettings />}
      </motion.div>
    </div>
  );
}

// Placeholder components for other tabs
function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Display Name</label>
            <input
              type="text"
              defaultValue="Admin Account"
              className="w-full max-w-md px-3 py-2 rounded-lg border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              defaultValue="admin@collesium.io"
              className="w-full max-w-md px-3 py-2 rounded-lg border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Use dark theme across the platform</p>
            </div>
            <button className="w-10 h-6 rounded-full bg-primary relative">
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-foreground" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Compact View</p>
              <p className="text-xs text-muted-foreground">Show more data with smaller components</p>
            </div>
            <button className="w-10 h-6 rounded-full bg-muted relative">
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-muted-foreground/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how you want to receive notifications. Platform-specific notification settings are available in the Integrations tab.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Receive push notifications in browser</p>
            </div>
            <button className="w-10 h-6 rounded-full bg-primary relative">
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-foreground" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Sound Alerts</p>
              <p className="text-xs text-muted-foreground">Play sound for important notifications</p>
            </div>
            <button className="w-10 h-6 rounded-full bg-muted relative">
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-muted-foreground/50" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Quiet Hours</p>
              <p className="text-xs text-muted-foreground">Disable notifications during specific hours</p>
            </div>
            <button className="w-10 h-6 rounded-full bg-muted relative">
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-muted-foreground/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-semibold mb-4">Security Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              Enable 2FA
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Session Timeout</p>
              <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
            </div>
            <select className="px-3 py-2 rounded-lg border bg-background/50 text-sm">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>Never</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-xs text-muted-foreground">Manage devices with active sessions</p>
            </div>
            <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
              View Sessions
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
