import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Logger } from 'pino';
import type { ServiceRegistry } from '../services/registry.js';
import type { WebSocketEventType } from '../types.js';

interface SubscriptionRoom {
  signals: boolean;
  positions: boolean;
  agents: boolean;
  market: boolean;
  execution: boolean;
}

export function setupWebSocket(
  io: SocketIOServer,
  serviceRegistry: ServiceRegistry,
  logger: Logger
): void {
  // Connection handler
  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');

    // Send connected event
    socket.emit('connected', {
      type: 'connected',
      timestamp: Date.now(),
      data: { socketId: socket.id },
    });

    // Handle subscription to rooms
    socket.on('subscribe', (rooms: string[]) => {
      for (const room of rooms) {
        socket.join(room);
        logger.debug({ socketId: socket.id, room }, 'Client subscribed to room');
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (rooms: string[]) => {
      for (const room of rooms) {
        socket.leave(room);
        logger.debug({ socketId: socket.id, room }, 'Client unsubscribed from room');
      }
    });

    // Handle ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected');
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ socketId: socket.id, error }, 'Socket error');
    });
  });

  // Start background tasks
  startHealthMonitoring(io, serviceRegistry, logger);
  startRealDataPolling(io, serviceRegistry, logger);
  startDemoSignalEmission(io, logger);

  logger.info('WebSocket server initialized with demo signal fallback');
}

// Poll real data from services and emit updates
function startRealDataPolling(
  io: SocketIOServer,
  serviceRegistry: ServiceRegistry,
  logger: Logger
): void {
  // Poll for real price updates from agent-dex (every 5 seconds)
  setInterval(async () => {
    try {
      const client = serviceRegistry.getClient('agent-dex');
      const response = await client.get('/api/v1/prices', {
        params: { mints: 'So11111111111111111111111111111111111111112' } // SOL
      });

      if (response.data.data) {
        io.to('market').emit('price_update', {
          type: 'price_update',
          timestamp: Date.now(),
          data: response.data.data,
          source: 'agent-dex',
        });
      }
    } catch (error) {
      // Silently fail - service may be offline
    }
  }, 5000);

  // Poll for real arbitrage opportunities from cloddsbot (every 30 seconds)
  setInterval(async () => {
    try {
      const client = serviceRegistry.getClient('cloddsbot');
      const response = await client.get('/api/arbitrage');

      if (response.data && Array.isArray(response.data)) {
        for (const arb of response.data) {
          io.to('signals').emit('arbitrage_opportunity', {
            type: 'arbitrage_opportunity',
            timestamp: Date.now(),
            data: arb,
            source: 'cloddsbot',
          });
        }
      }
    } catch (error) {
      // Silently fail - service may be offline
    }
  }, 30000);

  // Poll for god wallet activity from opus-x (every 30 seconds)
  setInterval(async () => {
    try {
      const client = serviceRegistry.getClient('opus-x');
      const response = await client.get('/api/wallets/activity');

      if (response.data && Array.isArray(response.data)) {
        for (const activity of response.data) {
          if (activity.type === 'buy' || activity.type === 'sell') {
            io.to('signals').emit('whale_detected', {
              type: 'whale_detected',
              timestamp: Date.now(),
              data: {
                source: 'god_wallet',
                walletAddress: activity.wallet,
                walletLabel: activity.label,
                token: activity.token,
                action: activity.type,
                amount: activity.amount,
                confidence: activity.trustScore || 75,
              },
              source: 'opus-x',
            });
          }
        }
      }
    } catch (error) {
      // Silently fail - service may be offline
    }
  }, 30000);
}

// Health monitoring
function startHealthMonitoring(
  io: SocketIOServer,
  serviceRegistry: ServiceRegistry,
  logger: Logger
): void {
  // Check service health every 30 seconds
  setInterval(async () => {
    const healthStatus = await serviceRegistry.checkAllHealth();

    io.emit('health_update', {
      type: 'health_update',
      timestamp: Date.now(),
      data: healthStatus,
    });
  }, 30000);
}

// Demo signal emission for hackathon demos when services are offline
function startDemoSignalEmission(
  io: SocketIOServer,
  logger: Logger
): void {
  const demoTokens = ['SOL', 'JUP', 'BONK', 'WIF', 'RAY', 'ORCA'];
  const demoWallets = [
    { address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', label: 'GCR Capital' },
    { address: '3KjEWYKxf58KD4LPaQHKYC4hDJwYVQxwvwk8zvhTfjVS', label: 'Toly Whale' },
    { address: 'DmMFjPqLwPq8bwrPqdvMwrYnKSfv2WLWwvrzN6mhvBJR', label: 'DeFi Degen' },
  ];
  const signalTypes = ['god_wallet', 'arbitrage', 'ai'] as const;
  let signalCounter = 0;

  // Emit demo signals every 12 seconds
  setInterval(() => {
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const token = demoTokens[Math.floor(Math.random() * demoTokens.length)];
    const wallet = demoWallets[Math.floor(Math.random() * demoWallets.length)];
    const confidence = Math.floor(Math.random() * 30) + 70;
    signalCounter++;

    if (signalType === 'god_wallet') {
      const action = Math.random() > 0.5 ? 'buy' : 'sell';
      const amount = Math.floor(Math.random() * 50000) + 5000;
      io.emit('signal_received', {
        type: 'signal_received',
        timestamp: Date.now(),
        data: {
          id: `demo-${signalCounter}`,
          source: 'god_wallet',
          type: 'whale_trade',
          confidence,
          data: {
            walletAddress: wallet.address,
            walletLabel: wallet.label,
            token,
            action,
            amount,
          },
        },
      });

      // Also emit whale_detected for the WhaleAlerts component
      io.emit('whale_detected', {
        type: 'whale_detected',
        timestamp: Date.now(),
        data: {
          id: `whale-${signalCounter}`,
          walletAddress: wallet.address,
          walletLabel: wallet.label,
          token,
          action,
          amount,
          confidence,
        },
      });
    } else if (signalType === 'arbitrage') {
      const profitPercent = Math.random() * 2 + 0.5;
      const platforms = ['Raydium', 'Orca', 'Jupiter', 'Meteora'];
      const buyPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      let sellPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      while (sellPlatform === buyPlatform) {
        sellPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      }

      io.emit('signal_received', {
        type: 'signal_received',
        timestamp: Date.now(),
        data: {
          id: `demo-${signalCounter}`,
          source: 'arbitrage',
          type: 'arbitrage_opportunity',
          confidence,
          data: {
            token,
            buyPlatform,
            sellPlatform,
            profitPercent,
            estimatedProfit: Math.floor(profitPercent * 1000),
          },
        },
      });
    } else {
      const recommendations = ['BUY', 'SELL', 'HOLD'];
      const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
      const reasoning = [
        `Strong momentum detected on ${token}`,
        `Volume spike indicates institutional interest`,
        `Technical indicators suggest ${recommendation.toLowerCase()} opportunity`,
        `Social sentiment turning bullish for ${token}`,
        `On-chain metrics show accumulation phase`,
      ];

      io.emit('signal_received', {
        type: 'signal_received',
        timestamp: Date.now(),
        data: {
          id: `demo-${signalCounter}`,
          source: 'ai',
          type: 'ai_analysis',
          confidence,
          data: {
            token,
            recommendation,
            reasoning: reasoning[Math.floor(Math.random() * reasoning.length)],
          },
        },
      });

      // Also emit ai_reasoning for the AIReasoning component
      io.emit('ai_reasoning', {
        type: 'ai_reasoning',
        timestamp: Date.now(),
        data: {
          id: `ai-${signalCounter}`,
          token,
          recommendation,
          reasoning: reasoning[Math.floor(Math.random() * reasoning.length)],
          confidence,
        },
      });
    }

    logger.debug({ signalType, signalCounter }, 'Emitted demo signal');
  }, 12000);

  // Emit price updates every 5 seconds
  setInterval(() => {
    io.emit('price_update', {
      type: 'price_update',
      timestamp: Date.now(),
      data: {
        token: 'SOL',
        price: 150 + (Math.random() * 10 - 5),
        change24h: (Math.random() * 10 - 5).toFixed(2),
      },
    });
  }, 5000);

  // Emit initial signal after 3 seconds so UI shows something quickly
  setTimeout(() => {
    io.emit('signal_received', {
      type: 'signal_received',
      timestamp: Date.now(),
      data: {
        id: 'demo-initial',
        source: 'god_wallet',
        type: 'whale_trade',
        confidence: 85,
        data: {
          walletAddress: demoWallets[0].address,
          walletLabel: demoWallets[0].label,
          token: 'SOL',
          action: 'buy',
          amount: 25000,
        },
      },
    });
    logger.info('Emitted initial demo signal');
  }, 3000);

  logger.info('Demo signal emission started (for hackathon demos)');
}

// Export helper to emit events from routes
export function emitEvent(
  io: SocketIOServer,
  eventType: WebSocketEventType,
  data: unknown
): void {
  io.emit(eventType, {
    type: eventType,
    timestamp: Date.now(),
    data,
  });
}
