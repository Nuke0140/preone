import * as React from 'react';

/**
 * Socket connection state.
 */
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Socket message event.
 */
export interface SocketMessage {
  /** Event type */
  type: string;
  /** Message payload */
  payload: any;
  /** Timestamp */
  timestamp: number;
}

/**
 * Socket implementation interface — abstract, accepts custom implementations.
 */
export interface SocketImplementation {
  /** Connect to the socket server */
  connect: () => void;
  /** Disconnect from the socket server */
  disconnect: () => void;
  /** Send a message */
  send: (type: string, payload: any) => void;
  /** Subscribe to messages */
  onMessage: (callback: (message: SocketMessage) => void) => () => void;
  /** Subscribe to connection state changes */
  onStateChange: (callback: (state: SocketConnectionState) => void) => () => void;
  /** Get current connection state */
  getState: () => SocketConnectionState;
}

/**
 * Socket context value.
 */
export interface SocketContextValue {
  /** Current connection state */
  connectionState: SocketConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Last received message */
  lastMessage: SocketMessage | null;
  /** All received messages */
  messages: SocketMessage[];
  /** Send a message */
  send: (type: string, payload: any) => void;
  /** Connect manually */
  connect: () => void;
  /** Disconnect manually */
  disconnect: () => void;
  /** Subscribe to messages */
  subscribe: (callback: (message: SocketMessage) => void) => () => void;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

/**
 * Props for the SocketProvider component.
 */
export interface SocketProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Socket implementation instance */
  socket: SocketImplementation;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Whether to auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Maximum number of messages to keep in state */
  maxMessages?: number;
  /** Callback on connection state change */
  onConnectionChange?: (state: SocketConnectionState) => void;
  /** Callback on message received */
  onMessage?: (message: SocketMessage) => void;
  /** Children */
  children: React.ReactNode;
}

/**
 * PreOne SocketProvider — WebSocket provider context.
 * Abstract, accepts a custom socket implementation. Manages connection
 * state, message queue, auto-reconnect, and event subscriptions.
 *
 * @example
 * ```tsx
 * const socket = new MyWebSocketImpl('wss://api.example.com/ws');
 *
 * <SocketProvider socket={socket} autoConnect autoReconnect>
 *   <App />
 * </SocketProvider>
 * ```
 */
export const SocketProvider = React.forwardRef<HTMLDivElement, SocketProviderProps>(
  (
    {
      socket,
      autoConnect = true,
      autoReconnect = true,
      reconnectDelay = 3000,
      maxReconnectAttempts = 5,
      maxMessages = 100,
      onConnectionChange,
      onMessage,
      children,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const [connectionState, setConnectionState] = React.useState<SocketConnectionState>(
      socket.getState(),
    );
    const [lastMessage, setLastMessage] = React.useState<SocketMessage | null>(null);
    const [messages, setMessages] = React.useState<SocketMessage[]>([]);
    const subscribersRef = React.useRef<Set<(message: SocketMessage) => void>>(new Set());
    const reconnectAttemptsRef = React.useRef(0);
    const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMessage = React.useCallback(
      (message: SocketMessage) => {
        setLastMessage(message);
        setMessages((prev) => {
          const updated = [...prev, message];
          return updated.slice(-maxMessages);
        });
        onMessage?.(message);
        subscribersRef.current.forEach((cb) => cb(message));
      },
      [maxMessages, onMessage],
    );

    const handleStateChange = React.useCallback(
      (state: SocketConnectionState) => {
        setConnectionState(state);
        onConnectionChange?.(state);

        if (state === 'disconnected' && autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(() => {
            socket.connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        }

        if (state === 'connected') {
          reconnectAttemptsRef.current = 0;
        }
      },
      [autoReconnect, maxReconnectAttempts, reconnectDelay, socket, onConnectionChange],
    );

    React.useEffect(() => {
      const unsubscribeMessage = socket.onMessage(handleMessage);
      const unsubscribeState = socket.onStateChange(handleStateChange);

      if (autoConnect) {
        socket.connect();
      }

      return () => {
        unsubscribeMessage();
        unsubscribeState();
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        socket.disconnect();
      };
    }, [socket, autoConnect, handleMessage, handleStateChange]);

    const subscribe = React.useCallback((callback: (message: SocketMessage) => void) => {
      subscribersRef.current.add(callback);
      return () => {
        subscribersRef.current.delete(callback);
      };
    }, []);

    const contextValue = React.useMemo<SocketContextValue>(
      () => ({
        connectionState,
        isConnected: connectionState === 'connected',
        lastMessage,
        messages,
        send: socket.send.bind(socket),
        connect: socket.connect.bind(socket),
        disconnect: socket.disconnect.bind(socket),
        subscribe,
      }),
      [connectionState, lastMessage, messages, socket, subscribe],
    );

    return (
      <SocketContext.Provider value={contextValue}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </SocketContext.Provider>
    );
  },
);

SocketProvider.displayName = 'SocketProvider';

/**
 * Access the socket context. Throws if used outside SocketProvider.
 */
export function useSocketContext(): SocketContextValue {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
