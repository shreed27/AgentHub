import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, arbitrum, base } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Trading Orchestrator",
  projectId: "demo-project-id", // Get one at https://cloud.walletconnect.com
  chains: [mainnet, base, arbitrum, polygon],
  ssr: true,
});
