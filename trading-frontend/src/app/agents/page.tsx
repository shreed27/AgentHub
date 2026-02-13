"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Store, Zap, Sparkles, Target, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useWallet } from "@/hooks/useWalletCompat";
import { useCustomWalletModal } from "@/components/providers/CustomWalletModalProvider";

import { TechHeader } from "@/components/ui/TechHeader";
const AgentsTab = dynamic(() => import("./tabs/AgentsTab"), { ssr: false });
const MarketplaceTab = dynamic(() => import("./tabs/MarketplaceTab"), { ssr: false });
const AutomationTab = dynamic(() => import("./tabs/AutomationTab"), { ssr: false });
const SkillsTab = dynamic(() => import("./tabs/SkillsTab"), { ssr: false });
const BountiesTab = dynamic(() => import("./tabs/BountiesTab"), { ssr: false });

const tabs = [
    { id: "agents", label: "My Agents", icon: Users, description: "Manage your deployed trading agents" },
    { id: "marketplace", label: "Marketplace", icon: Store, description: "Discover and hire agents from the network" },
    { id: "automation", label: "Automation", icon: Zap, description: "Configure automated trading rules" },
    { id: "skills", label: "Skills", icon: Sparkles, description: "One-click trading tools and utilities" },
    { id: "bounties", label: "Bounties", icon: Target, description: "OSINT bounties and rewards" },
];

export default function AgentsPage() {
    const { publicKey, connected } = useWallet();
    const { setVisible } = useCustomWalletModal();
    const [activeTab, setActiveTab] = useState("agents");

    const walletAddress = connected && publicKey ? publicKey.toBase58() : null;

    const renderTabContent = () => {
        switch (activeTab) {
            case "agents":
                return <AgentsTab />;
            case "marketplace":
                return <MarketplaceTab />;
            case "automation":
                return <AutomationTab walletAddress={walletAddress} />;
            case "skills":
                return <SkillsTab walletAddress={walletAddress} />;
            case "bounties":
                return <BountiesTab />;
            default:
                return <AgentsTab />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-6 relative">
                {/* Tech Corners */}
                <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/20" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20" />

                {(tabs).map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-widest border transition-all relative group",
                                isActive
                                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/5"
                                    : "border-transparent text-zinc-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {isActive && <div className="absolute top-0 right-0 w-1 h-1 bg-emerald-500" />}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-6 pl-2 border-l-2 border-emerald-500/50">
                <span className="text-emerald-500 font-bold">// MODULE_INFO:</span>
                {tabs.find(t => t.id === activeTab)?.description}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {renderTabContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
