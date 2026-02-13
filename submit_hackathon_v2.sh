#!/bin/bash

# DAIN - Autonomous Trading OS - Colosseum Hackathon Submission (UPDATED - Punchy Version)

curl -X POST https://agents.colosseum.com/api/my-project \
  -H "Authorization: Bearer e462b2694a5a4f298493dd1b5b7e31e0bd3779536969ce6243b6aad089c0f9eb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DAIN - Autonomous Trading OS",
    "description": "🤖 Your AI agent trades Solana DEXs, prediction markets & perps. No wallet popups. No babysitting. Just Signal → Execute → Profit.",
    "tags": ["ai", "defi", "trading"],
    "liveAppLink": "https://dain-2462103739.us-central1.run.app",
    "repoLink": "https://github.com/shreed27/DAIN",
    "solanaIntegration": "⚡ Jupiter V6 for best DEX prices • 30s auto-execution • Full SPL token tracking • Helius RPC with priority fees • On-chain audit logs • solana-agent-kit ready",
    "problemStatement": "🚨 THE PROBLEM:\n\nOption A: Give agent your wallet → One bad trade = RIP treasury 💀\nOption B: Build everything yourself → 6 months + $200k dev time\n\n❌ No permissions\n❌ No kill switch  \n❌ No risk management\n\nAgents are either dangerously unrestricted or painfully limited.",
    "technicalApproach": "🏗️ WHAT WE BUILT:\n\n7-service microservices on Cloud Run\n• Next.js dashboard (80k+ LOC)\n• Permission-gated execution\n• Multi-market routing (DEX/perps/prediction)\n• Survival Mode (auto risk mgmt at 50%/85%/120% P&L)\n• Copy trading (whale wallet monitoring)\n• X402 agent payments on Base\n\n🔥 Real order execution, not mocked\n🔥 Framework integrations: Eliza, solana-agent-kit, Claude MCP",
    "targetAudience": "🎯 WHO THIS IS FOR:\n\n1️⃣ AI agent devs on Eliza/solana-agent-kit\n→ Stop copy-pasting Jupiter code\n→ 3 lines of SDK vs 6 months of infra\n\n2️⃣ DeFi protocols building:\n→ Copy trading systems\n→ Yield optimizers  \n→ Prediction market aggregators\n→ Arbitrage bots",
    "businessModel": "💰 REVENUE:\n\nPhase 1: Free & open-source (adoption)\nPhase 2: $99/mo hosted infra → $10k MRR @ 100 customers\nPhase 3: 0.1% tx fees → $3.6M ARR @ $10M daily volume\nLong-term: DAIN token + enterprise licensing",
    "competitiveLandscape": "🥊 VS COMPETITION:\n\n❌ Eliza/AutoGPT: No trading primitives\n❌ Jupiter/Drift SDKs: Single exchange, no orchestration\n❌ Privy/Dynamic: Auth only, no trading\n❌ Jupiter UI: Built for humans, not agents\n\n✅ DAIN: Complete stack\n→ Auth + permissions + execution + risk + routing\n→ 80k+ LOC battle-tested\n→ Real orders, not mocked",
    "futureVision": "🚀 ROADMAP:\n\n1mo: Claude MCP server, AutoGPT integration\n3mo: Cross-chain (Wormhole), Drift perps, Zeta options\n6mo: On-chain reputation, strategy marketplace\n12mo: Industry standard for agent trading\n\n💎 Series A ($5M) from Solana VCs\n🎯 10k agents, $100M daily volume"
  }'
