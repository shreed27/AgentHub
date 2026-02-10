import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { values } = parseArgs({
    options: {
        symbol: { type: 'string' },
        side: { type: 'string' },
        amount: { type: 'string' },
        leverage: { type: 'string' },
        api_key: { type: 'string' },
        api_secret: { type: 'string' }
    },
});

const { symbol, side, amount, leverage, api_key, api_secret } = values;

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'binance_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Binance Pipeline started: ${JSON.stringify(values)}\n`);

if (!symbol || !side || !amount || !api_key || !api_secret) {
    console.error("Missing required arguments: symbol, side, amount, api_key, api_secret");
    process.exit(1);
}

const BASE_URL = 'https://fapi.binance.com'; // Futures API

console.log(`Binance CEX Pipeline connecting...`);

// Helper to sign query string
function signature(query, secret) {
    return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

async function setLeverage(symbolName, leverageValue) {
    const timestamp = Date.now();
    const queryParams = `symbol=${symbolName}&leverage=${leverageValue}&timestamp=${timestamp}`;
    const sig = signature(queryParams, api_secret);
    const signedQuery = `${queryParams}&signature=${sig}`;

    const res = await fetch(`${BASE_URL}/fapi/v1/leverage`, {
        method: 'POST',
        headers: {
            'X-MBX-APIKEY': api_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: signedQuery
    });

    const data = await res.json();
    if (data.leverage) {
        console.log(`✅ Leverage set to ${data.leverage}x for ${symbolName}`);
    } else if (data.code) {
        console.warn(`⚠️ Leverage warning: ${data.msg || data.code}`);
    }
    return data;
}

async function executeTrade() {
    try {
        // Format symbol (remove slash if present)
        const symbolName = symbol.replace('/', '').toUpperCase();

        console.log(`✅ Pipeline: Preparing trade for ${symbolName} ${side.toUpperCase()}`);

        // 0. Set Leverage (Required before order for futures)
        if (leverage && parseInt(leverage) > 1) {
            console.log(`⚙️  Setting Leverage to ${leverage}x`);
            await setLeverage(symbolName, parseInt(leverage));
        }

        // 1. Prepare Order Payload
        const timestamp = Date.now();
        const queryParams = [
            `symbol=${symbolName}`,
            `side=${side.toUpperCase()}`,
            `type=MARKET`,
            `quantity=${amount}`,
            `timestamp=${timestamp}`
        ].join('&');

        const sig = signature(queryParams, api_secret);
        const signedQuery = `${queryParams}&signature=${sig}`;

        console.log(`🚀 Sending Signed Order to Binance Futures API`);
        console.log(`   Endpoint: ${BASE_URL}/fapi/v1/order`);
        console.log(`   Symbol: ${symbolName}, Side: ${side.toUpperCase()}, Amount: ${amount}`);

        // Execute REAL order
        const res = await fetch(`${BASE_URL}/fapi/v1/order`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': api_key,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: signedQuery
        });

        const response = await res.json();

        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Response: ${JSON.stringify(response)}\n`);

        if (response.orderId) {
            console.log('✅ Trade Executed Successfully!');
            console.log(`   Order ID: ${response.orderId}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Executed Qty: ${response.executedQty}`);
            console.log(`   Avg Price: ${response.avgPrice}`);
        } else if (response.code) {
            console.error(`❌ Binance Error ${response.code}: ${response.msg}`);

            // Log trade locally even on failure for debugging
            const logEntry = {
                timestamp: new Date().toISOString(),
                exchange: 'binance',
                symbol: symbolName,
                side,
                amount: parseFloat(amount),
                leverage: parseFloat(leverage || 1),
                error: response
            };

            const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
            try {
                fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
            } catch (e) { }

            process.exit(1);
        }

        // Log successful trade
        const logEntry = {
            timestamp: new Date().toISOString(),
            exchange: 'binance',
            symbol: symbolName,
            side,
            amount: parseFloat(amount),
            leverage: parseFloat(leverage || 1),
            result: {
                orderId: response.orderId,
                status: response.status,
                executedQty: response.executedQty,
                avgPrice: response.avgPrice,
                cumQuote: response.cumQuote
            }
        };

        const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
        try {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (e) { }

        // Output for programmatic use
        console.log(JSON.stringify({ success: true, ...logEntry.result }));

    } catch (error) {
        console.error("Pipeline Error:", error.message);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Error: ${error.message}\n`);
        process.exit(1);
    }
}

executeTrade();
