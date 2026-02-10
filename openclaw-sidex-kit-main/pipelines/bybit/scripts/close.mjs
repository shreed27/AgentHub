import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { values } = parseArgs({
    options: {
        symbol: { type: 'string' },
        direction: { type: 'string' },
        api_key: { type: 'string' },
        api_secret: { type: 'string' }
    },
});

const { symbol, direction, api_key, api_secret } = values;

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'bybit_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Bybit Close Position: ${JSON.stringify({ symbol })}\n`);

if (!symbol || !api_key || !api_secret) {
    console.error("Missing required arguments: symbol, api_key, api_secret");
    process.exit(1);
}

const BASE_URL = 'https://api.bybit.com';

console.log(`Bybit Pipeline: Closing position for ${symbol}...`);

function getSignature(parameters, secret, timestamp) {
    const recvWindow = '5000';
    const stringToSign = timestamp + api_key + recvWindow + parameters;
    return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
}

async function getPositions(targetSymbol) {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const query = `category=linear&symbol=${targetSymbol}`;
    const sig = getSignature(query, api_secret, timestamp);

    const res = await fetch(`${BASE_URL}/v5/position/list?${query}`, {
        method: 'GET',
        headers: {
            'X-BAPI-API-KEY': api_key,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-SIGN': sig,
            'X-BAPI-RECV-WINDOW': recvWindow
        }
    });

    const data = await res.json();
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Positions: ${JSON.stringify(data)}\n`);
    return data;
}

async function closePosition() {
    try {
        const targetSymbol = symbol.replace('/', '').toUpperCase();
        console.log(`🔍 Fetching Current Positions via ${BASE_URL}/v5/position/list`);

        // 1. Get Real Positions from API
        const positionData = await getPositions(targetSymbol);

        if (positionData.retCode !== 0) {
            console.error(`❌ Bybit Error ${positionData.retCode}: ${positionData.retMsg}`);
            process.exit(1);
        }

        const positions = positionData.result?.list || [];
        const pos = positions.find(p => p.symbol === targetSymbol && parseFloat(p.size) !== 0);

        if (pos && parseFloat(pos.size) > 0) {
            console.log(`✅ Found Position: ${pos.size} ${targetSymbol} (${pos.side})`);
            console.log(`   Entry Price: ${pos.avgPrice}`);
            console.log(`   Unrealized PnL: ${pos.unrealisedPnl}`);

            // To close, we send an opposing order
            const closeSide = pos.side === 'Buy' ? 'Sell' : 'Buy';
            console.log(`🚀 Sending Market ${closeSide} to Close ${pos.size}`);

            // 2. Execute close order
            const timestamp = Date.now().toString();
            const recvWindow = '5000';

            const payload = {
                category: "linear",
                symbol: targetSymbol,
                side: closeSide,
                orderType: "Market",
                qty: pos.size,
                reduceOnly: true
            };

            const bodyStr = JSON.stringify(payload);
            const sig = getSignature(bodyStr, api_secret, timestamp);

            const res = await fetch(`${BASE_URL}/v5/order/create`, {
                method: 'POST',
                headers: {
                    'X-BAPI-API-KEY': api_key,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-SIGN': sig,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                body: bodyStr
            });

            const response = await res.json();
            fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Close Response: ${JSON.stringify(response)}\n`);

            if (response.retCode === 0) {
                console.log('✅ Position Closed Successfully!');
                console.log(`   Order ID: ${response.result.orderId}`);
                console.log(`   Order Link ID: ${response.result.orderLinkId}`);

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    exchange: 'bybit',
                    action: 'close_position',
                    symbol: targetSymbol,
                    side: closeSide,
                    quantity: pos.size,
                    result: {
                        orderId: response.result.orderId,
                        orderLinkId: response.result.orderLinkId
                    }
                };

                const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
                try {
                    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
                } catch (e) { }

                console.log(JSON.stringify({ success: true, ...logEntry.result }));
            } else {
                console.error(`❌ Bybit Error ${response.retCode}: ${response.retMsg}`);
                process.exit(1);
            }
        } else {
            console.log(`✅ No open position for ${targetSymbol}`);
            console.log(JSON.stringify({ success: true, message: 'No position to close' }));
        }

    } catch (error) {
        console.error("Pipeline Error:", error.message);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Error: ${error.message}\n`);
        process.exit(1);
    }
}

closePosition();
