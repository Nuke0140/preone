'use client';

import { useSocketContext } from '../providers/SocketProvider';

/**
 * Hook to access socket connection state and methods.
 * Must be used within a <SocketProvider>.
 */
export function useSocket() {
  const ctx = useSocketContext();

  return {
    /** Current connection status */
    status: ctx.status,
    /** Initiate a WebSocket connection */
    connect: ctx.connect,
    /** Disconnect the WebSocket */
    disconnect: ctx.disconnect,
    /** Subscribe to a socket event, returns unsubscribe function */
    on: ctx.on,
    /** Unsubscribe from a socket event */
    off: ctx.off,
    /** Emit an event to the server */
    emit: ctx.emit,
  };
}
