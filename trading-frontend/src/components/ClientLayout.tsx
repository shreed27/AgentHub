"use client";

import { ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "../config/wagmi";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DemoTradingProvider } from "@/components/providers/DemoTradingProvider";

import "@rainbow-me/rainbowkit/styles.css";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a loading shell during SSR/hydration to prevent wallet provider SSR issues
  if (!mounted) {
    return (
      <DemoTradingProvider>
        <DashboardShell>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
          </div>
        </DashboardShell>
      </DemoTradingProvider>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#3b82f6", // Neon Blue
            accentColorForeground: "white",
            borderRadius: "none",
            overlayBlur: "small",
          })}
        >
          {/* Global Cyberpunk Effects */}
          <div className="scanlines" />
          <div className="bg-noise" />

          <DemoTradingProvider>
            <DashboardShell>
              {children}
            </DashboardShell>
          </DemoTradingProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
