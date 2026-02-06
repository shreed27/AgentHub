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
  startPriceUpdates(io, serviceRegistry, logger);
  startSignalAggregation(io, serviceRegistry, logger);
  startHealthMonitoring(io, serviceRegistry, logger);

  logger.info('WebSocket server initialized');
}

// Simulated price updates (every 2 seconds)
function startPriceUpdates(
  io: SocketIOServer,
  serviceRegistry: ServiceRegistry,
  logger: Logger
): void {
  setInterval(() => {
    // Emit mock price updates
    const priceUpdate = {
      type: 'price_update',
      timestamp: Date.now(),
      data: {
        SOL: { price: 100 + Math.random() * 10, change24h: (Math.random() - 0.5) * 10 },
        BTC: { price: 45000 + Math.random() * 1000, change24h: (Math.random() - 0.5) * 5 },
        ETH: { price: 2500 + Math.random() * 100, change24h: (Math.random() - 0.5) * 8 },
      },
    };

    io.to('market').emit('price_update', priceUpdate);
  }, 2000);
}

// Signal aggregation from various sources
function startSignalAggregation(
  io: SocketIOServer,
  serviceRegistry: ServiceRegistry,
  logger: Logger
): void {
  // Simulated whale signal every 30 seconds
  setInterval(() => {
    const whaleActions = ['buy', 'sell'];
    const tokens = ['SOL', 'BONK', 'JUP', 'WIF', 'ORCA'];

    const whaleSignal = {
      type: 'whale_detected',
      timestamp: Date.now(),
      data: {
        id: `whale-${Date.now()}`,
        source: 'whale',
        walletAddress: `Whale${Math.floor(Math.random() * 24)}...abc`,
        walletLabel: `God Wallet ${Math.floor(Math.random() * 24) + 1}`,
        token: tokens[Math.floor(Math.random() * tokens.length)],
        action: whaleActions[Math.floor(Math.random() * whaleActions.length)],
        amount: Math.floor(Math.random() * 100000) + 10000,
        confidence: 70 + Math.floor(Math.random() * 30),
      },
    };

    io.to('signals').emit('whale_detected', whaleSignal);
    io.emit('signal_received', { ...whaleSignal, type: 'signal_received' });

    logger.debug({ signal: whaleSignal.data }, 'Emitted whale signal');
  }, 30000);

  // Simulated AI reasoning every 45 seconds
  setInterval(() => {
    const recommendations = ['strong_buy', 'buy', 'watch', 'avoid'];
    const tokens = ['SOL', 'BONK', 'JUP', 'WIF'];

    const aiSignal = {
      type: 'ai_reasoning',
      timestamp: Date.now(),
      data: {
        id: `ai-${Date.now()}`,
        source: 'ai',
        token: tokens[Math.floor(Math.random() * tokens.length)],
        recommendation: recommendations[Math.floor(Math.random() * recommendations.length)],
        reasoning: 'Strong momentum detected with increasing volume. Whale accumulation pattern observed.',
        confidence: 60 + Math.floor(Math.random() * 40),
        metrics: {
          liquidity: Math.random() * 100,
          momentum: Math.random() * 100,
          trustScore: Math.random() * 100,
        },
      },
    };

    io.to('signals').emit('ai_reasoning', aiSignal);
    io.emit('ai_analysis', { ...aiSignal, type: 'ai_analysis' });

    logger.debug({ signal: aiSignal.data }, 'Emitted AI reasoning');
  }, 45000);

  // Simulated arbitrage opportunity every 60 seconds
  setInterval(() => {
    const arbSignal = {
      type: 'arbitrage_opportunity',
      timestamp: Date.now(),
      data: {
        id: `arb-${Date.now()}`,
        source: 'arbitrage',
        token: 'BTC-100k-2025',
        buyPlatform: 'Polymarket',
        buyPrice: 0.62 + Math.random() * 0.05,
        sellPlatform: 'Kalshi',
        sellPrice: 0.68 + Math.random() * 0.05,
        profitPercent: 5 + Math.random() * 10,
        liquidity: 10000 + Math.random() * 50000,
        confidence: 75 + Math.floor(Math.random() * 25),
        expiresIn: 60000,
      },
    };

    io.to('signals').emit('arbitrage_opportunity', arbSignal);

    logger.debug({ signal: arbSignal.data }, 'Emitted arbitrage opportunity');
  }, 60000);
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
