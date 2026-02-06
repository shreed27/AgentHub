'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Platform,
  ConnectedPlatform,
  PlatformStatus,
  TestResult,
  NotificationSettings,
  NotificationEvent,
  PlatformCredentials,
  PlatformsData,
} from '../types';

interface UseIntegrationsResult {
  // Data
  platforms: PlatformsData | null;
  connectedPlatforms: ConnectedPlatform[];
  notificationSettings: NotificationSettings;
  notificationEvents: NotificationEvent[];

  // Loading states
  loading: boolean;
  connectingPlatform: string | null;
  testingPlatform: string | null;

  // Methods
  refreshPlatforms: () => Promise<void>;
  connectPlatform: (platform: string, credentials: PlatformCredentials, config?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  disconnectPlatform: (platform: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (platform: string, credentials?: PlatformCredentials) => Promise<TestResult | null>;
  getPlatformStatus: (platform: string) => Promise<PlatformStatus | null>;
  sendTestNotification: (platform: string) => Promise<{ success: boolean; message?: string }>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<{ success: boolean; error?: string }>;
}

export function useIntegrations(): UseIntegrationsResult {
  const [platforms, setPlatforms] = useState<PlatformsData | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);

  const refreshPlatforms = useCallback(async () => {
    try {
      const [platformsRes, connectedRes, notifRes] = await Promise.all([
        api.getAvailablePlatforms(),
        api.getConnectedPlatforms(),
        api.getNotificationSettings(),
      ]);

      if (platformsRes.success && platformsRes.data) {
        setPlatforms(platformsRes.data);
        if (platformsRes.data.notificationEvents) {
          setNotificationEvents(platformsRes.data.notificationEvents);
        }
      }

      if (connectedRes.success && connectedRes.data) {
        setConnectedPlatforms(connectedRes.data);
      }

      if (notifRes.success && notifRes.data) {
        setNotificationSettings(notifRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlatforms();
  }, [refreshPlatforms]);

  const connectPlatform = useCallback(async (
    platform: string,
    credentials: PlatformCredentials,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    setConnectingPlatform(platform);
    try {
      const response = await api.connectPlatform(platform, credentials, config);
      if (response.success) {
        await refreshPlatforms();
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to connect' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect' };
    } finally {
      setConnectingPlatform(null);
    }
  }, [refreshPlatforms]);

  const disconnectPlatform = useCallback(async (platform: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.disconnectPlatform(platform);
      if (response.success) {
        await refreshPlatforms();
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to disconnect' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to disconnect' };
    }
  }, [refreshPlatforms]);

  const testConnection = useCallback(async (
    platform: string,
    credentials?: PlatformCredentials
  ): Promise<TestResult | null> => {
    setTestingPlatform(platform);
    try {
      const response = await api.testPlatformConnection(platform, credentials);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return null;
    } finally {
      setTestingPlatform(null);
    }
  }, []);

  const getPlatformStatus = useCallback(async (platform: string): Promise<PlatformStatus | null> => {
    try {
      const response = await api.getPlatformStatus(platform);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get platform status:', error);
      return null;
    }
  }, []);

  const sendTestNotification = useCallback(async (platform: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.sendTestNotification(platform);
      if (response.success && response.data) {
        return { success: response.data.sent, message: response.data.message };
      }
      return { success: false, message: response.error };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to send' };
    }
  }, []);

  const updateNotificationSettings = useCallback(async (
    settings: NotificationSettings
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.updateNotificationSettings(settings);
      if (response.success) {
        setNotificationSettings(settings);
        return { success: true };
      }
      return { success: false, error: response.error || 'Failed to update settings' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' };
    }
  }, []);

  return {
    platforms,
    connectedPlatforms,
    notificationSettings,
    notificationEvents,
    loading,
    connectingPlatform,
    testingPlatform,
    refreshPlatforms,
    connectPlatform,
    disconnectPlatform,
    testConnection,
    getPlatformStatus,
    sendTestNotification,
    updateNotificationSettings,
  };
}
