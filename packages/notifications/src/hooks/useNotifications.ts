'use client';

import { useMemo } from 'react';
import { useNotificationContext } from '../providers/NotificationProvider';
import { Notification, NotificationType } from '../types';

/**
 * Hook to access notification state and actions.
 * Must be used within a <NotificationProvider>.
 */
export function useNotifications() {
  const ctx = useNotificationContext();

  const byType = useMemo(() => {
    const map: Record<NotificationType, Notification[]> = {
      info: [],
      success: [],
      warning: [],
      error: [],
    };
    for (const n of ctx.notifications) {
      map[n.type].push(n);
    }
    return map;
  }, [ctx.notifications]);

  const byCategory = useMemo(() => {
    const map: Record<string, Notification[]> = {};
    for (const n of ctx.notifications) {
      const cat = n.category || 'uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(n);
    }
    return map;
  }, [ctx.notifications]);

  const unread = useMemo(() => {
    return ctx.notifications.filter((n) => !n.read);
  }, [ctx.notifications]);

  return {
    /** All notifications */
    notifications: ctx.notifications,
    /** Number of unread notifications */
    unreadCount: ctx.unreadCount,
    /** Add a new notification */
    addNotification: ctx.addNotification,
    /** Remove a notification by ID */
    removeNotification: ctx.removeNotification,
    /** Mark a notification as read */
    markRead: ctx.markRead,
    /** Mark all notifications as read */
    markAllRead: ctx.markAllRead,
    /** Clear all notifications */
    clear: ctx.clear,
    /** Filter notifications by criteria */
    filterNotifications: ctx.filterNotifications,
    /** Get notifications grouped by type */
    byType,
    /** Get notifications grouped by category */
    byCategory,
    /** Get unread notifications */
    unread,
  };
}
