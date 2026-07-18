/**
 * @preone/notifications - Browser Push Notification Service
 * Handles requesting permission and showing native browser notifications
 */

import { PushPermissionStatus, PushNotificationOptions } from '../types';

// ─── Service ─────────────────────────────────────────────────────────────────

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: PushPermissionStatus = 'default';

  /**
   * Check if browser supports notifications
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PushPermissionStatus {
    if (!this.isSupported()) return 'denied';
    return Notification.permission as PushPermissionStatus;
  }

  /**
   * Request notification permission from the user
   * Returns the resulting permission status
   */
  async requestPermission(): Promise<PushPermissionStatus> {
    if (!this.isSupported()) return 'denied';

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied';
      return 'denied';
    }

    const result = await Notification.requestPermission();
    this.permission = result as PushPermissionStatus;
    return this.permission;
  }

  /**
   * Register a service worker for push notifications
   * This provides the interface for registration — the actual SW file
   * must be provided by the consuming application
   */
  async registerServiceWorker(swPath: string, scope?: string): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[PushNotificationService] Service workers are not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath, scope ? { scope } : undefined);
      return this.registration;
    } catch (error) {
      console.warn('[PushNotificationService] Failed to register service worker:', error);
      return null;
    }
  }

  /**
   * Show a browser notification
   */
  async show(options: PushNotificationOptions): Promise<void> {
    if (!this.isSupported()) return;

    if (this.getPermissionStatus() !== 'granted') {
      const status = await this.requestPermission();
      if (status !== 'granted') return;
    }

    const { title, body, icon, badge, tag, data, onClick } = options;

    // Try showing via service worker (required for push on mobile)
    if (this.registration) {
      try {
        await this.registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          data: { ...data, _onClick: onClick?.toString() },
        });
        return;
      } catch {
        // Fall through to regular Notification API
      }
    }

    // Fallback to regular Notification API
    const notification = new Notification(title, {
      body,
      icon,
      tag,
      data,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  }

  /**
   * Convenience method: show an info notification
   */
  async info(title: string, body: string, options?: Partial<PushNotificationOptions>): Promise<void> {
    return this.show({ title, body, ...options });
  }

  /**
   * Convenience method: show a success notification
   */
  async success(title: string, body: string, options?: Partial<PushNotificationOptions>): Promise<void> {
    return this.show({ title, body, tag: 'success', ...options });
  }

  /**
   * Convenience method: show a warning notification
   */
  async warning(title: string, body: string, options?: Partial<PushNotificationOptions>): Promise<void> {
    return this.show({ title, body, tag: 'warning', ...options });
  }

  /**
   * Convenience method: show an error notification
   */
  async error(title: string, body: string, options?: Partial<PushNotificationOptions>): Promise<void> {
    return this.show({ title, body, tag: 'error', ...options });
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

export { PushNotificationService };
