import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';
import {
    createWalletClient,
    createPublicClient,
    http,
    formatUnits
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, arbitrum, base, polygon } from 'viem/chains';

const { values } = parseArgs({
    options: {
        symbol: { type: 'string' }, // Token Address to Sell
        private_key: { type: 'string' },
        chain_id: { type: 'string' },
        slippage: { type: 'string' }
    },
});

const { symbol, private_key, chain_id, slippage } = values;

const DEBUG_LOG = path.join(path.dirname(process.argv[1]), 'uniswap_debug.log');
fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Uniswap Close Position: ${JSON.stringify({ symbol, chain_id })}\n`);

if (!symbol || !private_key) {
    console.error("Missing required arguments: symbol, private_key");
    process.exit(1);
}

const CHAINS = {
    '1': {
        chain: mainnet,
        name: 'Ethereum',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    '42161': {
        chain: arbitrum,
        name: 'Arbitrum',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    },
    '8453': {
        chain: base,
        name: 'Base',
        router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        weth: '0x4200000000000000000000000000000000000006'
    },
    '137': {
        chain: polygon,
        name: 'Polygon',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
    }
};

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
    }
];

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

console.log(`Uniswap V3 Pipeline: Closing position (Selling) for ${symbol} on ${activeChainConfig.name}...`);

async function closePosition() {
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

        // 2. Check token balance
        console.log(`🔍 Checking ERC20 Balance for ${symbol}`);

        const balance = await publicClient.readContract({
            address: symbol,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        });

        let tokenDecimals = 18;
        try {
            tokenDecimals = await publicClient.readContract({
                address: symbol,
                abi: ERC20_ABI,
                functionName: 'decimals'
            });
        } catch { }

        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Balance: ${balance}, Decimals: ${tokenDecimals}\n`);

        if (balance > 0n) {
            console.log(`✅ Found Balance: ${formatUnits(balance, tokenDecimals)} tokens`);

            // 3. Check/Set approval
            console.log(`🔐 Checking Allowance for Router...`);
            const allowance = await publicClient.readContract({
                address: symbol,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [account.address, activeChainConfig.router]
            });

            if (allowance < balance) {
                console.log(`🔐 Approving token spend...`);
                const approveTx = await walletClient.writeContract({
                    address: symbol,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [activeChainConfig.router, balance * 2n]
                });

                console.log(`   Approval tx: ${approveTx}`);
                await publicClient.waitForTransactionReceipt({ hash: approveTx });
                console.log(`   ✅ Approved`);
            }

            // 4. Execute swap (Token -> WETH)
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

            const swapParams = {
                tokenIn: symbol,
                tokenOut: activeChainConfig.weth,
                fee: 3000,
                recipient: account.address,
                deadline,
                amountIn: balance,
                amountOutMinimum: 0n, // Using deadline protection
                sqrtPriceLimitX96: 0n
            };

            console.log(`🚀 Sending Swap Transaction (Token -> ETH)`);

            const txHash = await walletClient.writeContract({
                address: activeChainConfig.router,
                abi: SWAP_ROUTER_ABI,
                functionName: 'exactInputSingle',
                args: [swapParams],
                value: 0n
            });

            console.log(`   Transaction: ${txHash}`);

            // 5. Wait for confirmation
            console.log(`⏳ Waiting for confirmation...`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            if (receipt.status === 'success') {
                console.log('✅ Position Closed Successfully!');
                console.log(`   Transaction: ${txHash}`);
                console.log(`   Block: ${receipt.blockNumber}`);
                console.log(`   Gas Used: ${receipt.gasUsed}`);

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    exchange: 'uniswap_v3',
                    action: 'close_position',
                    chain: activeChainConfig.name,
                    symbol,
                    amountSold: formatUnits(balance, tokenDecimals),
                    txHash,
                    blockNumber: receipt.blockNumber.toString(),
                    gasUsed: receipt.gasUsed.toString()
                };

                fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Success: ${JSON.stringify(logEntry)}\n`);

                const logPath = path.join(path.dirname(process.argv[1]), '..', '..', '..', 'trades.json');
                try {
                    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
                } catch (e) { }

                console.log(JSON.stringify({ success: true, txHash, ...logEntry }));
            } else {
                throw new Error('Transaction reverted');
            }

        } else {
            console.log(`✅ No token balance for ${symbol}`);
            console.log(JSON.stringify({ success: true, message: 'No position to close' }));
        }

    } catch (error) {
        console.error("Pipeline Error:", error.message);
        fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} - Error: ${error.message}\n`);
        process.exit(1);
    }
}

closePosition();
