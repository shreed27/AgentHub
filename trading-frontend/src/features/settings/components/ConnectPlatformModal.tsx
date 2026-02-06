'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Platform, PlatformCredentials, TestResult } from '../types';

interface ConnectPlatformModalProps {
  platform: Platform | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: PlatformCredentials, config?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  onTest: (credentials: PlatformCredentials) => Promise<TestResult | null>;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email';
  required: boolean;
  placeholder: string;
  helpText?: string;
  helpUrl?: string;
}

const platformFields: Record<string, FieldConfig[]> = {
  telegram: [
    {
      name: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: '123456789:ABCdefGHIjklMNOpqrSTUvwxyz',
      helpText: 'Get this from @BotFather on Telegram',
      helpUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    },
    {
      name: 'chatId',
      label: 'Chat ID',
      type: 'text',
      required: true,
      placeholder: '-1001234567890 or 123456789',
      helpText: 'Your user ID or group chat ID',
      helpUrl: 'https://www.alphr.com/find-chat-id-telegram/',
    },
  ],
  discord: [
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'password',
      required: true,
      placeholder: 'https://discord.com/api/webhooks/...',
      helpText: 'Create a webhook in your Discord channel settings',
      helpUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
    },
  ],
  slack: [
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'password',
      required: true,
      placeholder: 'https://hooks.slack.com/services/...',
      helpText: 'Create an incoming webhook in Slack apps',
      helpUrl: 'https://api.slack.com/messaging/webhooks',
    },
  ],
  email: [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'you@example.com',
      helpText: 'Notifications will be sent to this address',
    },
  ],
  polymarket: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Polymarket API key',
      helpText: 'Generate from your Polymarket account settings',
    },
  ],
  kalshi: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Kalshi API key',
      helpText: 'Generate from your Kalshi account settings',
    },
  ],
  binance: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Binance API key',
      helpText: 'Create API key in Binance account settings',
      helpUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
    },
    {
      name: 'apiSecret',
      label: 'API Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Binance API secret',
    },
  ],
  bybit: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Bybit API key',
      helpText: 'Create API key in Bybit account settings',
    },
    {
      name: 'apiSecret',
      label: 'API Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Bybit API secret',
    },
  ],
};

export function ConnectPlatformModal({
  platform,
  isOpen,
  onClose,
  onConnect,
  onTest,
}: ConnectPlatformModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes or platform changes
  useEffect(() => {
    if (isOpen && platform) {
      setCredentials({});
      setShowPasswords({});
      setTestResult(null);
      setError(null);
    }
  }, [isOpen, platform?.id]);

  if (!platform) return null;

  const fields = platformFields[platform.id] || [];

  const handleInputChange = (name: string, value: string) => {
    setCredentials(prev => ({ ...prev, [name]: value }));
    setError(null);
    setTestResult(null);
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPasswords(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const validateCredentials = (): boolean => {
    for (const field of fields) {
      if (field.required && !credentials[field.name]?.trim()) {
        setError(`${field.label} is required`);
        return false;
      }
    }
    return true;
  };

  const handleTest = async () => {
    if (!validateCredentials()) return;

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await onTest(credentials as PlatformCredentials);
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!validateCredentials()) return;

    setIsConnecting(true);
    setError(null);

    try {
      const result = await onConnect(credentials as PlatformCredentials);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold">Connect {platform.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {platform.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {fields.map(field => (
                  <div key={field.name}>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                      {field.helpUrl && (
                        <a
                          href={field.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          field.type === 'password' && !showPasswords[field.name]
                            ? 'password'
                            : field.type === 'password'
                            ? 'text'
                            : field.type
                        }
                        value={credentials[field.name] || ''}
                        onChange={e => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border bg-background/50 text-sm transition-colors',
                          'placeholder:text-muted-foreground/50',
                          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                          field.type === 'password' && 'pr-10'
                        )}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.name)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPasswords[field.name] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}

                {/* Test Result */}
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg text-sm',
                      testResult.testResult === 'passed'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {testResult.testResult === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        {testResult.testResult === 'passed' ? 'Connection successful' : 'Connection failed'}
                      </p>
                      <p className="text-xs opacity-80">{testResult.message}</p>
                      {testResult.latencyMs && (
                        <p className="text-xs opacity-60 mt-1">Latency: {testResult.latencyMs}ms</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/30">
                <button
                  onClick={handleTest}
                  disabled={isTesting || isConnecting}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    'Test Connection'
                  )}
                </button>
                <div className="flex-1" />
                <button
                  onClick={onClose}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-lg hover:bg-accent text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || isTesting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
