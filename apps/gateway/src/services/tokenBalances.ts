/**
 * Token Balance Service
 *
 * Provides direct Solana RPC calls for fetching wallet token balances
 * without relying on agent-dex service.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getConnectionWithFallback } from './solana.js';

const JUPITER_TOKEN_LIST = 'https://token.jup.ag/all';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  decimals: number;
}

interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  logo: string | null;
  balance: number;
  decimals: number;
  usdValue: number;
  price: number;
}

interface WalletPortfolio {
  solBalance: number;
  solUsdValue: number;
  tokens: TokenBalance[];
  totalUsdValue: number;
}

// Cache for token metadata to avoid repeated fetches
let tokenMetadataCache: Map<string, TokenMetadata> | null = null;
let tokenMetadataCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchTokenMetadata(): Promise<Map<string, TokenMetadata>> {
  // Return cached data if still valid
  if (tokenMetadataCache && Date.now() - tokenMetadataCacheTime < CACHE_TTL) {
    return tokenMetadataCache;
  }

  try {
    const response = await fetch(JUPITER_TOKEN_LIST);
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`);
    }
    const tokens: TokenMetadata[] = await response.json();
    tokenMetadataCache = new Map(tokens.map(t => [t.address, t]));
    tokenMetadataCacheTime = Date.now();
    return tokenMetadataCache;
  } catch (error) {
    console.error('[TokenBalances] Failed to fetch token metadata:', error);
    // Return empty map on error
    return tokenMetadataCache || new Map();
  }
}

async function fetchPrices(mints: string[]): Promise<Map<string, number>> {
  if (mints.length === 0) {
    return new Map();
  }

  try {
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${mints.join(',')}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status}`);
    }
    const data = await response.json();

    const prices = new Map<string, number>();
    for (const mint of mints) {
      const price = data.data?.[mint]?.price;
      if (price !== undefined) {
        prices.set(mint, price);
      }
    }
    return prices;
  } catch (error) {
    console.error('[TokenBalances] Failed to fetch prices:', error);
    return new Map();
  }
}

export async function getWalletTokens(walletAddress: string): Promise<WalletPortfolio> {
  const connection = await getConnectionWithFallback();
  const publicKey = new PublicKey(walletAddress);

  // Get SOL balance
  const solBalance = await connection.getBalance(publicKey);
  const solBalanceInSol = solBalance / 1e9;

  // Get SPL token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  // Extract mint addresses and balances (filter zero balances)
  const tokens = tokenAccounts.value
    .map(account => {
      const parsed = account.account.data.parsed;
      return {
        mint: parsed.info.mint as string,
        balance: parsed.info.tokenAmount.uiAmount as number,
        decimals: parsed.info.tokenAmount.decimals as number,
      };
    })
    .filter(t => t.balance > 0);

  // Fetch token metadata from Jupiter
  const tokenMap = await fetchTokenMetadata();

  // Fetch prices for all tokens including SOL
  const allMints = [SOL_MINT, ...tokens.map(t => t.mint)];
  const prices = await fetchPrices(allMints);

  // Calculate SOL USD value
  const solPrice = prices.get(SOL_MINT) || 0;
  const solUsdValue = solBalanceInSol * solPrice;

  // Build token list with metadata and prices
  const tokenBalances: TokenBalance[] = tokens.map(t => {
    const meta = tokenMap.get(t.mint);
    const price = prices.get(t.mint) || 0;
    return {
      mint: t.mint,
      symbol: meta?.symbol || 'Unknown',
      name: meta?.name || 'Unknown Token',
      logo: meta?.logoURI || null,
      balance: t.balance,
      decimals: t.decimals,
      usdValue: t.balance * price,
      price,
    };
  });

  // Sort by USD value descending
  tokenBalances.sort((a, b) => b.usdValue - a.usdValue);

  // Calculate total USD value
  const tokensUsdValue = tokenBalances.reduce((sum, t) => sum + t.usdValue, 0);
  const totalUsdValue = solUsdValue + tokensUsdValue;

  return {
    solBalance: solBalanceInSol,
    solUsdValue,
    tokens: tokenBalances,
    totalUsdValue,
  };
}

export async function getSolPrice(): Promise<number> {
  const prices = await fetchPrices([SOL_MINT]);
  return prices.get(SOL_MINT) || 0;
}

export async function getTokenPrice(mint: string): Promise<number> {
  const prices = await fetchPrices([mint]);
  return prices.get(mint) || 0;
}

export async function getBatchPrices(mints: string[]): Promise<Map<string, number>> {
  return fetchPrices(mints);
}
