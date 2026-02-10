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

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'binance_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Binance Close Position: ${JSON.stringify({ symbol })}\n`);

if (!symbol || !api_key || !api_secret) {
    console.error("Missing required arguments: symbol, api_key, api_secret");
    process.exit(1);
}

const BASE_URL = 'https://fapi.binance.com';

console.log(`Binance Pipeline: Closing position for ${symbol}...`);

function signature(query, secret) {
    return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

async function getPositions(symbolName) {
    const timestamp = Date.now();
    const queryParams = `symbol=${symbolName}&timestamp=${timestamp}`;
    const sig = signature(queryParams, api_secret);
    const signedQuery = `${queryParams}&signature=${sig}`;

    const res = await fetch(`${BASE_URL}/fapi/v2/positionRisk?${signedQuery}`, {
        method: 'GET',
        headers: { 'X-MBX-APIKEY': api_key }
    });

    const data = await res.json();
    fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Positions: ${JSON.stringify(data)}\n`);
    return data;
}

async function closePosition() {
    try {
        const targetSymbol = symbol.replace('/', '').toUpperCase();
        console.log(`🔍 Fetching Current Positions via ${BASE_URL}/fapi/v2/positionRisk`);

        // 1. Get Real Positions from API
        const positions = await getPositions(targetSymbol);

        if (positions.code) {
            console.error(`❌ Binance Error ${positions.code}: ${positions.msg}`);
            process.exit(1);
        }

        const pos = positions.find(p => p.symbol === targetSymbol && parseFloat(p.positionAmt) !== 0);

        if (pos && parseFloat(pos.positionAmt) !== 0) {
            const positionAmt = parseFloat(pos.positionAmt);
            const sideToClose = positionAmt > 0 ? 'SELL' : 'BUY';
            const amountToClose = Math.abs(positionAmt).toString();

            console.log(`✅ Found Position: ${pos.positionAmt} ${targetSymbol} @ ${pos.entryPrice}`);
            console.log(`   Unrealized PnL: ${pos.unRealizedProfit}`);
            console.log(`🚀 Sending Market ${sideToClose} to Close ${amountToClose}`);

            // 2. Execute close order
            const timestamp = Date.now();
            const queryParams = [
                `symbol=${targetSymbol}`,
                `side=${sideToClose}`,
                `type=MARKET`,
                `quantity=${amountToClose}`,
                `reduceOnly=true`,
                `timestamp=${timestamp}`
            ].join('&');

            const sig = signature(queryParams, api_secret);
            const signedQuery = `${queryParams}&signature=${sig}`;

            const res = await fetch(`${BASE_URL}/fapi/v1/order`, {
                method: 'POST',
                headers: {
                    'X-MBX-APIKEY': api_key,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: signedQuery
            });

            const response = await res.json();
            fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Close Response: ${JSON.stringify(response)}\n`);

            if (response.orderId) {
                console.log('✅ Position Closed Successfully!');
                console.log(`   Order ID: ${response.orderId}`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Executed Qty: ${response.executedQty}`);
                console.log(`   Avg Price: ${response.avgPrice}`);

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    exchange: 'binance',
                    action: 'close_position',
                    symbol: targetSymbol,
                    side: sideToClose,
                    quantity: amountToClose,
                    result: {
                        orderId: response.orderId,
                        status: response.status,
                        executedQty: response.executedQty,
                        avgPrice: response.avgPrice
                    }
                };

                const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
                try {
                    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
                } catch (e) { }

                console.log(JSON.stringify({ success: true, ...logEntry.result }));
            } else {
                console.error(`❌ Binance Error ${response.code}: ${response.msg}`);
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
