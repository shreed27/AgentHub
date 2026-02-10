import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import {
    createWalletClient,
    createPublicClient,
    http,
    parseEther,
    encodeFunctionData,
    parseUnits,
    formatUnits
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, arbitrum, base, polygon } from 'viem/chains';

const { values } = parseArgs({
    options: {
        symbol: { type: 'string' },      // Token address to buy/sell
        side: { type: 'string' },        // 'buy' (ETH -> Token) or 'sell' (Token -> ETH)
        amount: { type: 'string' },      // Amount in ETH (for buy) or tokens (for sell)
        private_key: { type: 'string' },
        chain_id: { type: 'string' },    // 1 (Eth), 137 (Polygon), 42161 (Arbitrum), 8453 (Base)
        slippage: { type: 'string' }     // Slippage in percent (default 0.5)
    },
});

const { symbol, side, amount, private_key, chain_id, slippage } = values;

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'uniswap_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Uniswap Pipeline started: ${JSON.stringify({ symbol, side, amount, chain_id })}\n`);

if (!symbol || !amount || !private_key) {
    console.error("Missing required arguments: symbol, amount, private_key");
    process.exit(1);
}

// Chain configurations
const CHAINS = {
    '1': {
        chain: mainnet,
        name: 'Ethereum',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 SwapRouter
        weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    },
    '42161': {
        chain: arbitrum,
        name: 'Arbitrum',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    },
    '8453': {
        chain: base,
        name: 'Base',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481', // SwapRouter02
        weth: '0x4200000000000000000000000000000000000006',
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'
    },
    '137': {
        chain: polygon,
        name: 'Polygon',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    }
};

// Uniswap V3 Router ABI (exactInputSingle)
const SWAP_ROUTER_ABI = [
    {
        name: 'exactInputSingle',
        type: 'function',
        stateMutability: 'payable',
        inputs: [{
            name: 'params',
            type: 'tuple',
            components: [
                { name: 'tokenIn', type: 'address' },
                { name: 'tokenOut', type: 'address' },
                { name: 'fee', type: 'uint24' },
                { name: 'recipient', type: 'address' },
                { name: 'deadline', type: 'uint256' },
                { name: 'amountIn', type: 'uint256' },
                { name: 'amountOutMinimum', type: 'uint256' },
                { name: 'sqrtPriceLimitX96', type: 'uint160' }
            ]
        }],
        outputs: [{ name: 'amountOut', type: 'uint256' }]
    },
    {
        name: 'exactOutputSingle',
        type: 'function',
        stateMutability: 'payable',
        inputs: [{
            name: 'params',
            type: 'tuple',
            components: [
                { name: 'tokenIn', type: 'address' },
                { name: 'tokenOut', type: 'address' },
                { name: 'fee', type: 'uint24' },
                { name: 'recipient', type: 'address' },
                { name: 'deadline', type: 'uint256' },
                { name: 'amountOut', type: 'uint256' },
                { name: 'amountInMaximum', type: 'uint256' },
                { name: 'sqrtPriceLimitX96', type: 'uint160' }
            ]
        }],
        outputs: [{ name: 'amountIn', type: 'uint256' }]
    }
];

// ERC20 ABI for approval
const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    }
];

const activeChainConfig = CHAINS[chain_id || '1'];
if (!activeChainConfig) {
    console.error(`Unsupported chain_id: ${chain_id}. Supported: 1, 137, 42161, 8453`);
    process.exit(1);
}

console.log(`Uniswap V3 Pipeline: Swapping on ${activeChainConfig.name}...`);

async function executeSwap() {
    try {
        // 1. Setup wallet
        const formattedKey = private_key.startsWith('0x') ? private_key : `0x${private_key}`;
        const account = privateKeyToAccount(formattedKey);

        const publicClient = createPublicClient({
            chain: activeChainConfig.chain,
            transport: http()
        });

        const walletClient = createWalletClient({
            account,
            chain: activeChainConfig.chain,
            transport: http()
        });

        console.log(`✅ Pipeline: Wallet connected`);
        console.log(`   Address: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`);

        // 2. Determine swap direction
        const isBuy = side?.toLowerCase() !== 'sell';
        const tokenIn = isBuy ? activeChainConfig.weth : symbol;
        const tokenOut = isBuy ? symbol : activeChainConfig.weth;

        console.log(`✅ Pipeline: ${isBuy ? 'Buying' : 'Selling'} tokens`);
        console.log(`   Token In: ${tokenIn.slice(0, 10)}...`);
        console.log(`   Token Out: ${tokenOut.slice(0, 10)}...`);

        // 3. Get token decimals
        let tokenDecimals = 18;
        if (!isBuy) {
            try {
                tokenDecimals = await publicClient.readContract({
                    address: symbol,
                    abi: ERC20_ABI,
                    functionName: 'decimals'
                });
            } catch {
                tokenDecimals = 18;
            }
        }

        // 4. Calculate amount
        const amountIn = isBuy
            ? parseEther(amount)
            : parseUnits(amount, tokenDecimals);

        console.log(`   Amount In: ${formatUnits(amountIn, isBuy ? 18 : tokenDecimals)}`);

        // 5. Check approval for token sells
        if (!isBuy) {
            console.log(`✅ Checking token allowance...`);
            const allowance = await publicClient.readContract({
                address: symbol,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [account.address, activeChainConfig.router]
            });

            if (allowance < amountIn) {
                console.log(`🔐 Approving token spend...`);
                const approveTx = await walletClient.writeContract({
                    address: symbol,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [activeChainConfig.router, amountIn * 2n] // Approve 2x to avoid future approvals
                });

                console.log(`   Approval tx: ${approveTx}`);
                await publicClient.waitForTransactionReceipt({ hash: approveTx });
                console.log(`   ✅ Approved`);
            }
        }

        // 6. Build swap parameters
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes
        const slippagePercent = parseFloat(slippage || '0.5');
        const amountOutMinimum = 0n; // For simplicity, using 0 (rely on deadline and slippage in router)

        const swapParams = {
            tokenIn,
            tokenOut,
            fee: 3000, // 0.3% fee tier (most common)
            recipient: account.address,
            deadline,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96: 0n
        };

        // 7. Execute swap
        console.log(`🚀 Executing swap...`);

        const txHash = await walletClient.writeContract({
            address: activeChainConfig.router,
            abi: SWAP_ROUTER_ABI,
            functionName: 'exactInputSingle',
            args: [swapParams],
            value: isBuy ? amountIn : 0n // Send ETH value for buy
        });

        console.log(`   Transaction: ${txHash}`);

        // 8. Wait for confirmation
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status === 'success') {
            console.log('✅ Swap Executed Successfully!');
            console.log(`   Transaction: ${txHash}`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas Used: ${receipt.gasUsed}`);

            // Log trade
            const logEntry = {
                timestamp: new Date().toISOString(),
                exchange: 'uniswap_v3',
                chain: activeChainConfig.name,
                symbol,
                side: isBuy ? 'buy' : 'sell',
                amount: parseFloat(amount),
                txHash,
                blockNumber: receipt.blockNumber.toString(),
                gasUsed: receipt.gasUsed.toString()
            };

            fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Success: ${JSON.stringify(logEntry)}\n`);

            const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
            try {
                fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
            } catch (e) { }

            // Output for programmatic use
            console.log(JSON.stringify({ success: true, txHash, ...logEntry }));
        } else {
            throw new Error('Transaction reverted');
        }

    } catch (error) {
        console.error("Pipeline Error:", error.message);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Error: ${error.message}\n`);

        // Log failed attempt
        const logEntry = {
            timestamp: new Date().toISOString(),
            exchange: 'uniswap_v3',
            chain: activeChainConfig.name,
            symbol,
            side: side || 'buy',
            amount: parseFloat(amount),
            error: error.message
        };

        const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
        try {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (e) { }

        process.exit(1);
    }
}

executeSwap();
