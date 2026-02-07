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

  // Start background tasks - only real data monitoring
  startHealthMonitoring(io, serviceRegistry, logger);
  startRealDataPolling(io, serviceRegistry, logger);

  logger.info('WebSocket server initialized (no mock emissions)');
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
