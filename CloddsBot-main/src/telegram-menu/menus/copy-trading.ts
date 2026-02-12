/**
 * Copy Trading Menu Handler - Manage copy trading subscriptions
 */

import type { MenuContext, MenuResult } from '../types';
import type { CopyTradingConfigRecord } from '../../trading/copy-trading-orchestrator';
import { formatUSD, formatRelativeTime, truncateAddress, formatPercent } from '../utils/format';
import { btn, paginationRow, copyFilterButtons, mainMenuBtn, backBtn } from '../utils/keyboard';
import { logger } from '../../utils/logger';

const PAGE_SIZE = 5;

/**
 * Copy trading overview handler
 */
export async function copyTradingHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const filter = (params[0] as 'all' | 'active' | 'paused') || ctx.state.copyFilter || 'all';
  const page = parseInt(params[1] || '1', 10);

  ctx.state.currentMenu = 'copy_trading';
  ctx.state.copyFilter = filter;
  ctx.state.copyPage = page;

  const wallet = await ctx.getWallet();

  if (!wallet) {
    return {
      text: `🤖 *Copy Trading*

🔗 *Wallet Not Connected*

Connect your wallet to use copy trading.

Copy trading allows you to automatically follow and replicate trades from successful traders.`,
      buttons: [
        [{ text: '🔗 Connect Wallet', url: 'https://app.clodds.com/settings' }],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }

  if (!ctx.copyTrading) {
    return {
      text: `🤖 *Copy Trading*

⚠️ *Service Unavailable*

Copy trading service is not currently available.`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  // Get configs for this wallet
  let configs: CopyTradingConfigRecord[] = [];
  try {
    configs = await ctx.copyTrading.getConfigsForWallet(wallet);
  } catch (error) {
    logger.warn({ error }, 'Failed to get copy trading configs');
  }

  // Get aggregated stats
  let stats;
  try {
    stats = await ctx.copyTrading.getAggregatedStats(wallet);
  } catch (error) {
    logger.warn({ error }, 'Failed to get copy trading stats');
    stats = {
      totalConfigs: 0,
      activeConfigs: 0,
      totalCopiedTrades: 0,
      successfulTrades: 0,
      totalPnl: 0,
      successRate: 0,
    };
  }

  // Filter configs
  let filteredConfigs = configs;
  if (filter === 'active') {
    filteredConfigs = configs.filter((c) => c.enabled);
  } else if (filter === 'paused') {
    filteredConfigs = configs.filter((c) => !c.enabled);
  }

  // Counts for filter buttons
  const counts = {
    all: configs.length,
    active: configs.filter((c) => c.enabled).length,
    paused: configs.filter((c) => !c.enabled).length,
  };

  // Paginate
  const totalPages = Math.ceil(filteredConfigs.length / PAGE_SIZE) || 1;
  const pageConfigs = filteredConfigs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  let text = `🤖 *Copy Trading*

📊 *Stats*
├ Active Subscriptions: ${stats.activeConfigs}/${stats.totalConfigs}
├ Total Trades Copied: ${stats.totalCopiedTrades}
├ Success Rate: ${stats.successRate.toFixed(1)}%
└ Total P&L: ${formatUSD(stats.totalPnl)}
${stats.topPerformingTarget ? `\n🏆 Top Performer: \`${truncateAddress(stats.topPerformingTarget.wallet)}\` (+${formatUSD(stats.topPerformingTarget.pnl)})` : ''}

━━━━━━━━━━━━━━━━━━━━
`;

  if (filteredConfigs.length === 0) {
    if (filter === 'all') {
      text += `\n📭 *No Subscriptions*

You're not following any traders yet.

Tap "Add Subscription" to start copying a trader, or use "Discover" to find top performers.`;
    } else {
      text += `\n📭 *No ${filter === 'active' ? 'Active' : 'Paused'} Subscriptions*`;
    }
  } else {
    text += `\n*Subscriptions* (Page ${page}/${totalPages})\n`;

    pageConfigs.forEach((config, i) => {
      const num = (page - 1) * PAGE_SIZE + i + 1;
      const statusEmoji = config.enabled ? '🟢' : '⏸️';
      const label = config.targetLabel || truncateAddress(config.targetWallet);
      const pnlSign = config.totalPnl >= 0 ? '+' : '';

      text += `
*${num}) ${statusEmoji} ${label}*
├ Trades: ${config.totalTrades} · P&L: ${pnlSign}${formatUSD(config.totalPnl)}
├ Size: $${config.fixedSize} · Mode: ${config.sizingMode}
└ Created: ${formatRelativeTime(config.createdAt)}
`;
    });
  }

  // Build subscription action buttons
  const configButtons: ReturnType<typeof btn>[][] = [];
  pageConfigs.forEach((config, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    configButtons.push([
      config.enabled
        ? btn(`⏸️ Pause #${num}`, `copy:toggle:${config.id}`)
        : btn(`▶️ Resume #${num}`, `copy:toggle:${config.id}`),
      btn(`📊 Stats #${num}`, `copy:stats:${config.id}`),
      btn(`🗑️ #${num}`, `copy:del:${config.id}`),
    ]);
  });

  const buttons = [
    paginationRow({
      current: page,
      total: totalPages,
      baseCallback: `copy:filter:${filter}`,
    }),
    copyFilterButtons(filter, counts),
    ...configButtons,
    [
      btn('➕ Add Subscription', 'copy:add'),
      btn('🏆 Discover', 'copy:discover'),
    ],
    [
      btn('📋 Recent Activity', 'copy:activity'),
      mainMenuBtn(),
    ],
  ];

  return {
    text,
    buttons,
    parseMode: 'Markdown',
  };
}

/**
 * Add subscription prompt handler
 */
export async function addSubscriptionHandler(ctx: MenuContext): Promise<MenuResult> {
  ctx.state.currentMenu = 'copy_add_input';
  ctx.state.pendingWallet = undefined;

  const text = `➕ *Add Subscription*

Enter the trader's wallet address to start copying their trades.

*Example:*
\`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\`

*Tips:*
• Use Polymarket leaderboard to find top traders
• Check their trading history before following
• Start with small allocation sizes

Just send the wallet address as a message.`;

  return {
    text,
    buttons: [
      [
        { text: '🏆 Polymarket Leaderboard', url: 'https://polymarket.com/leaderboard' },
      ],
      [
        backBtn('menu:copy'),
        mainMenuBtn(),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Confirm subscription handler (after user enters wallet)
 */
export async function confirmSubscriptionHandler(
  ctx: MenuContext,
  targetWallet: string
): Promise<MenuResult> {
  ctx.state.currentMenu = 'copy_confirm';
  ctx.state.pendingWallet = targetWallet;

  const text = `➕ *Confirm Subscription*

*Target Wallet:*
\`${targetWallet}\`

*Default Settings:*
├ Size Mode: Fixed
├ Trade Size: $100
├ Max Position: $500
└ Copy Delay: 5 seconds

*Are you sure you want to follow this trader?*

You can modify settings after creating the subscription.`;

  return {
    text,
    buttons: [
      [
        btn('✅ Confirm', `copy:exec:add:${targetWallet}`),
        btn('⚙️ Configure First', `copy:config:${targetWallet}`),
      ],
      [
        backBtn('copy:add'),
        mainMenuBtn(),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Execute add subscription
 */
export async function executeAddSubscription(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const targetWallet = params[0];

  const wallet = await ctx.getWallet();
  if (!wallet || !ctx.copyTrading) {
    return {
      text: `❌ Cannot create subscription`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.createConfig(wallet, {
      targetWallet,
      enabled: true,
      sizingMode: 'fixed',
      fixedSize: 100,
      maxPositionSize: 500,
      copyDelayMs: 5000,
    });

    return {
      text: `✅ *Subscription Created!*

Now following: \`${truncateAddress(targetWallet)}\`

├ Config ID: \`${config.id}\`
├ Status: 🟢 Active
├ Size: $${config.fixedSize} per trade
└ Max Position: $${config.maxPositionSize}

You'll automatically copy this trader's new positions.`,
      buttons: [
        [btn('📊 View Stats', `copy:stats:${config.id}`)],
        [btn('🤖 Copy Trading', 'menu:copy')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, targetWallet }, 'Failed to create subscription');
    return {
      text: `❌ *Failed to Create Subscription*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', 'copy:add')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Toggle subscription handler
 */
export async function toggleSubscriptionHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];

  const wallet = await ctx.getWallet();
  if (!wallet || !ctx.copyTrading) {
    return {
      text: `❌ Cannot toggle subscription`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    const newEnabled = !config.enabled;
    await ctx.copyTrading.toggleConfig(configId, newEnabled);

    const statusEmoji = newEnabled ? '🟢' : '⏸️';
    const statusText = newEnabled ? 'Active' : 'Paused';

    return {
      text: `${statusEmoji} *Subscription ${statusText}*

\`${config.targetLabel || truncateAddress(config.targetWallet)}\`

Status changed to: *${statusText}*`,
      buttons: [
        [btn('🤖 Copy Trading', 'menu:copy')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, configId }, 'Failed to toggle subscription');
    return {
      text: `❌ *Failed to Toggle Subscription*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🤖 Copy Trading', 'menu:copy')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Delete subscription confirmation handler
 */
export async function deleteSubscriptionHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];
  ctx.state.currentMenu = 'copy_delete';

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const config = await ctx.copyTrading.getConfig(configId);
  if (!config) {
    return {
      text: `❌ Subscription not found`,
      buttons: [[btn('🤖 Copy Trading', 'menu:copy')], [mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const text = `⚠️ *Delete Subscription?*

*${config.targetLabel || truncateAddress(config.targetWallet)}*

├ Trades: ${config.totalTrades}
├ P&L: ${formatUSD(config.totalPnl)}
└ Created: ${formatRelativeTime(config.createdAt)}

*This cannot be undone!*

Note: This will NOT close any existing positions.`;

  return {
    text,
    buttons: [
      [
        btn('🗑️ Delete', `copy:exec:del:${configId}`),
        backBtn('menu:copy'),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Execute delete subscription
 */
export async function executeDeleteSubscription(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    await ctx.copyTrading.deleteConfig(configId);

    return {
      text: `✅ *Subscription Deleted*

The subscription has been removed.`,
      buttons: [
        [btn('🤖 Copy Trading', 'menu:copy')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, configId }, 'Failed to delete subscription');
    return {
      text: `❌ *Failed to Delete*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🤖 Copy Trading', 'menu:copy')],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Subscription stats handler
 */
export async function subscriptionStatsHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];
  ctx.state.currentMenu = 'copy_stats';

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const config = await ctx.copyTrading.getConfig(configId);
  if (!config) {
    return {
      text: `❌ Subscription not found`,
      buttons: [[btn('🤖 Copy Trading', 'menu:copy')], [mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const wallet = await ctx.getWallet();
  const history = wallet
    ? await ctx.copyTrading.getHistory(wallet, { configId, limit: 10 })
    : [];

  const winningTrades = history.filter((t) => (t.pnl || 0) > 0);
  const winRate = history.length > 0 ? (winningTrades.length / history.length) * 100 : 0;

  const statusEmoji = config.enabled ? '🟢' : '⏸️';

  // Platform info
  const platforms = config.platforms || { polymarket: { enabled: true, maxSize: 500 } };
  const enabledPlatforms: string[] = [];
  if (platforms.polymarket?.enabled) enabledPlatforms.push('📈 Poly');
  if (platforms.hyperliquid?.enabled) enabledPlatforms.push('🔷 HL');
  if (platforms.kalshi?.enabled) enabledPlatforms.push('🎲 Kalshi');

  let text = `📊 *Subscription Stats*

${statusEmoji} *${config.targetLabel || truncateAddress(config.targetWallet)}*

📈 *Performance*
├ Total Trades: ${config.totalTrades}
├ Win Rate: ${winRate.toFixed(1)}%
└ Total P&L: ${formatUSD(config.totalPnl)}

⚙️ *Settings*
├ Mode: ${config.sizingMode}
├ Size: $${config.fixedSize}
├ Max Position: $${config.maxPositionSize}
├ Platforms: ${enabledPlatforms.join(' ') || 'None'}
├ Instant Mode: ${config.instantMode ? '⚡ On' : '🐢 Off'}
├ Max Slippage: ${config.maxSlippagePercent || 2}%
├ Dry Run: ${config.dryRun ? 'Yes' : 'No'}
└ Created: ${formatRelativeTime(config.createdAt)}

━━━━━━━━━━━━━━━━━━━━
*Recent Trades*
`;

  if (history.length === 0) {
    text += '\nNo trades yet.';
  } else {
    history.slice(0, 5).forEach((trade) => {
      const sideEmoji = trade.side === 'BUY' ? '🟢' : '🔴';
      const pnlText = trade.pnl != null ? ` · ${formatUSD(trade.pnl)}` : '';
      text += `\n${sideEmoji} ${truncateAddress(trade.marketId)} · $${trade.copiedSize.toFixed(2)}${pnlText}`;
    });
  }

  return {
    text,
    buttons: [
      [
        config.enabled
          ? btn('⏸️ Pause', `copy:toggle:${configId}`)
          : btn('▶️ Resume', `copy:toggle:${configId}`),
        btn('🗑️ Delete', `copy:del:${configId}`),
      ],
      [
        btn('⚙️ Platform Settings', `copy:platforms:${configId}`),
      ],
      [
        btn('🔄 Refresh', `copy:stats:${configId}`),
        backBtn('menu:copy'),
      ],
      [mainMenuBtn()],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Discover top traders handler
 */
export async function discoverTradersHandler(ctx: MenuContext): Promise<MenuResult> {
  ctx.state.currentMenu = 'copy_discover';

  const text = `🏆 *Discover Top Traders*

Find successful traders to follow:

*Resources:*
• Polymarket Leaderboard - Official rankings
• Polymarket Whales - Large position holders
• Twitter/X - Follow prediction market communities

*Tips for Finding Good Traders:*
├ Look for consistent profits over time
├ Check their trading history
├ Prefer traders with similar risk tolerance
├ Start with small allocation sizes
└ Diversify across multiple traders

⚠️ *Disclaimer:*
Past performance does not guarantee future results. Only invest what you can afford to lose.`;

  return {
    text,
    buttons: [
      [
        { text: '🏆 Polymarket Leaderboard', url: 'https://polymarket.com/leaderboard' },
      ],
      [
        { text: '🐋 Whale Watchers', url: 'https://polymarket.com' },
      ],
      [
        btn('➕ Add Subscription', 'copy:add'),
        backBtn('menu:copy'),
      ],
      [mainMenuBtn()],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Recent activity handler
 */
export async function recentActivityHandler(ctx: MenuContext): Promise<MenuResult> {
  ctx.state.currentMenu = 'copy_activity';

  const wallet = await ctx.getWallet();
  if (!wallet || !ctx.copyTrading) {
    return {
      text: `❌ Cannot load activity`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const history = await ctx.copyTrading.getHistory(wallet, { limit: 15 });

  let text = `📋 *Recent Copy Trading Activity*\n\n`;

  if (history.length === 0) {
    text += `📭 *No Activity Yet*

No trades have been copied yet. Make sure you have active subscriptions.`;
  } else {
    history.forEach((trade) => {
      const sideEmoji = trade.side === 'BUY' ? '🟢' : '🔴';
      const statusEmoji =
        trade.status === 'filled' ? '✅' :
        trade.status === 'closed' ? '🏁' :
        trade.status === 'failed' ? '❌' : '⏳';
      const pnlText = trade.pnl != null ? ` · P&L: ${formatUSD(trade.pnl)}` : '';
      const platformEmoji = trade.platform === 'hyperliquid' ? '🔷' : trade.platform === 'kalshi' ? '🎲' : '📈';

      text += `${statusEmoji} ${sideEmoji} ${platformEmoji} ${truncateAddress(trade.targetWallet)}
├ ${truncateAddress(trade.marketId)}
└ $${trade.copiedSize.toFixed(2)} · ${formatRelativeTime(trade.createdAt)}${pnlText}

`;
    });
  }

  return {
    text,
    buttons: [
      [
        btn('🔄 Refresh', 'copy:activity'),
        backBtn('menu:copy'),
      ],
      [mainMenuBtn()],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Platform settings handler - Configure multi-platform copy trading
 */
export async function platformSettingsHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];
  ctx.state.currentMenu = 'copy_platforms';

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const config = await ctx.copyTrading.getConfig(configId);
  if (!config) {
    return {
      text: `❌ Subscription not found`,
      buttons: [[btn('🤖 Copy Trading', 'menu:copy')], [mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const platforms = config.platforms || {
    polymarket: { enabled: true, maxSize: 500 },
  };

  const polyEnabled = platforms.polymarket?.enabled ?? true;
  const hlEnabled = platforms.hyperliquid?.enabled ?? false;
  const kalshiEnabled = platforms.kalshi?.enabled ?? false;

  const text = `⚙️ *Platform Settings*

*${config.targetLabel || truncateAddress(config.targetWallet)}*

Configure which platforms to copy trades from:

*Platforms:*
${polyEnabled ? '✅' : '❌'} *Polymarket* - Prediction markets
├ Max Size: $${platforms.polymarket?.maxSize || 500}

${hlEnabled ? '✅' : '❌'} *Hyperliquid* - Perpetuals DEX
├ Max Size: $${platforms.hyperliquid?.maxSize || 1000}
├ Match Leverage: ${platforms.hyperliquid?.matchLeverage ? 'Yes' : 'No'}
└ Max Leverage: ${platforms.hyperliquid?.maxLeverage || 5}x

${kalshiEnabled ? '✅' : '❌'} *Kalshi* - Event markets
├ Max Size: $${platforms.kalshi?.maxSize || 500}
└ Momentum Threshold: ${platforms.kalshi?.momentumThreshold || 70}%

*Execution Settings:*
├ Instant Mode: ${config.instantMode ? '⚡ Enabled' : '🐢 Disabled'}
└ Max Slippage: ${config.maxSlippagePercent || 2}%`;

  return {
    text,
    buttons: [
      [
        btn(polyEnabled ? '❌ Disable Poly' : '✅ Enable Poly', `copy:platform:poly:${configId}`),
        btn(hlEnabled ? '❌ Disable HL' : '✅ Enable HL', `copy:platform:hl:${configId}`),
      ],
      [
        btn(kalshiEnabled ? '❌ Disable Kalshi' : '✅ Enable Kalshi', `copy:platform:kalshi:${configId}`),
      ],
      [
        btn(config.instantMode ? '🐢 Disable Instant' : '⚡ Enable Instant', `copy:instant:${configId}`),
      ],
      [
        btn('🔧 HL Leverage', `copy:leverage:${configId}`),
        btn('🎯 Kalshi Threshold', `copy:threshold:${configId}`),
      ],
      [
        backBtn(`copy:stats:${configId}`),
        mainMenuBtn(),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Toggle platform for a subscription
 */
export async function togglePlatformHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const [platform, configId] = params;

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    const platforms = config.platforms || {
      polymarket: { enabled: true, maxSize: 500 },
    };

    // Toggle the platform
    switch (platform) {
      case 'poly':
        platforms.polymarket = {
          ...platforms.polymarket,
          enabled: !platforms.polymarket?.enabled,
          maxSize: platforms.polymarket?.maxSize || 500,
        };
        break;
      case 'hl':
        platforms.hyperliquid = {
          ...platforms.hyperliquid,
          enabled: !platforms.hyperliquid?.enabled,
          maxSize: platforms.hyperliquid?.maxSize || 1000,
          matchLeverage: platforms.hyperliquid?.matchLeverage ?? true,
          maxLeverage: platforms.hyperliquid?.maxLeverage || 5,
        };
        break;
      case 'kalshi':
        platforms.kalshi = {
          ...platforms.kalshi,
          enabled: !platforms.kalshi?.enabled,
          maxSize: platforms.kalshi?.maxSize || 500,
          momentumThreshold: platforms.kalshi?.momentumThreshold || 70,
        };
        break;
    }

    await ctx.copyTrading.updateConfig(configId, { platforms });

    // Return to platform settings
    return platformSettingsHandler(ctx, [configId]);
  } catch (error) {
    logger.error({ error, platform, configId }, 'Failed to toggle platform');
    return {
      text: `❌ *Failed to Toggle Platform*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', `copy:platforms:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Toggle instant mode for a subscription
 */
export async function toggleInstantModeHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    await ctx.copyTrading.updateConfig(configId, {
      instantMode: !config.instantMode,
    });

    const newMode = !config.instantMode;

    return {
      text: `${newMode ? '⚡' : '🐢'} *Instant Mode ${newMode ? 'Enabled' : 'Disabled'}*

${newMode
        ? 'Trades will be copied immediately without delay.'
        : 'Trades will use the configured copy delay.'}`,
      buttons: [
        [btn('⚙️ Platform Settings', `copy:platforms:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, configId }, 'Failed to toggle instant mode');
    return {
      text: `❌ *Failed to Toggle Instant Mode*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', `copy:platforms:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Hyperliquid leverage settings handler
 */
export async function leverageSettingsHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];
  ctx.state.currentMenu = 'copy_leverage';
  ctx.state.pendingConfigId = configId;

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const config = await ctx.copyTrading.getConfig(configId);
  if (!config) {
    return {
      text: `❌ Subscription not found`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const hlSettings = config.platforms?.hyperliquid || {
    enabled: false,
    maxSize: 1000,
    matchLeverage: true,
    maxLeverage: 5,
  };

  const text = `🔧 *Hyperliquid Leverage Settings*

*Match Leverage:* ${hlSettings.matchLeverage ? 'Yes' : 'No'}
When enabled, we'll use the same leverage as the whale (capped at your max).

*Max Leverage:* ${hlSettings.maxLeverage}x
Maximum leverage to use, even if the whale uses more.

⚠️ Higher leverage = higher risk!

Select your max leverage:`;

  return {
    text,
    buttons: [
      [
        btn('1x', `copy:setlev:1:${configId}`),
        btn('2x', `copy:setlev:2:${configId}`),
        btn('3x', `copy:setlev:3:${configId}`),
        btn('5x', `copy:setlev:5:${configId}`),
      ],
      [
        btn('10x', `copy:setlev:10:${configId}`),
        btn('20x', `copy:setlev:20:${configId}`),
      ],
      [
        btn(hlSettings.matchLeverage ? '❌ Disable Match' : '✅ Enable Match', `copy:matchlev:${configId}`),
      ],
      [
        backBtn(`copy:platforms:${configId}`),
        mainMenuBtn(),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Set leverage handler
 */
export async function setLeverageHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const [leverage, configId] = params;
  const leverageNum = parseInt(leverage, 10);

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    const platforms = config.platforms || {};
    platforms.hyperliquid = {
      ...platforms.hyperliquid,
      enabled: platforms.hyperliquid?.enabled ?? false,
      maxSize: platforms.hyperliquid?.maxSize || 1000,
      matchLeverage: platforms.hyperliquid?.matchLeverage ?? true,
      maxLeverage: leverageNum,
    };

    await ctx.copyTrading.updateConfig(configId, { platforms });

    return {
      text: `✅ *Max Leverage Set to ${leverageNum}x*

Hyperliquid trades will now use maximum ${leverageNum}x leverage.`,
      buttons: [
        [btn('⚙️ Leverage Settings', `copy:leverage:${configId}`)],
        [btn('🔙 Platform Settings', `copy:platforms:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, leverage, configId }, 'Failed to set leverage');
    return {
      text: `❌ *Failed to Set Leverage*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', `copy:leverage:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Toggle leverage matching
 */
export async function toggleMatchLeverageHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    const platforms = config.platforms || {};
    const currentMatch = platforms.hyperliquid?.matchLeverage ?? true;

    platforms.hyperliquid = {
      ...platforms.hyperliquid,
      enabled: platforms.hyperliquid?.enabled ?? false,
      maxSize: platforms.hyperliquid?.maxSize || 1000,
      matchLeverage: !currentMatch,
      maxLeverage: platforms.hyperliquid?.maxLeverage || 5,
    };

    await ctx.copyTrading.updateConfig(configId, { platforms });

    return leverageSettingsHandler(ctx, [configId]);
  } catch (error) {
    logger.error({ error, configId }, 'Failed to toggle match leverage');
    return {
      text: `❌ *Failed to Toggle*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', `copy:leverage:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}

/**
 * Kalshi momentum threshold settings handler
 */
export async function thresholdSettingsHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const configId = params[0];
  ctx.state.currentMenu = 'copy_threshold';

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const config = await ctx.copyTrading.getConfig(configId);
  if (!config) {
    return {
      text: `❌ Subscription not found`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  const kalshiSettings = config.platforms?.kalshi || {
    enabled: false,
    maxSize: 500,
    momentumThreshold: 70,
  };

  const text = `🎯 *Kalshi Momentum Threshold*

Current: *${kalshiSettings.momentumThreshold}%*

Since Kalshi doesn't expose wallet addresses, we detect whale activity through market momentum patterns:

• Price movement
• Volume spikes
• Orderbook imbalance
• Large orders

Higher threshold = fewer but more confident signals.

Select threshold:`;

  return {
    text,
    buttons: [
      [
        btn('50%', `copy:setthresh:50:${configId}`),
        btn('60%', `copy:setthresh:60:${configId}`),
        btn('70%', `copy:setthresh:70:${configId}`),
      ],
      [
        btn('80%', `copy:setthresh:80:${configId}`),
        btn('90%', `copy:setthresh:90:${configId}`),
      ],
      [
        backBtn(`copy:platforms:${configId}`),
        mainMenuBtn(),
      ],
    ],
    parseMode: 'Markdown',
  };
}

/**
 * Set momentum threshold handler
 */
export async function setThresholdHandler(
  ctx: MenuContext,
  params: string[]
): Promise<MenuResult> {
  const [threshold, configId] = params;
  const thresholdNum = parseInt(threshold, 10);

  if (!ctx.copyTrading) {
    return {
      text: `❌ Service unavailable`,
      buttons: [[mainMenuBtn()]],
      parseMode: 'Markdown',
    };
  }

  try {
    const config = await ctx.copyTrading.getConfig(configId);
    if (!config) {
      throw new Error('Subscription not found');
    }

    const platforms = config.platforms || {};
    platforms.kalshi = {
      ...platforms.kalshi,
      enabled: platforms.kalshi?.enabled ?? false,
      maxSize: platforms.kalshi?.maxSize || 500,
      momentumThreshold: thresholdNum,
    };

    await ctx.copyTrading.updateConfig(configId, { platforms });

    return {
      text: `✅ *Momentum Threshold Set to ${thresholdNum}%*

Kalshi signals must now have at least ${thresholdNum}% confidence to trigger a copy trade.`,
      buttons: [
        [btn('🎯 Threshold Settings', `copy:threshold:${configId}`)],
        [btn('🔙 Platform Settings', `copy:platforms:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  } catch (error) {
    logger.error({ error, threshold, configId }, 'Failed to set threshold');
    return {
      text: `❌ *Failed to Set Threshold*

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [
        [btn('🔄 Try Again', `copy:threshold:${configId}`)],
        [mainMenuBtn()],
      ],
      parseMode: 'Markdown',
    };
  }
}
