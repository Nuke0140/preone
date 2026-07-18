/**
 * PreOne Push Service — abstraction layer for push notifications.
 *
 * Supports browser Notification API, service worker push subscriptions,
 * and provides a unified interface for requesting permissions and
 * sending/displaying push notifications.
 */

/**
 * Permission states for push notifications.
 */
export type PushPermissionStatus = 'default' | 'granted' | 'denied';

/**
 * Push notification options.
 */
export interface PushNotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body text */
  body?: string;
  /** Icon URL */
  icon?: string;
  /** Badge URL */
  badge?: string;
  /** Image URL */
  image?: string;
  /** Tag for grouping */
  tag?: string;
  /** Whether to require interaction */
  requireInteraction?: boolean;
  /** Whether to renotify */
  renotify?: boolean;
  /** Whether to make no sound */
  silent?: boolean;
  /** Actions for interactive notifications */
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  /** Timestamp */
  timestamp?: number;
  /** Vibration pattern */
  vibrate?: number[];
  /** Custom data */
  data?: Record<string, unknown>;
  /** Click handler URL */
  url?: string;
}

/**
 * Push subscription data.
 */
export interface PushSubscriptionData {
  /** Subscription endpoint */
  endpoint: string;
  /** Expiration time */
  expirationTime?: number | null;
  /** Encryption keys */
  keys?: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Push event handler.
 */
export interface PushEventHandlers {
  /** Called when a push notification is received */
  onPush?: (event: Event) => void;
  /** Called when a notification is clicked */
  onNotificationClick?: (event: Event) => void;
  /** Called when a notification is closed */
  onNotificationClose?: (event: Event) => void;
  /** Called when a push subscription changes */
  onSubscriptionChange?: (subscription: PushSubscriptionData | null) => void;
}

/**
 * PreOne PushService — push notification service abstraction.
 * Manages browser notification permissions, subscriptions, and display.
 *
 * @example
 * ```tsx
 * const pushService = new PushService({
 *   vapidPublicKey: 'YOUR_VAPID_KEY',
 *   serviceWorkerPath: '/sw.js',
 * });
 *
 * // Request permission
 * const granted = await pushService.requestPermission();
 *
 * // Subscribe
 * const subscription = await pushService.subscribe();
 *
 * // Show notification
 * pushService.show({
 *   title: 'New Order',
 *   body: 'You have a new order #1234',
 *   tag: 'order-1234',
 * });
 * ```
 */
export class PushService {
  private vapidPublicKey: string;
  private serviceWorkerPath: string;
  private handlers: PushEventHandlers;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(options: {
    vapidPublicKey: string;
    serviceWorkerPath?: string;
    handlers?: PushEventHandlers;
  }) {
    this.vapidPublicKey = options.vapidPublicKey;
    this.serviceWorkerPath = options.serviceWorkerPath || '/sw.js';
    this.handlers = options.handlers || {};
  }

  /**
   * Get the current permission status.
   */
  getPermissionStatus(): PushPermissionStatus {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission as PushPermissionStatus;
  }

  /**
   * Request notification permission from the user.
   * Returns true if permission was granted.
   */
  async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  /**
   * Register the service worker and return the registration.
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register(this.serviceWorkerPath);
      return this.swRegistration;
    } catch (error) {
      console.error('[PushService] Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications.
   * Requires service worker registration and VAPID key.
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (!this.swRegistration) {
      const registration = await this.registerServiceWorker();
      if (!registration) return null;
    }

    try {
      const subscription = await this.swRegistration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource,
      });

      const data = this.serializeSubscription(subscription);
      this.handlers.onSubscriptionChange?.(data);
      return data;
    } catch (error) {
      console.error('[PushService] Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications.
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.swRegistration) return false;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        const result = await subscription.unsubscribe();
        this.handlers.onSubscriptionChange?.(null);
        return result;
      }
      return true;
    } catch (error) {
      console.error('[PushService] Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Get the current push subscription.
   */
  async getSubscription(): Promise<PushSubscriptionData | null> {
    if (!this.swRegistration) return null;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription ? this.serializeSubscription(subscription) : null;
    } catch {
      return null;
    }
  }

  /**
   * Show a local notification (no server push required).
   */
  async show(options: PushNotificationOptions): Promise<void> {
    const { title, url, ...notificationOptions } = options;

    if (this.swRegistration) {
      await this.swRegistration.showNotification(title, {
        ...notificationOptions,
        data: {
          ...notificationOptions.data,
          url,
        },
      });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notification = new Notification(title, notificationOptions);
      if (url) {
        notification.onclick = () => {
          window.open(url, '_blank');
          notification.close();
        };
      }
      notification.onclick = (event: Event) => {
        this.handlers.onNotificationClick?.(event);
      };
      notification.onclose = (event: Event) => {
        this.handlers.onNotificationClose?.(event);
      };
    }
  }

  /**
   * Check if push notifications are supported.
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Convert VAPID key from base64 to Uint8Array.
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Serialize a PushSubscription to a plain object.
   */
  private serializeSubscription(subscription: PushSubscription): PushSubscriptionData {
    const data: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
    };

    try {
      const json = subscription.toJSON();
      if (json.keys) {
        data.keys = json.keys as { p256dh: string; auth: string };
      }
    } catch {
      // Keys not available
    }

    return data;
  }
}
