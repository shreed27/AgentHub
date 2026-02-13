"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/useWalletCompat";
import {
  Plug,
  MessageCircle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  Terminal,
  Zap,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntegrations } from "../hooks/useIntegrations";
import { PlatformCard } from "./PlatformCard";
import { ConnectPlatformModal } from "./ConnectPlatformModal";
import { NotificationSettings } from "./NotificationSettings";
import { Platform, PlatformCredentials, TestResult } from "../types";

const categoryInfo = {
  messaging: {
    icon: MessageCircle,
    label: "SIGNAL_BROADCAST",
    title: "Messaging & Notifications",
    description: "Link messaging nodes for encrypted real-time alert distribution.",
  },
  exchange: {
    icon: TrendingUp,
    label: "LIQUIDITY_BRIDGE",
    title: "Crypto Exchanges",
    description: "Authorized exchange uplink for cross-platform execution.",
  },
  prediction: {
    icon: Globe,
    label: "PROBABILITY_MESH",
    title: "Prediction Markets",
    description: "Oracle-verified connectivity for prediction market settlements.",
  },
};

export function IntegrationsPage() {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const {
    platforms,
    connectedPlatforms,
    notificationSettings,
    notificationEvents,
    linkedAccounts,
    loading,
    connectingPlatform,
    testingPlatform,
    refreshPlatforms,
    connectPlatform,
    disconnectPlatform,
    testConnection,
    updateNotificationSettings,
    generatePairingCode,
    checkPairingStatus,
    connectPolymarketWithWallet,
  } = useIntegrations();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredMessagingPlatforms = useMemo(() => {
    if (!platforms?.messaging) return [];
    return platforms.messaging.filter(p => p.id === "telegram" || p.id === "discord");
  }, [platforms?.messaging]);

  const getLinkedAccountForPlatform = useCallback((platformId: string) => {
    const channelMap: Record<string, string> = {
      telegram: "telegram",
      discord: "discord",
    };
    const channel = channelMap[platformId];
    return linkedAccounts.find(acc => acc.channel === channel);
  }, [linkedAccounts]);

  const handleConnectPolymarketWithWallet = useCallback(async (
    walletSignMessage: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }
    return connectPolymarketWithWallet(walletAddress, walletSignMessage);
  }, [walletAddress, connectPolymarketWithWallet]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConnect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsModalOpen(true);
  };

  const handleDisconnect = async (platform: Platform) => {
    const result = await disconnectPlatform(platform.id);
    if (result.success) {
      showToast("success", `Disconnected from ${platform.name}`);
    } else {
      showToast("error", result.error || "Failed to disconnect");
    }
  };

  const handleConfigure = (platform: Platform) => {
    setSelectedPlatform(platform);
    setIsModalOpen(true);
  };

  const handleTest = async (platform: Platform) => {
    const result = await testConnection(platform.id);
    if (result?.testResult === "passed") {
      showToast("success", `${platform.name} connection verified`);
    } else {
      showToast("error", result?.message || "Connection test failed");
    }
  };

  const handleModalConnect = useCallback(async (
    credentials: PlatformCredentials,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedPlatform) return { success: false, error: "No platform selected" };
    const result = await connectPlatform(selectedPlatform.id, credentials, config);
    if (result.success) {
      showToast("success", `Connected to ${selectedPlatform.name}`);
    }
    return result;
  }, [selectedPlatform, connectPlatform]);

  const handleModalTest = useCallback(async (credentials: PlatformCredentials): Promise<TestResult | null> => {
    if (!selectedPlatform) return null;
    return testConnection(selectedPlatform.id, credentials);
  }, [selectedPlatform, testConnection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
          </div>
          <p className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.5em] animate-pulse">Scanning_Uplinks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 font-mono">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border font-black uppercase text-[10px] tracking-widest",
              toast.type === "success"
                ? "bg-emerald-500/90 border-emerald-500/20 text-black placeholder-zinc-800"
                : "bg-rose-500/90 border-rose-500/20 text-black"
            )}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-[1px] bg-blue-500/20" />
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-1">Active_Integrations</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manage external node connectivity and relay protocols</p>
          </div>
        </div>
        <button
          onClick={refreshPlatforms}
          className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-black font-mono uppercase tracking-widest text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          SYNC_NODE_INDEX
        </button>
      </div>

      {platforms && (
        <div className="space-y-16">
          {/* Messaging Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
                <categoryInfo.messaging.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] italic">{categoryInfo.messaging.label}</span>
                <h2 className="text-xl font-black text-white uppercase tracking-widest mt-0.5">{categoryInfo.messaging.title}</h2>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{categoryInfo.messaging.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMessagingPlatforms.map(platform => {
                const linkedAccount = getLinkedAccountForPlatform(platform.id);
                const isLinked = !!linkedAccount;
                return (
                  <PlatformCard
                    key={platform.id}
                    platform={{
                      ...platform,
                      connected: isLinked,
                      status: isLinked ? "connected" : "disconnected",
                    }}
                    onConnect={() => handleConnect(platform)}
                    onDisconnect={() => handleDisconnect(platform)}
                    onConfigure={() => handleConfigure(platform)}
                    onTest={() => handleTest(platform)}
                    isConnecting={connectingPlatform === platform.id}
                    isTesting={testingPlatform === platform.id}
                    linkedAccount={linkedAccount}
                  />
                );
              })}
            </div>
          </section>

          {/* Settings Section */}
          <section>
            <NotificationSettings
              connectedPlatforms={connectedPlatforms}
              notificationEvents={notificationEvents}
              settings={notificationSettings}
              onSave={updateNotificationSettings}
            />
          </section>

          {/* Prediction Markets Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-500">
                <categoryInfo.prediction.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black text-purple-500 uppercase tracking-[0.3em] italic">{categoryInfo.prediction.label}</span>
                <h2 className="text-xl font-black text-white uppercase tracking-widest mt-0.5">{categoryInfo.prediction.title}</h2>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{categoryInfo.prediction.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {platforms.prediction.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  onConnect={() => handleConnect(platform)}
                  onDisconnect={() => handleDisconnect(platform)}
                  onConfigure={() => handleConfigure(platform)}
                  onTest={() => handleTest(platform)}
                  isConnecting={connectingPlatform === platform.id}
                  isTesting={testingPlatform === platform.id}
                />
              ))}
            </div>
          </section>

          {/* Exchanges Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500">
                <categoryInfo.exchange.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.3em] italic">{categoryInfo.exchange.label}</span>
                <h2 className="text-xl font-black text-white uppercase tracking-widest mt-0.5">{categoryInfo.exchange.title}</h2>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{categoryInfo.exchange.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {platforms.exchange.map(platform => (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  onConnect={() => handleConnect(platform)}
                  onDisconnect={() => handleDisconnect(platform)}
                  onConfigure={() => handleConfigure(platform)}
                  onTest={() => handleTest(platform)}
                  isConnecting={connectingPlatform === platform.id}
                  isTesting={testingPlatform === platform.id}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <ConnectPlatformModal
        platform={selectedPlatform}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlatform(null);
        }}
        onConnect={handleModalConnect}
        onTest={handleModalTest}
        onGeneratePairingCode={generatePairingCode}
        onCheckPairingStatus={checkPairingStatus}
        onConnectWithWallet={handleConnectPolymarketWithWallet}
        walletAddress={walletAddress}
        signMessage={signMessage}
      />
    </div>
  );
}
