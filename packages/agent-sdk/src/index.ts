/**
 * @dain/agent-sdk
 *
 * The SDK for autonomous trading agents.
 * Trade Solana DEXs, prediction markets, and perpetual futures without wallet popups.
 *
 * @example
 * ```ts
 * import { DainClient } from '@dain/agent-sdk';
 *
 * const dain = new DainClient({
 *   apiKey: process.env.DAIN_API_KEY,
 *   environment: 'production'
 * });
 *
 * // Register your agent
 * const agent = await dain.registerAgent({
 *   name: 'my-trading-bot',
 *   permissions: ['SWAP', 'LIMIT_ORDER']
 * });
 *
 * // Execute a trade
 * const result = await dain.solana.swap({
 *   inputMint: 'So11111111111111111111111111111111111111112', // SOL
 *   outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
 *   amount: 100000000, // 0.1 SOL in lamports
 *   slippage: 0.5
 * });
 * ```
 */

export { DainClient } from './client';
export { SolanaModule } from './solana';
export { PredictionModule } from './prediction';
export { FuturesModule } from './futures';
export { SurvivalMode } from './survival';

// Types
export type {
  DainConfig,
  Agent,
  AgentPermission,
  AgentStatus,
  TradeIntent,
  TradeResult,
  Position,
  Signal,
  SignalSource,
  SurvivalState,
  WalletPermission,
} from './types';

// Re-export submodules for convenience
export * from './solana';
export * from './prediction';
export * from './futures';
