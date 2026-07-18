/**
 * @preone/notifications - Type definitions
 * Core types for the notification framework
 */

// ─── Notification ────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface Notification {
  /** Unique identifier */
  id: string;
  /** Notification severity level */
  type: NotificationType;
  /** Brief title */
  title: string;
  /** Detailed message body */
  message: string;
  /** When the notification was created */
  timestamp: Date;
  /** Whether the user has read this notification */
  read: boolean;
  /** Category for grouping/filtering */
  category: string;
  /** Optional URL to navigate to on click */
  link?: string;
  /** Optional action buttons */
  actions?: NotificationAction[];
  /** Optional avatar (src URL or initials) */
  avatar?: {
    src?: string;
    alt?: string;
    fallback?: string;
  };
}

// ─── Toast ───────────────────────────────────────────────────────────────────

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ToastConfig {
  /** Where toasts appear on screen */
  position: ToastPosition;
  /** Duration in ms before auto-dismiss (0 = no auto-dismiss) */
  duration: number;
  /** Maximum toasts visible at once */
  maxVisible: number;
  /** Whether user can manually dismiss */
  dismissible: boolean;
}

export type ToastType = NotificationType;

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
  dismissible: boolean;
  createdAt: number;
  actions?: NotificationAction[];
}

// ─── Notification Filter ─────────────────────────────────────────────────────

export interface NotificationFilter {
  type?: NotificationType;
  read?: boolean;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ─── Socket ──────────────────────────────────────────────────────────────────

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SocketConfig {
  /** WebSocket server URL */
  url: string;
  /** Base interval in ms between reconnect attempts */
  reconnectInterval: number;
  /** Maximum number of reconnect attempts before giving up */
  maxReconnectAttempts: number;
}

// ─── Push Notification ───────────────────────────────────────────────────────

export type PushPermissionStatus = 'default' | 'granted' | 'denied';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

// ─── Provider Config ─────────────────────────────────────────────────────────

export interface NotificationProviderConfig {
  /** Persist notifications to localStorage */
  persist?: boolean;
  /** localStorage key name */
  storageKey?: string;
  /** Maximum notifications to keep in memory */
  maxNotifications?: number;
}

// ─── Default configs ─────────────────────────────────────────────────────────

export const DEFAULT_TOAST_CONFIG: ToastConfig = {
  position: 'top-right',
  duration: 5000,
  maxVisible: 5,
  dismissible: true,
};

export const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  url: '',
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
};

export const DEFAULT_NOTIFICATION_PROVIDER_CONFIG: NotificationProviderConfig = {
  persist: false,
  storageKey: 'preone-notifications',
  maxNotifications: 100,
};
