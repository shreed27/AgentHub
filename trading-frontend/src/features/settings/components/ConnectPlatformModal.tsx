"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Copy,
  MessageCircle,
  Wallet,
  ArrowRight,
  RefreshCw,
  Terminal,
  Shield,
  Zap,
  Globe,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Platform, PlatformCredentials, TestResult, PairingCode, PairingStatus } from "../types";

interface ConnectPlatformModalProps {
  platform: Platform | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: PlatformCredentials, config?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  onTest: (credentials: PlatformCredentials) => Promise<TestResult | null>;
  onGeneratePairingCode?: () => Promise<PairingCode | null>;
  onCheckPairingStatus?: (code: string) => Promise<PairingStatus | null>;
  onConnectWithWallet?: (signMessage: (message: Uint8Array) => Promise<Uint8Array>) => Promise<{ success: boolean; error?: string }>;
  walletAddress?: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "password" | "email";
  required: boolean;
  placeholder: string;
  helpText?: string;
  helpUrl?: string;
}

const BOT_CONFIG = {
  telegram: {
    botUsername: "CloddsBot",
    deepLinkTemplate: "https://t.me/{botUsername}?start={code}",
  },
  discord: {
    botInviteUrl: "https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot",
  },
};

const platformFields: Record<string, FieldConfig[]> = {
  binance: [
    {
      name: "apiKey",
      label: "API_KEY",
      type: "password",
      required: true,
      placeholder: "ENTER BINANCE API KEY",
      helpText: "ENABLE READ-ONLY PERMISSIONS IN BINANCE SETTINGS.",
      helpUrl: "https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072",
    },
    {
      name: "apiSecret",
      label: "API_SECRET",
      type: "password",
      required: true,
      placeholder: "ENTER BINANCE API SECRET",
      helpText: "ONLY VISIBLE ONCE DURING KEY GENERATION.",
    },
  ],
  bybit: [
    {
      name: "apiKey",
      label: "API_KEY",
      type: "password",
      required: true,
      placeholder: "ENTER BYBIT API KEY",
      helpText: "LOCATED IN ACCOUNT > API MANAGEMENT.",
      helpUrl: "https://www.bybit.com/en-US/help-center/article/How-to-create-your-API-key",
    },
    {
      name: "apiSecret",
      label: "API_SECRET",
      type: "password",
      required: true,
      placeholder: "ENTER BYBIT API SECRET",
    },
  ],
  kalshi: [
    {
      name: "apiKey",
      label: "API_KEY_ID",
      type: "password",
      required: true,
      placeholder: "ENTER KALSHI API KEY ID",
      helpText: "FOUND IN KALSHI ACCOUNT > API.",
      helpUrl: "https://kalshi.com/account/api",
    },
    {
      name: "apiSecret",
      label: "PRIVATE_KEY_PEM",
      type: "password",
      required: true,
      placeholder: "PASTE .PEM FILE CONTENT",
      helpText: "FULL RSA PRIVATE KEY CONTENT.",
    },
  ],
};

function getConnectionMethod(platformId: string): "pairing" | "wallet" | "credentials" {
  if (platformId === "telegram" || platformId === "discord") return "pairing";
  if (platformId === "polymarket") return "wallet";
  return "credentials";
}

export function ConnectPlatformModal({
  platform,
  isOpen,
  onClose,
  onConnect,
  onTest,
  onGeneratePairingCode,
  onCheckPairingStatus,
  onConnectWithWallet,
  walletAddress,
  signMessage,
}: ConnectPlatformModalProps) {
  if (!platform) return null;

  const connectionMethod = getConnectionMethod(platform.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[101] font-mono px-4"
          >
            <div className="bg-surface/90 border border-white/[0.08] rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-2xl">
              {/* Header */}
              <div className="p-8 border-b border-white/[0.04] flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] to-transparent pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-14 h-14 rounded-3xl bg-blue-500 text-black flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                    {platform.id === 'telegram' ? <MessageCircle className="w-7 h-7" /> :
                      platform.id === 'polymarket' ? <Globe className="w-7 h-7" /> :
                        <Zap className="w-7 h-7" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] italic mb-1 block">Uplink_Initiated</span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest leading-none">Connect_{platform.name}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-zinc-500 hover:bg-white/[0.08] hover:text-white transition-all relative z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {connectionMethod === "pairing" && (
                  <MessagingPairingFlow
                    platform={platform}
                    onGeneratePairingCode={onGeneratePairingCode}
                    onCheckPairingStatus={onCheckPairingStatus}
                  />
                )}
                {connectionMethod === "wallet" && (
                  <PolymarketWalletFlow
                    platform={platform}
                    walletAddress={walletAddress}
                    signMessage={signMessage}
                    onConnectWithWallet={onConnectWithWallet}
                    onClose={onClose}
                  />
                )}
                {connectionMethod === "credentials" && (
                  <ExchangeCredentialFlow
                    platform={platform}
                    onConnect={onConnect}
                    onTest={onTest}
                  />
                )}
              </div>

              {/* Global Footer (System Info) */}
              <div className="px-8 py-4 bg-black/40 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-500/60" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">TLS_SECURITY_CERTIFIED</span>
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-zinc-700" />
                  <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">PORT_6500_SECURE</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Sub-components with new styling

interface MessagingPairingFlowProps {
  platform: Platform;
  onGeneratePairingCode?: () => Promise<PairingCode | null>;
  onCheckPairingStatus?: (code: string) => Promise<PairingStatus | null>;
}

function MessagingPairingFlow({ platform, onGeneratePairingCode, onCheckPairingStatus }: MessagingPairingFlowProps) {
  const [step, setStep] = useState<"init" | "waiting" | "done">("init");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const botConfig = platform.id === 'telegram' || platform.id === 'discord'
    ? BOT_CONFIG[platform.id as keyof typeof BOT_CONFIG]
    : null;

  const initiate = async () => {
    if (!onGeneratePairingCode) return;
    setLoading(true);
    try {
      const result = await onGeneratePairingCode();
      if (result) { setCode(result.code); setStep("waiting"); }
    } catch (e) { setError("Generation failure"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (step !== "waiting" || !code || !onCheckPairingStatus) return;
    const interval = setInterval(async () => {
      const status = await onCheckPairingStatus(code);
      if (status?.status === "completed") setStep("done");
    }, 3000);
    return () => clearInterval(interval);
  }, [step, code, onCheckPairingStatus]);

  if (step === "init") return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 mb-8">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
          Establishing a decentralized messaging link requires oracle verification. This process will link your platform ID to the system relay.
        </p>
      </div>
      <button
        onClick={initiate}
        disabled={loading}
        className="w-full py-5 rounded-2xl bg-blue-500 text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>GENERATE_ACCESS_UPLINK <ArrowRight className="w-4 h-4" /></>}
      </button>
      {error && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest text-center">{error}</p>}
    </div>
  );

  if (step === "waiting") return (
    <div className="space-y-8 text-center py-4">
      <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest animate-pulse">Waiting_For_Handshake...</p>
      <div className="p-8 rounded-[32px] bg-black/40 border border-white/[0.04] relative">
        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest absolute top-4 left-6 italic">Pairing_Token</span>
        <div className="text-4xl font-black text-white tracking-[0.5em] mt-4 mb-2">{code}</div>
      </div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
        Send this token to <strong>{botConfig && 'botUsername' in botConfig ? `@${botConfig.botUsername}` : 'the bot'}</strong> on {platform.name} to complete the secure link.
      </p>
      <button
        onClick={() => setStep("init")}
        className="text-[9px] font-black text-zinc-600 hover:text-white uppercase tracking-widest underline underline-offset-4"
      >
        ABORT_AND_RETRY
      </button>
    </div>
  );

  return (
    <div className="text-center py-12 space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-widest">NODE_LINKED</h3>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Handshake completed. Signal routing is now active.</p>
    </div>
  );
}

interface PolymarketWalletFlowProps {
  platform: Platform;
  walletAddress?: string;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  onConnectWithWallet?: (signMessage: (message: Uint8Array) => Promise<Uint8Array>) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

function PolymarketWalletFlow({ platform, walletAddress, signMessage, onConnectWithWallet, onClose }: PolymarketWalletFlowProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"init" | "signing" | "done">("init");

  const connect = async () => {
    if (!signMessage || !onConnectWithWallet) return;
    setLoading(true); setStep("signing");
    try {
      const res = await onConnectWithWallet(signMessage);
      if (res.success) setStep("done");
      else setStep("init");
    } catch (e) { setStep("init"); }
    finally { setLoading(false); }
  };

  if (step === "done") return (
    <div className="text-center py-12 space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-widest">ORACLE_AUTH_SUCCESS</h3>
      <button onClick={onClose} className="w-full py-4 rounded-xl bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest">PROCEED_TO_TERMINAL</button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-[32px] bg-black/40 border border-white/[0.04] space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 text-purple-500">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-0.5">Wallet_Uplink</p>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate max-w-[200px]">{walletAddress || "DISCONNECTED"}</p>
          </div>
        </div>
        <div className="h-px bg-white/[0.04]" />
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed italic">
          "Requesting secure signature for oracle verification. No gas fees are required for this protocol."
        </p>
      </div>

      <button
        onClick={connect}
        disabled={loading || !walletAddress}
        className="w-full py-5 rounded-2xl bg-blue-500 text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>INITIALIZE_SIGNATURE <Lock className="w-4 h-4 ml-2" /></>}
      </button>
    </div>
  );
}

interface ExchangeCredentialFlowProps {
  platform: Platform;
  onConnect: (credentials: PlatformCredentials, config?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  onTest: (credentials: PlatformCredentials) => Promise<TestResult | null>;
}

function ExchangeCredentialFlow({ platform, onConnect, onTest }: ExchangeCredentialFlowProps) {
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const fields = platformFields[platform.id] || [];

  const connect = async () => {
    setIsConnecting(true);
    try { await onConnect(creds as any); }
    finally { setIsConnecting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 mb-8 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
          SECURITY_WARNING: USE <span className="text-amber-500">READ_ONLY</span> PERMISSIONS. DO NOT ENABLE WITHDRAWAL OR TRADE EXECUTION UNLESS EXPLICITLY REQUIRED BY THE NODE.
        </p>
      </div>

      <div className="space-y-6">
        {fields.map(f => (
          <div key={f.name} className="space-y-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{f.label}</label>
            <div className="relative group">
              <input
                type={f.type}
                className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-4 px-6 text-xs font-black font-mono text-white outline-none focus:border-blue-500/30 transition-all placeholder:text-zinc-800"
                placeholder={f.placeholder}
                value={creds[f.name] || ''}
                onChange={e => setCreds(prev => ({ ...prev, [f.name]: e.target.value }))}
              />
            </div>
            {f.helpText && <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest pl-2 italic">{f.helpText}</p>}
          </div>
        ))}
      </div>

      <button
        onClick={connect}
        disabled={isConnecting}
        className="w-full py-5 rounded-2xl bg-blue-500 text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl"
      >
        {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>SYNC_API_UPLINK <RefreshCw className="w-4 h-4 ml-2" /></>}
      </button>
    </div>
  );
}
