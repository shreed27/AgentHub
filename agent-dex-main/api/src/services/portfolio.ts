import { PublicKey } from '@solana/web3.js';
import { connection } from './jupiter';
import { getMultipleTokenPrices } from './jupiter';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Well-known token metadata
const TOKEN_META: Record<string, { symbol: string; name: string; decimals: number }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Wrapped SOL', decimals: 9 },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL', decimals: 9 },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ETH', name: 'Ether (Wormhole)', decimals: 8 },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', decimals: 6 },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': { symbol: 'JTO', name: 'Jito', decimals: 9 },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network', decimals: 6 },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { symbol: 'RNDR', name: 'Render Token', decimals: 8 },
};

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number | null;
}

export async function getPortfolio(walletAddress: string): Promise<{
  solBalance: number;
  solUsdValue: number | null;
  tokens: TokenBalance[];
  totalUsdValue: number | null;
}> {
  const pubkey = new PublicKey(walletAddress);

  // Get SOL balance
  const solLamports = await connection.getBalance(pubkey);
  const solBalance = solLamports / 1e9;

  // Get token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  });

  const tokens: TokenBalance[] = [];
  const mints: string[] = ['So11111111111111111111111111111111111111112'];

  for (const account of tokenAccounts.value) {
    const info = account.account.data.parsed.info;
    const mint = info.mint as string;
    const amount = info.tokenAmount;

    if (amount.uiAmount === 0) continue;

    const meta = TOKEN_META[mint];
    tokens.push({
      mint,
      symbol: meta?.symbol || mint.slice(0, 6) + '...',
      name: meta?.name || 'Unknown Token',
      balance: amount.uiAmount,
      decimals: amount.decimals,
      usdValue: null,
    });

    mints.push(mint);
  }

  // Fetch prices for all tokens
  let solUsdValue: number | null = null;
  try {
    const prices = await getMultipleTokenPrices(mints);

    const solPrice = prices['So11111111111111111111111111111111111111112'];
    if (solPrice) {
      solUsdValue = solBalance * solPrice.price;
    }

    for (const token of tokens) {
      const price = prices[token.mint];
      if (price) {
        token.usdValue = token.balance * price.price;
      }
    }
  } catch {
    // Prices unavailable, continue without
  }

  const totalUsdValue = (solUsdValue || 0) + tokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);

  return {
    solBalance,
    solUsdValue,
    tokens,
    totalUsdValue: totalUsdValue || null,
  };
}
