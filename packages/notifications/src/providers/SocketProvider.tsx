'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { SocketConfig, SocketStatus, DEFAULT_SOCKET_CONFIG, Notification } from '../types';

// ─── Context ─────────────────────────────────────────────────────────────────

interface SocketContextValue {
  status: SocketStatus;
  connect: () => void;
  disconnect: () => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  off: (event: string, handler: (data: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export interface SocketProviderProps {
  children: React.ReactNode;
  config: Partial<SocketConfig>;
  /** Called when a notification arrives via socket */
  onNotification?: (notification: Notification) => void;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  config: userConfig,
  onNotification,
  autoConnect = true,
}) => {
  const mergedConfig: SocketConfig = { ...DEFAULT_SOCKET_CONFIG, ...userConfig };

  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mergedConfig.url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    intentionalDisconnectRef.current = false;
    setStatus('connecting');

    try {
      const ws = new WebSocket(mergedConfig.url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          const eventType = parsed.type || parsed.event || 'message';
          const payload = parsed.data ?? parsed;

          // Fire typed handlers
          const handlers = handlersRef.current.get(eventType);
          if (handlers) {
            handlers.forEach((handler) => handler(payload));
          }

          // Fire wildcard handlers
          const wildcardHandlers = handlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach((handler) => handler(parsed));
          }

          // Auto-route notification events
          if (
            eventType === 'notification' &&
            onNotificationRef.current
          ) {
            onNotificationRef.current(payload as Notification);
          }
        } catch {
          // Non-JSON message — fire wildcard handlers with raw data
          const wildcardHandlers = handlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach((handler) => handler(event.data));
          }
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnect unless intentional
        if (!intentionalDisconnectRef.current) {
          const maxAttempts = mergedConfig.maxReconnectAttempts;
          if (reconnectAttemptsRef.current < maxAttempts) {
            setStatus('reconnecting');
            const delay = mergedConfig.reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, Math.min(delay, 30000)); // Cap at 30s
          }
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, so reconnect logic lives there
      };
    } catch {
      setStatus('disconnected');
    }
  }, [mergedConfig.url, mergedConfig.maxReconnectAttempts, mergedConfig.reconnectInterval]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    clearReconnectTimer();
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  const on = useCallback((event: string, handler: (data: unknown) => void): (() => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  const off = useCallback((event: string, handler: (data: unknown) => void) => {
    handlersRef.current.get(event)?.delete(handler);
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: event, data }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && mergedConfig.url) {
      connect();
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, mergedConfig.url]);

  const contextValue: SocketContextValue = {
    status,
    connect,
    disconnect,
    on,
    off,
    emit,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.displayName = 'SocketProvider';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketContext must be used within a <SocketProvider>');
  }
  return ctx;
}

export { SocketContext };
