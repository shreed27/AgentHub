'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4000';

export type WebSocketEventType =
  | 'connected'
  | 'disconnected'
  | 'signal_received'
  | 'intent_generated'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'position_opened'
  | 'position_closed'
  | 'price_update'
  | 'holdings_snapshot'
  | 'risk_limit_triggered'
  | 'agent_status_changed'
  | 'whale_detected'
  | 'god_wallet_buy'
  | 'arbitrage_opportunity'
  | 'ai_analysis'
  | 'ai_reasoning'
  | 'health_update'
  | 'limit_order_triggered';

interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  timestamp: number;
  data: T;
}

interface UseWebSocketOptions {
  rooms?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { rooms = [], onConnect, onDisconnect, onError, autoConnect = true } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const listenersRef = useRef<Map<WebSocketEventType, Set<(data: unknown) => void>>>(new Map());

  // Initialize socket
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(GATEWAY_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      onConnect?.();

      // Subscribe to rooms
      if (rooms.length > 0) {
        socket.emit('subscribe', rooms);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      onError?.(error);
    });

    // Generic message handler
    const eventTypes: WebSocketEventType[] = [
      'connected',
      'signal_received',
      'intent_generated',
      'execution_started',
      'execution_completed',
      'execution_failed',
      'position_opened',
      'position_closed',
      'price_update',
      'holdings_snapshot',
      'risk_limit_triggered',
      'agent_status_changed',
      'whale_detected',
      'god_wallet_buy',
      'arbitrage_opportunity',
      'ai_analysis',
      'ai_reasoning',
      'health_update',
      'limit_order_triggered',
    ];

    eventTypes.forEach((eventType) => {
      socket.on(eventType, (message: WebSocketMessage) => {
        setLastMessage(message);

        // Notify all listeners for this event type
        const listeners = listenersRef.current.get(eventType);
        if (listeners) {
          listeners.forEach((listener) => listener(message.data));
        }
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, rooms.join(','), onConnect, onDisconnect, onError]);

  // Subscribe to specific event type
  const subscribe = useCallback(
    <T>(eventType: WebSocketEventType, callback: (data: T) => void) => {
      if (!listenersRef.current.has(eventType)) {
        listenersRef.current.set(eventType, new Set());
      }
      listenersRef.current.get(eventType)!.add(callback as (data: unknown) => void);

      // Return unsubscribe function
      return () => {
        listenersRef.current.get(eventType)?.delete(callback as (data: unknown) => void);
      };
    },
    []
  );

  // Join room
  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('subscribe', [room]);
  }, []);

  // Leave room
  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('unsubscribe', [room]);
  }, []);

  // Send message
  const send = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
    joinRoom,
    leaveRoom,
    send,
    socket: socketRef.current,
  };
}

// Hook for signal updates
export function useSignals() {
  const [signals, setSignals] = useState<
    Array<{
      id: string;
      source: string;
      type: string;
      data: unknown;
      confidence: number;
      timestamp: number;
    }>
  >([]);

  const { subscribe, isConnected } = useWebSocket({
    rooms: ['signals'],
  });

  useEffect(() => {
    const unsubscribe = subscribe<{ id: string; source: string; type: string; data: unknown; confidence: number }>(
      'signal_received',
      (signal) => {
        setSignals((prev) => [
          { ...signal, timestamp: Date.now() },
          ...prev.slice(0, 49), // Keep last 50 signals
        ]);
      }
    );

    return unsubscribe;
  }, [subscribe]);

  return { signals, isConnected };
}

// Hook for whale alerts
export function useWhaleAlerts() {
  const [whaleAlerts, setWhaleAlerts] = useState<
    Array<{
      id: string;
      walletAddress: string;
      walletLabel?: string;
      token: string;
      action: string;
      amount: number;
      confidence: number;
      timestamp: number;
    }>
  >([]);

  const { subscribe, isConnected } = useWebSocket({
    rooms: ['signals'],
  });

  useEffect(() => {
    const unsubscribe = subscribe<{
      id: string;
      walletAddress: string;
      walletLabel?: string;
      token: string;
      action: string;
      amount: number;
      confidence: number;
    }>('whale_detected', (alert) => {
      setWhaleAlerts((prev) => [{ ...alert, timestamp: Date.now() }, ...prev.slice(0, 19)]);
    });

    return unsubscribe;
  }, [subscribe]);

  return { whaleAlerts, isConnected };
}

// Hook for position updates
export function usePositionUpdates() {
  const [positions, setPositions] = useState<Map<string, unknown>>(new Map());

  const { subscribe, isConnected } = useWebSocket({
    rooms: ['positions'],
  });

  useEffect(() => {
    const unsubPosition = subscribe<{ id: string } & Record<string, unknown>>('position_opened', (position) => {
      setPositions((prev) => new Map(prev).set(position.id, position));
    });

    const unsubClose = subscribe<{ position: { id: string } }>('position_closed', (data) => {
      setPositions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.position.id);
        return newMap;
      });
    });

    const unsubPrice = subscribe<{ positionId: string; currentPrice: number; unrealizedPnL: number }>(
      'price_update',
      (data) => {
        setPositions((prev) => {
          const position = prev.get(data.positionId);
          if (position && typeof position === 'object') {
            return new Map(prev).set(data.positionId, {
              ...position,
              currentPrice: data.currentPrice,
              unrealizedPnL: data.unrealizedPnL,
            });
          }
          return prev;
        });
      }
    );

    return () => {
      unsubPosition();
      unsubClose();
      unsubPrice();
    };
  }, [subscribe]);

  return { positions: Array.from(positions.values()), isConnected };
}

// Hook for AI reasoning stream
export function useAIReasoning() {
  const [reasoning, setReasoning] = useState<
    Array<{
      id: string;
      token: string;
      recommendation: string;
      reasoning: string;
      confidence: number;
      timestamp: number;
    }>
  >([]);

  const { subscribe, isConnected } = useWebSocket({
    rooms: ['signals'],
  });

  useEffect(() => {
    const unsubscribe = subscribe<{
      id: string;
      token: string;
      recommendation: string;
      reasoning: string;
      confidence: number;
    }>('ai_reasoning', (data) => {
      setReasoning((prev) => [{ ...data, timestamp: Date.now() }, ...prev.slice(0, 9)]);
    });

    return unsubscribe;
  }, [subscribe]);

  return { reasoning, isConnected };
}

// Hook for limit order triggers
export function useLimitOrderTriggers() {
  const [triggeredOrders, setTriggeredOrders] = useState<
    Array<{
      id: string;
      walletAddress: string;
      inputMint: string;
      outputMint: string;
      inputAmount: number;
      targetPrice: number;
      currentPrice: number;
      direction: 'above' | 'below';
      triggeredAt: number;
    }>
  >([]);

  const { subscribe, isConnected } = useWebSocket({
    rooms: ['execution'],
  });

  useEffect(() => {
    const unsubscribe = subscribe<{
      id: string;
      walletAddress: string;
      inputMint: string;
      outputMint: string;
      inputAmount: number;
      targetPrice: number;
      currentPrice: number;
      direction: 'above' | 'below';
      triggeredAt: number;
    }>('limit_order_triggered', (order) => {
      setTriggeredOrders((prev) => [order, ...prev.slice(0, 9)]);
    });

    return unsubscribe;
  }, [subscribe]);

  const clearTriggeredOrder = useCallback((orderId: string) => {
    setTriggeredOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  return { triggeredOrders, clearTriggeredOrder, isConnected };
}

export default useWebSocket;
