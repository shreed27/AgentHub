import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import { keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const { values } = parseArgs({
    options: {
        symbol: { type: 'string' },
        direction: { type: 'string' },
        private_key: { type: 'string' },
        wallet_address: { type: 'string' }
    },
    allowPositionals: true
});

const symbol = values.symbol || process.argv[2];
const direction = values.direction || process.argv[3];
const private_key = values.private_key || process.argv[4];

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'hyperliquid_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Hyperliquid Close Position: ${JSON.stringify({ symbol })}\n`);

if (!symbol || !private_key) {
    console.error("Missing required arguments: symbol, private_key");
    process.exit(1);
}

const INFO_URL = "https://api.hyperliquid.xyz/info";
const EXCHANGE_URL = "https://api.hyperliquid.xyz/exchange";

console.log(`Hyperliquid Pipeline: Closing position for ${symbol}...`);

async function getAssetIndex(symbolName) {
    const res = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' })
    });
    const meta = await res.json();
    const universe = meta.universe || [];

    for (let i = 0; i < universe.length; i++) {
        if (universe[i].name.toUpperCase() === symbolName.toUpperCase()) {
            return i;
        }
    }
    throw new Error(`Asset ${symbolName} not found`);
}

async function getPositions(walletAddress) {
    const res = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'clearinghouseState',
            user: walletAddress
        })
    });
    return await res.json();
}

async function getMidPrice(assetIndex) {
    const res = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
    });
    const mids = await res.json();
    return parseFloat(mids[assetIndex]);
}

async function closePosition() {
    try {
        const symbolName = symbol.replace('/USDT', '').replace('USDT', '').toUpperCase();
        console.log(`🔍 Checking Open Positions for ${symbolName}`);

        // 1. Get wallet from private key
        const formattedKey = private_key.startsWith('0x') ? private_key : `0x${private_key}`;
        const account = privateKeyToAccount(formattedKey);
        const walletAddr = values.wallet_address || account.address;

        console.log(`   Wallet: ${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`);

        // 2. Get current positions
        const clearinghouse = await getPositions(walletAddr);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Positions: ${JSON.stringify(clearinghouse)}\n`);

        const assetPositions = clearinghouse.assetPositions || [];
        const pos = assetPositions.find(p =>
            p.position &&
            p.position.coin.toUpperCase() === symbolName &&
            parseFloat(p.position.szi) !== 0
        );

        if (pos && pos.position) {
            const size = parseFloat(pos.position.szi);
            const isLong = size > 0;
            const absSize = Math.abs(size).toString();

            console.log(`✅ Found Position: ${pos.position.szi} ${symbolName}`);
            console.log(`   Entry Price: ${pos.position.entryPx}`);
            console.log(`   Unrealized PnL: ${pos.position.unrealizedPnl}`);

            // 3. Get asset index and price for close order
            const assetIndex = await getAssetIndex(symbolName);
            const midPrice = await getMidPrice(assetIndex);

            // Close with aggressive limit (IOC)
            const closePrice = isLong
                ? midPrice * 0.95  // Sell lower for longs
                : midPrice * 1.05; // Buy higher for shorts

            console.log(`🚀 Sending Close Order: ${isLong ? 'SELL' : 'BUY'} ${absSize} @ ${closePrice.toFixed(2)}`);

            // 4. Build close order
            const nonce = Date.now();
            const orderAction = {
                type: "order",
                orders: [{
                    a: assetIndex,
                    b: !isLong, // Opposite side to close
                    p: closePrice.toFixed(2),
                    s: absSize,
                    r: true, // reduceOnly
                    t: { limit: { tif: "Ioc" } }
                }],
                grouping: "na"
            };

            // 5. Sign and send
            const actionHash = keccak256(
                encodePacked(['string'], [JSON.stringify(orderAction)])
            );

            const signature = await account.signMessage({
                message: { raw: actionHash }
            });

            const requestBody = {
                action: orderAction,
                nonce,
                signature,
                vaultAddress: null
            };

            const res = await fetch(EXCHANGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const response = await res.json();
            fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Close Response: ${JSON.stringify(response)}\n`);

            if (response.status === 'ok') {
                const statuses = response.response?.data?.statuses || [];
                console.log('✅ Position Closed Successfully!');
                console.log(`   Status: ${JSON.stringify(statuses)}`);

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    exchange: 'hyperliquid',
                    action: 'close_position',
                    symbol: symbolName,
                    side: isLong ? 'sell' : 'buy',
                    size: absSize,
                    result: { status: 'ok', statuses }
                };

                const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
                try {
                    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
                } catch (e) { }

                console.log(JSON.stringify({ success: true, ...logEntry.result }));
            } else {
                console.error(`❌ Hyperliquid Error: ${JSON.stringify(response)}`);
                process.exit(1);
            }
        } else {
            console.log(`✅ No open position for ${symbolName}`);
            console.log(JSON.stringify({ success: true, message: 'No position to close' }));
        }

    } catch (error) {
        console.error("Pipeline Error:", error.message);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Error: ${error.message}\n`);
        process.exit(1);
    }
}

closePosition();
