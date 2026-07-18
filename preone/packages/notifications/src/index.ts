/**
 * @preone/notifications - PreOne Enterprise notification components
 *
 * Provides toast notifications, notification center, WebSocket support,
 * push notification service, and unread badge with full ARIA accessibility,
 * design token theming, and dark mode.
 */

// Toast system
export {
  ToastProvider,
  useToastContext,
  type ToastProviderProps,
  type ToastContextValue,
  type ToastData,
  type ToastVariant,
  type ToastPosition,
} from './toast-provider.js';

export { Toast, type ToastProps } from './toast.js';

export { useToast, type UseToastReturn } from './use-toast.js';

// Notification center
export {
  NotificationCenter,
  type NotificationCenterProps,
} from './notification-center.js';

export {
  NotificationItem,
  type NotificationItemProps,
  type NotificationItemData,
  type NotificationVariant,
} from './notification-item.js';

// WebSocket
export {
  SocketProvider,
  useSocketContext,
  type SocketProviderProps,
  type SocketContextValue,
  type SocketConnectionState,
  type SocketMessage,
  type SocketImplementation,
} from './socket-provider.js';

export { useSocket, type UseSocketReturn } from './use-socket.js';

// Push service
export {
  PushService,
  type PushPermissionStatus,
  type PushNotificationOptions,
  type PushSubscriptionData,
  type PushEventHandlers,
} from './push-service.js';

// Unread badge
export { UnreadBadge, type UnreadBadgeProps, type UnreadBadgeVariant, type UnreadBadgeSize } from './unread-badge.js';

// Utility
export { cn } from './cn.js';
