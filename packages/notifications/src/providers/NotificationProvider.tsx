'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  Notification,
  NotificationFilter,
  NotificationProviderConfig,
  DEFAULT_NOTIFICATION_PROVIDER_CONFIG,
} from '../types';

// ─── State ───────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  config: NotificationProviderConfig;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const max = state.config.maxNotifications ?? DEFAULT_NOTIFICATION_PROVIDER_CONFIG.maxNotifications!;
      const updated = [action.payload, ...state.notifications].slice(0, max);
      return { ...state, notifications: updated };
    }
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    case 'CLEAR_ALL':
      return { ...state, notifications: [] };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  filterNotifications: (filter: NotificationFilter) => Notification[];
  getByType: (type: Notification['type']) => Notification[];
  getByCategory: (category: string) => Notification[];
  getUnread: () => Notification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(key: string): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((n: Record<string, unknown>) => ({
      ...n,
      timestamp: new Date(n.timestamp as string),
    } as Notification)) : [];
  } catch {
    return [];
  }
}

function saveToStorage(key: string, notifications: Notification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export interface NotificationProviderProps {
  children: React.ReactNode;
  config?: Partial<NotificationProviderConfig>;
  /** Initial notifications to seed the store */
  initialNotifications?: Notification[];
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  config: userConfig,
  initialNotifications,
}) => {
  const mergedConfig: NotificationProviderConfig = {
    ...DEFAULT_NOTIFICATION_PROVIDER_CONFIG,
    ...userConfig,
  };

  const getInitialState = (): NotificationState => {
    let notifications: Notification[] = initialNotifications ?? [];

    if (mergedConfig.persist && typeof window !== 'undefined') {
      const stored = loadFromStorage(mergedConfig.storageKey!);
      if (stored.length > 0) {
        notifications = stored;
      }
    }

    return { notifications, config: mergedConfig };
  };

  const [state, dispatch] = useReducer(notificationReducer, undefined, getInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on change
  useEffect(() => {
    if (mergedConfig.persist) {
      saveToStorage(mergedConfig.storageKey!, state.notifications);
    }
  }, [state.notifications, mergedConfig.persist, mergedConfig.storageKey]);

  const addNotification = useCallback(
    (input: Omit<Notification, 'id' | 'timestamp' | 'read'>): string => {
      const id = generateId();
      const notification: Notification = {
        ...input,
        id,
        timestamp: new Date(),
        read: false,
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_READ', payload: id });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const filterNotifications = useCallback(
    (filter: NotificationFilter): Notification[] => {
      let result = stateRef.current.notifications;

      if (filter.type !== undefined) {
        result = result.filter((n) => n.type === filter.type);
      }
      if (filter.read !== undefined) {
        result = result.filter((n) => n.read === filter.read);
      }
      if (filter.category !== undefined) {
        result = result.filter((n) => n.category === filter.category);
      }
      if (filter.dateRange) {
        result = result.filter((n) => {
          const ts = n.timestamp.getTime();
          return ts >= filter.dateRange!.start.getTime() && ts <= filter.dateRange!.end.getTime();
        });
      }

      return result;
    },
    []
  );

  const getByType = useCallback(
    (type: Notification['type']): Notification[] => {
      return stateRef.current.notifications.filter((n) => n.type === type);
    },
    []
  );

  const getByCategory = useCallback(
    (category: string): Notification[] => {
      return stateRef.current.notifications.filter((n) => n.category === category);
    },
    []
  );

  const getUnread = useCallback((): Notification[] => {
    return stateRef.current.notifications.filter((n) => !n.read);
  }, []);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const contextValue: NotificationContextValue = {
    notifications: state.notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markRead,
    markAllRead,
    clear,
    filterNotifications,
    getByType,
    getByCategory,
    getUnread,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

NotificationProvider.displayName = 'NotificationProvider';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotificationContext must be used within a <NotificationProvider>'
    );
  }
  return ctx;
}

export { NotificationContext };
