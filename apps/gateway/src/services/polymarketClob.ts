/**
 * Polymarket CLOB Service
 *
 * Handles real order execution against the Polymarket CLOB API.
 * Implements EIP-712 order signing and HMAC API authentication.
 */

import { createHmac, randomBytes } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CLOB_BASE_URL = 'https://clob.polymarket.com';
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

// Contract addresses on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';

const PROTOCOL_NAME = 'Polymarket CTF Exchange';
const PROTOCOL_VERSION = '1';
const CHAIN_ID = 137; // Polygon
const USDC_DECIMALS = 6;

// =============================================================================
// TYPES
// =============================================================================

export interface PolymarketCredentials {
  address: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  privateKey: string;
}

export interface OrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  feeRateBps?: number;
  nonce?: string;
  expiration?: number;
  negRisk?: boolean;
}

interface PolymarketOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: string;
  signatureType: number;
}

interface PostOrderBody {
  order: {
    salt: number;
    maker: string;
    signer: string;
    taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: 'BUY' | 'SELL';
    signatureType: number;
    signature: string;
  };
  owner: string;
  orderType: 'GTC' | 'GTD' | 'FOK';
  deferExec: boolean;
  postOnly?: boolean;
}

export interface ClobOrderResponse {
  success: boolean;
  orderId?: string;
  status?: string;
  errorMsg?: string;
}

export interface MarketData {
  conditionId: string;
  questionId: string;
  tokens: Array<{
    tokenId: string;
    outcome: string;
    price: number;
  }>;
  volume: number;
  liquidity: number;
  endDate: string;
}

// =============================================================================
// KECCAK256 (using native crypto with sha3 polyfill approach)
// =============================================================================

// Simple keccak256 implementation using ethers-style approach
function keccak256(data: Buffer | Uint8Array): string {
  // For now, we'll use a simplified approach
  // In production, use @noble/hashes/sha3
  const crypto = require('crypto');
  // Note: Node.js crypto doesn't have keccak256 natively
  // We need to import it from a library like @noble/hashes
  try {
    const { keccak_256 } = require('@noble/hashes/sha3');
    const { bytesToHex } = require('@noble/hashes/utils');
    return bytesToHex(keccak_256(data));
  } catch {
    // Fallback: throw error indicating dependency needed
    throw new Error('Missing @noble/hashes dependency for keccak256');
  }
}

// =============================================================================
// SECP256K1 SIGNING
// =============================================================================

function signHash(hash: string, privateKey: string): string {
  try {
    const { secp256k1 } = require('@noble/curves/secp256k1');
    const { hexToBytes } = require('@noble/hashes/utils');

    const keyBytes = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const hashBytes = hexToBytes(hash.startsWith('0x') ? hash.slice(2) : hash);

    const sig = secp256k1.sign(hashBytes, keyBytes);
    const r = sig.r.toString(16).padStart(64, '0');
    const s = sig.s.toString(16).padStart(64, '0');
    const v = sig.recovery + 27;

    return '0x' + r + s + v.toString(16).padStart(2, '0');
  } catch {
    throw new Error('Missing @noble/curves dependency for signing');
  }
}

function deriveAddress(privateKey: string): string {
  try {
    const { secp256k1 } = require('@noble/curves/secp256k1');
    const keyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const pubKey = secp256k1.getPublicKey(keyHex, false).slice(1);
    const hash = keccak256(pubKey);
    return '0x' + hash.slice(-40);
  } catch {
    throw new Error('Missing @noble/curves dependency for address derivation');
  }
}

// =============================================================================
// HMAC AUTHENTICATION
// =============================================================================

function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  pathWithQuery: string,
  body?: string
): string {
  const key = Buffer.from(secret, 'base64');
  const payload = `${timestamp}${method.toUpperCase()}${pathWithQuery}${body ?? ''}`;
  return createHmac('sha256', key).update(payload).digest('base64');
}

function buildAuthHeaders(
  credentials: PolymarketCredentials,
  method: string,
  path: string,
  body?: unknown
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
  const signature = buildHmacSignature(
    credentials.apiSecret,
    timestamp,
    method,
    path,
    bodyString
  );

  return {
    'POLY-ADDRESS': credentials.address,
    'POLY-API-KEY': credentials.apiKey,
    'POLY-PASSPHRASE': credentials.apiPassphrase,
    'POLY-TIMESTAMP': timestamp,
    'POLY-SIGNATURE': signature,
    'Content-Type': 'application/json',
  };
}

// =============================================================================
// EIP-712 HASHING
// =============================================================================

const ORDER_TYPE_STRING =
  'Order(uint256 salt,address maker,address signer,address taker,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint256 expiration,uint256 nonce,uint256 feeRateBps,uint8 side,uint8 signatureType)';

function hashDomain(contractAddress: string): string {
  const typeHash = Buffer.from(
    keccak256(Buffer.from('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
    'hex'
  );

  const nameHash = Buffer.from(keccak256(Buffer.from(PROTOCOL_NAME)), 'hex');
  const versionHash = Buffer.from(keccak256(Buffer.from(PROTOCOL_VERSION)), 'hex');
  const chainIdHex = CHAIN_ID.toString(16).padStart(64, '0');
  const contractHex = contractAddress.slice(2).toLowerCase().padStart(64, '0');

  const encoded = Buffer.concat([
    typeHash,
    nameHash,
    versionHash,
    Buffer.from(chainIdHex, 'hex'),
    Buffer.from(contractHex, 'hex'),
  ]);

  return '0x' + keccak256(encoded);
}

function encodeUint256(value: string | number | bigint): string {
  return BigInt(value).toString(16).padStart(64, '0');
}

function encodeAddress(address: string): string {
  return address.slice(2).toLowerCase().padStart(64, '0');
}

function hashOrder(order: PolymarketOrder): string {
  const typeHash = Buffer.from(keccak256(Buffer.from(ORDER_TYPE_STRING)), 'hex');

  const encoded = Buffer.concat([
    typeHash,
    Buffer.from(encodeUint256(order.salt), 'hex'),
    Buffer.from(encodeAddress(order.maker), 'hex'),
    Buffer.from(encodeAddress(order.signer), 'hex'),
    Buffer.from(encodeAddress(order.taker), 'hex'),
    Buffer.from(encodeUint256(order.tokenId), 'hex'),
    Buffer.from(encodeUint256(order.makerAmount), 'hex'),
    Buffer.from(encodeUint256(order.takerAmount), 'hex'),
    Buffer.from(encodeUint256(order.expiration), 'hex'),
    Buffer.from(encodeUint256(order.nonce), 'hex'),
    Buffer.from(encodeUint256(order.feeRateBps), 'hex'),
    Buffer.from(encodeUint256(order.side), 'hex'),
    Buffer.from(encodeUint256(order.signatureType), 'hex'),
  ]);

  return '0x' + keccak256(encoded);
}

function createTypedDataHash(contractAddress: string, order: PolymarketOrder): string {
  const domainSeparator = hashDomain(contractAddress);
  const structHash = hashOrder(order);

  const encoded = Buffer.concat([
    Buffer.from([0x19, 0x01]),
    Buffer.from(domainSeparator.slice(2), 'hex'),
    Buffer.from(structHash.slice(2), 'hex'),
  ]);

  return '0x' + keccak256(encoded);
}

// =============================================================================
// ORDER BUILDING
// =============================================================================

function getOrderAmounts(
  price: number,
  size: number,
  side: 'buy' | 'sell'
): { makerAmount: string; takerAmount: string } {
  const roundedPrice = Math.round(price * 100) / 100;
  const roundedSize = Math.round(size * 100) / 100;

  const rawSize = Math.round(roundedSize * Math.pow(10, USDC_DECIMALS));
  const rawCost = Math.round(roundedSize * roundedPrice * Math.pow(10, USDC_DECIMALS));

  if (side === 'buy') {
    return {
      makerAmount: rawCost.toString(),
      takerAmount: rawSize.toString(),
    };
  } else {
    return {
      makerAmount: rawSize.toString(),
      takerAmount: rawCost.toString(),
    };
  }
}

function generateSalt(): string {
  return Math.round(Math.random() * Date.now()).toString();
}

function buildSignedOrder(
  params: OrderParams,
  credentials: PolymarketCredentials
): PostOrderBody {
  const signerAddress = deriveAddress(credentials.privateKey);
  const maker = credentials.address; // Funder address
  const signatureType = 2; // POLY_GNOSIS_SAFE (most common for web wallets)
  const exchange = params.negRisk ? NEG_RISK_CTF_EXCHANGE : CTF_EXCHANGE;

  const { makerAmount, takerAmount } = getOrderAmounts(params.price, params.size, params.side);
  const salt = generateSalt();
  const sideNum = params.side === 'buy' ? 0 : 1;

  const order: PolymarketOrder = {
    salt,
    maker,
    signer: signerAddress,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration: (params.expiration || 0).toString(),
    nonce: params.nonce || '0',
    feeRateBps: (params.feeRateBps || 0).toString(),
    side: sideNum.toString(),
    signatureType,
  };

  const hash = createTypedDataHash(exchange, order);
  const signature = signHash(hash, credentials.privateKey);

  return {
    order: {
      salt: parseInt(salt, 10),
      maker,
      signer: signerAddress,
      taker: '0x0000000000000000000000000000000000000000',
      tokenId: params.tokenId,
      makerAmount,
      takerAmount,
      expiration: (params.expiration || 0).toString(),
      nonce: params.nonce || '0',
      feeRateBps: (params.feeRateBps || 0).toString(),
      side: params.side === 'buy' ? 'BUY' : 'SELL',
      signatureType,
      signature,
    },
    owner: credentials.apiKey, // Owner is the API key
    orderType: 'GTC',
    deferExec: false,
  };
}

// =============================================================================
// POLYMARKET CLOB SERVICE CLASS
// =============================================================================

export class PolymarketClobService {
  private credentials: PolymarketCredentials | null = null;

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials(): void {
    const apiKey = process.env.POLY_API_KEY;
    const apiSecret = process.env.POLY_API_SECRET;
    const apiPassphrase = process.env.POLY_API_PASSPHRASE;
    const privateKey = process.env.POLY_PRIVATE_KEY;
    const address = process.env.POLY_FUNDER_ADDRESS;

    if (apiKey && apiSecret && apiPassphrase && privateKey && address) {
      this.credentials = {
        address,
        apiKey,
        apiSecret,
        apiPassphrase,
        privateKey,
      };
    }
  }

  isConfigured(): boolean {
    return this.credentials !== null;
  }

  getCredentialsStatus(): { configured: boolean; address?: string } {
    return {
      configured: this.isConfigured(),
      address: this.credentials?.address,
    };
  }

  // ---------------------------------------------------------------------------
  // ORDER OPERATIONS
  // ---------------------------------------------------------------------------

  async placeOrder(params: OrderParams): Promise<ClobOrderResponse> {
    if (!this.credentials) {
      return { success: false, errorMsg: 'Polymarket credentials not configured' };
    }

    try {
      const signedOrder = buildSignedOrder(params, this.credentials);
      const path = '/order';
      const headers = buildAuthHeaders(this.credentials, 'POST', path, signedOrder);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(signedOrder),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMsg: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        orderId: data.orderID || data.orderId,
        status: data.status,
      };
    } catch (error) {
      return {
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelOrder(orderId: string): Promise<ClobOrderResponse> {
    if (!this.credentials) {
      return { success: false, errorMsg: 'Polymarket credentials not configured' };
    }

    try {
      const path = '/order';
      const body = { orderID: orderId };
      const headers = buildAuthHeaders(this.credentials, 'DELETE', path, body);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMsg: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        orderId,
        status: 'cancelled',
      };
    } catch (error) {
      return {
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelAllOrders(marketId?: string): Promise<ClobOrderResponse> {
    if (!this.credentials) {
      return { success: false, errorMsg: 'Polymarket credentials not configured' };
    }

    try {
      const path = '/cancel-all';
      const body = marketId ? { market: marketId } : {};
      const headers = buildAuthHeaders(this.credentials, 'DELETE', path, body);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMsg: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        status: 'all_cancelled',
      };
    } catch (error) {
      return {
        success: false,
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ORDER QUERIES
  // ---------------------------------------------------------------------------

  async getOpenOrders(marketId?: string): Promise<unknown[]> {
    if (!this.credentials) {
      return [];
    }

    try {
      let path = '/orders?open=true';
      if (marketId) {
        path += `&market=${marketId}`;
      }
      const headers = buildAuthHeaders(this.credentials, 'GET', path);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('Failed to fetch open orders:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return [];
    }
  }

  async getOrderHistory(limit = 100): Promise<unknown[]> {
    if (!this.credentials) {
      return [];
    }

    try {
      const path = `/orders?limit=${limit}`;
      const headers = buildAuthHeaders(this.credentials, 'GET', path);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('Failed to fetch order history:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order history:', error);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // POSITION QUERIES
  // ---------------------------------------------------------------------------

  async getPositions(): Promise<unknown[]> {
    if (!this.credentials) {
      return [];
    }

    try {
      const path = '/positions';
      const headers = buildAuthHeaders(this.credentials, 'GET', path);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('Failed to fetch positions:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  async getBalances(): Promise<{ usdc: number; collateral: number }> {
    if (!this.credentials) {
      return { usdc: 0, collateral: 0 };
    }

    try {
      const path = '/balance';
      const headers = buildAuthHeaders(this.credentials, 'GET', path);

      const response = await fetch(`${CLOB_BASE_URL}${path}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('Failed to fetch balances:', response.status);
        return { usdc: 0, collateral: 0 };
      }

      const data = await response.json();
      return {
        usdc: parseFloat(data.usdc || '0'),
        collateral: parseFloat(data.collateral || '0'),
      };
    } catch (error) {
      console.error('Error fetching balances:', error);
      return { usdc: 0, collateral: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // MARKET DATA (Public, no auth required)
  // ---------------------------------------------------------------------------

  async getMarkets(params?: {
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<unknown[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.active !== undefined) queryParams.set('active', params.active.toString());
      if (params?.closed !== undefined) queryParams.set('closed', params.closed.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const url = `${GAMMA_API_URL}/markets${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Failed to fetch markets:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  async getMarket(conditionId: string): Promise<unknown | null> {
    try {
      const response = await fetch(`${GAMMA_API_URL}/markets/${conditionId}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  async getOrderbook(tokenId: string): Promise<{ bids: unknown[]; asks: unknown[] }> {
    try {
      const response = await fetch(`${CLOB_BASE_URL}/book?token_id=${tokenId}`);

      if (!response.ok) {
        return { bids: [], asks: [] };
      }

      const data = await response.json();
      return {
        bids: data.bids || [],
        asks: data.asks || [],
      };
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      return { bids: [], asks: [] };
    }
  }

  async getMidpoint(tokenId: string): Promise<number | null> {
    try {
      const response = await fetch(`${CLOB_BASE_URL}/midpoint?token_id=${tokenId}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return parseFloat(data.mid || '0');
    } catch (error) {
      console.error('Error fetching midpoint:', error);
      return null;
    }
  }

  async getPrice(tokenId: string, side: 'buy' | 'sell'): Promise<number | null> {
    try {
      const response = await fetch(`${CLOB_BASE_URL}/price?token_id=${tokenId}&side=${side.toUpperCase()}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return parseFloat(data.price || '0');
    } catch (error) {
      console.error('Error fetching price:', error);
      return null;
    }
  }
}

// Export singleton instance
export const polymarketClob = new PolymarketClobService();
