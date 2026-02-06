import { getActiveLimitOrders, getAgentById, getAgentKeypair, fillLimitOrder, failLimitOrder } from '../db';
import { getTokenPrice, getQuote, executeSwap } from './jupiter';

const CHECK_INTERVAL = 30_000; // 30 seconds

export function startLimitOrderChecker(): void {
  console.log('[LimitOrderChecker] Started — checking every 30s');

  setInterval(async () => {
    try {
      const orders = getActiveLimitOrders();
      if (orders.length === 0) return;

      console.log(`[LimitOrderChecker] Checking ${orders.length} active orders...`);

      for (const order of orders) {
        try {
          // Get current price of the output token (for buy) or input token (for sell)
          const checkMint = order.side === 'buy' ? order.output_mint : order.input_mint;
          const priceData = await getTokenPrice(checkMint);

          if (!priceData) continue;

          const currentPrice = priceData.price;
          let shouldExecute = false;

          if (order.side === 'buy' && currentPrice <= order.target_price) {
            shouldExecute = true;
          } else if (order.side === 'sell' && currentPrice >= order.target_price) {
            shouldExecute = true;
          }

          if (shouldExecute) {
            console.log(`[LimitOrderChecker] Executing order ${order.id} — price ${currentPrice} hit target ${order.target_price}`);

            const agent = getAgentById(order.agent_id);
            if (!agent) {
              failLimitOrder(order.id);
              continue;
            }

            const keypair = getAgentKeypair(agent);
            const quote = await getQuote({
              inputMint: order.input_mint,
              outputMint: order.output_mint,
              amount: order.amount,
              slippageBps: order.slippage_bps,
            });

            const result = await executeSwap({ quoteResponse: quote, keypair });
            fillLimitOrder(order.id, result.txSignature);
            console.log(`[LimitOrderChecker] Order ${order.id} filled — tx: ${result.txSignature}`);
          }
        } catch (err: any) {
          console.error(`[LimitOrderChecker] Error checking order ${order.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[LimitOrderChecker] Error:', err.message);
    }
  }, CHECK_INTERVAL);
}
