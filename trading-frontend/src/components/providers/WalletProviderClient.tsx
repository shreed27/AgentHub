"use client";

import { FC, ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, arbitrum, base } from "wagmi/chains";

import "@rainbow-me/rainbowkit/styles.css";

interface WalletProviderClientProps {
  children: ReactNode;
}

// Create config inside the component to avoid SSR issues
const config = getDefaultConfig({
  appName: "Trading Orchestrator",
  projectId: "demo-project-id",
  chains: [mainnet, base, arbitrum, polygon],
  ssr: false,
});

const queryClient = new QueryClient();

export const WalletProviderClient: FC<WalletProviderClientProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#f59e0b",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProviderClient;
