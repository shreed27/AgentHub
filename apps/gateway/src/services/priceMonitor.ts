/**
 * Price Monitor Service
 *
 * Background service that monitors prices and triggers limit orders
 * when price conditions are met.
 */

import type { Server as SocketIOServer } from 'socket.io';
import type { Logger } from 'pino';
import * as limitOrderOps from '../db/operations/limitOrders.js';

const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const CHECK_INTERVAL = 10000; // 10 seconds
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface PriceData {
  [mint: string]: {
    price: number;
  };
}

class PriceMonitorService {
  private isRunning = false;
  private io: SocketIOServer | null = null;
  private logger: Logger | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  start(io: SocketIOServer, logger: Logger): void {
    if (this.isRunning) {
      logger.warn('[PriceMonitor] Already running');
      return;
    }

    this.io = io;
    this.logger = logger;
    this.isRunning = true;

    // Start the monitoring loop
    this.runLoop();

    logger.info('[PriceMonitor] Started - checking orders every 10 seconds');
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.logger?.info('[PriceMonitor] Stopped');
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkOrders();
      } catch (error) {
        this.logger?.error({ error }, '[PriceMonitor] Check failed');
      }

      // Wait for next check interval
      await new Promise(resolve => {
        this.intervalId = setTimeout(resolve, CHECK_INTERVAL);
      });
    }
  }

  private async checkOrders(): Promise<void> {
    // Get active orders
    const orders = limitOrderOps.getActiveLimitOrders();

    if (orders.length === 0) {
      return;
    }

    this.logger?.debug({ orderCount: orders.length }, '[PriceMonitor] Checking orders');

    // Get unique mints from orders
    const mints = new Set<string>();
    for (const order of orders) {
      mints.add(order.inputMint);
      mints.add(order.outputMint);
    }

    // Fetch prices for all mints
    const prices = await this.fetchPrices([...mints]);

    if (Object.keys(prices).length === 0) {
      this.logger?.warn('[PriceMonitor] No prices fetched');
      return;
    }

    // Check each order
    for (const order of orders) {
      const inputPrice = prices[order.inputMint]?.price || 0;
      const outputPrice = prices[order.outputMint]?.price || 0;

      // Skip if we can't get prices
      if (inputPrice === 0 || outputPrice === 0) {
        continue;
      }

      // Calculate current exchange rate (output per input)
      const currentPrice = outputPrice / inputPrice;

      // Check if trigger condition is met
      const shouldTrigger = order.direction === 'above'
        ? currentPrice >= order.targetPrice
        : currentPrice <= order.targetPrice;

      if (shouldTrigger) {
        this.logger?.info(
          {
            orderId: order.id,
            currentPrice,
            targetPrice: order.targetPrice,
            direction: order.direction
          },
          '[PriceMonitor] Order triggered'
        );

        // Mark as triggered in database
        limitOrderOps.updateLimitOrderStatus(order.id, 'triggered', {
          triggeredAt: Date.now(),
        });

        // Emit WebSocket event for frontend to handle execution
        this.io?.emit('limit_order_triggered', {
          type: 'limit_order_triggered',
          timestamp: Date.now(),
          data: {
            ...order,
            currentPrice,
            triggeredAt: Date.now(),
          },
        });
      }
    }

    // Expire old orders
    const expiredCount = limitOrderOps.expireOldOrders();
    if (expiredCount > 0) {
      this.logger?.info({ count: expiredCount }, '[PriceMonitor] Expired old orders');
    }
  }

  private async fetchPrices(mints: string[]): Promise<PriceData> {
    if (mints.length === 0) {
      return {};
    }

    try {
      const response = await fetch(`${JUPITER_PRICE_API}?ids=${mints.join(',')}`);

      if (!response.ok) {
        throw new Error(`Price API returned ${response.status}`);
      }

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      this.logger?.error({ error }, '[PriceMonitor] Failed to fetch prices');
      return {};
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const priceMonitor = new PriceMonitorService();
