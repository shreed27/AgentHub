export type PlatformCategory = 'messaging' | 'exchange' | 'prediction';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface Platform {
  id: string;
  name: string;
  icon: string;
  category: PlatformCategory;
  description: string;
  connected: boolean;
  status: IntegrationStatus;
}

export interface ConnectedPlatform {
  id: string;
  userId: string;
  platform: string;
  category: PlatformCategory;
  config?: Record<string, unknown>;
  status: IntegrationStatus;
  lastConnectedAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  // Enriched fields
  name: string;
  icon: string;
  description: string;
}

export interface PlatformStatus {
  platform: string;
  connected: boolean;
  status: IntegrationStatus;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastConnectedAt?: number;
  lastError?: string;
  latencyMs?: number;
}

export interface TestResult {
  platform: string;
  testResult: 'passed' | 'failed';
  message: string;
  latencyMs?: number;
}

export interface NotificationEvent {
  id: string;
  name: string;
  description: string;
}

export interface NotificationSetting {
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface NotificationSettings {
  [platform: string]: {
    [eventType: string]: NotificationSetting;
  };
}

export interface PlatformsData {
  messaging: Platform[];
  exchange: Platform[];
  prediction: Platform[];
  notificationEvents: NotificationEvent[];
}

// Credential types for each platform
export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

export interface DiscordCredentials {
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
}

export interface SlackCredentials {
  webhookUrl?: string;
  botToken?: string;
  channelId?: string;
}

export interface EmailCredentials {
  email: string;
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

export interface PredictionMarketCredentials {
  apiKey: string;
  apiSecret?: string;
}

export type PlatformCredentials =
  | TelegramCredentials
  | DiscordCredentials
  | SlackCredentials
  | EmailCredentials
  | ExchangeCredentials
  | PredictionMarketCredentials;
