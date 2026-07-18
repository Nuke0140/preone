/**
 * @preone/notifications - PreOne Notification Framework
 * Toast, Center, Realtime notifications for the PreOne Design System
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  NotificationType,
  NotificationAction,
  Notification,
  ToastPosition,
  ToastConfig,
  ToastType,
  ToastNotification,
  NotificationFilter,
  SocketStatus,
  SocketConfig,
  PushPermissionStatus,
  PushNotificationOptions,
  NotificationProviderConfig,
} from './types';

export {
  DEFAULT_TOAST_CONFIG,
  DEFAULT_SOCKET_CONFIG,
  DEFAULT_NOTIFICATION_PROVIDER_CONFIG,
} from './types';

// ─── Components ──────────────────────────────────────────────────────────────
export { Toast, type ToastProps } from './components/Toast';
export { ToastProvider, type ToastProviderProps } from './components/ToastProvider';
export { NotificationItem, type NotificationItemProps, formatRelativeTime } from './components/NotificationItem';
export { UnreadBadge, type UnreadBadgeProps } from './components/UnreadBadge';
export { NotificationCard, type NotificationCardProps } from './components/NotificationCard';
export { NotificationCenter, type NotificationCenterProps } from './components/NotificationCenter';

// ─── Providers ───────────────────────────────────────────────────────────────
export { NotificationProvider, type NotificationProviderProps, useNotificationContext } from './providers/NotificationProvider';
export { SocketProvider, type SocketProviderProps, useSocketContext } from './providers/SocketProvider';
export { pushNotificationService, PushNotificationService } from './providers/PushNotificationService';

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useNotifications } from './hooks/useNotifications';
export { useToast } from './hooks/useToast';
export { useSocket } from './hooks/useSocket';
