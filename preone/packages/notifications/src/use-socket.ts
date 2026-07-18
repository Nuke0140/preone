import { useSocketContext, type SocketMessage, type SocketConnectionState } from './socket-provider.js';

/**
 * Return type of the useSocket hook.
 */
export interface UseSocketReturn {
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Current connection state */
  connectionState: SocketConnectionState;
  /** Last received message */
  lastMessage: SocketMessage | null;
  /** All received messages */
  messages: SocketMessage[];
  /** Send a message through the socket */
  send: (type: string, payload: any) => void;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Subscribe to incoming messages */
  subscribe: (callback: (message: SocketMessage) => void) => () => void;
}

/**
 * PreOne useSocket hook — primary interface for WebSocket communication.
 * Must be used within a SocketProvider.
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { isConnected, lastMessage, send } = useSocket();
 *
 *   React.useEffect(() => {
 *     if (lastMessage?.type === 'chat') {
 *       addMessage(lastMessage.payload);
 *     }
 *   }, [lastMessage]);
 *
 *   const handleSend = () => {
 *     send('chat', { text: 'Hello!' });
 *   };
 *
 *   return (
 *     <div>
 *       <span>{isConnected ? '🟢 Online' : '🔴 Offline'}</span>
 *       <button onClick={handleSend}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSocket(): UseSocketReturn {
  const {
    isConnected,
    connectionState,
    lastMessage,
    messages,
    send,
    connect,
    disconnect,
    subscribe,
  } = useSocketContext();

  return {
    isConnected,
    connectionState,
    lastMessage,
    messages,
    send,
    connect,
    disconnect,
    subscribe,
  };
}
