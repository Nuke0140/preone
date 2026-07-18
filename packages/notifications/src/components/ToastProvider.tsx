'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ToastConfig, ToastNotification, ToastPosition, DEFAULT_TOAST_CONFIG } from '../types';
import { Toast } from './Toast';
import { spacing } from '@preone/design-tokens';

// ─── Context ─────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: ToastNotification[];
  toast: {
    info: (title: string, message: string, options?: Partial<ToastNotification>) => string;
    success: (title: string, message: string, options?: Partial<ToastNotification>) => string;
    warning: (title: string, message: string, options?: Partial<ToastNotification>) => string;
    error: (title: string, message: string, options?: Partial<ToastNotification>) => string;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Position styles ─────────────────────────────────────────────────────────

const positionStyles: Record<ToastPosition, React.CSSProperties> = {
  'top-right': { top: spacing[4], right: spacing[4], alignItems: 'flex-end' },
  'top-left': { top: spacing[4], left: spacing[4], alignItems: 'flex-start' },
  'bottom-right': { bottom: spacing[4], right: spacing[4], alignItems: 'flex-end' },
  'bottom-left': { bottom: spacing[4], left: spacing[4], alignItems: 'flex-start' },
};

// ─── Provider ────────────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: React.ReactNode;
  config?: Partial<ToastConfig>;
}

function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, config: userConfig }) => {
  const config: ToastConfig = { ...DEFAULT_TOAST_CONFIG, ...userConfig };
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    // Clear auto-dismiss timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastNotification['type'], title: string, message: string, options?: Partial<ToastNotification>): string => {
      const id = generateToastId();
      const toast: ToastNotification = {
        id,
        type,
        title,
        message,
        duration: options?.duration ?? config.duration,
        dismissible: options?.dismissible ?? config.dismissible,
        createdAt: Date.now(),
        actions: options?.actions,
      };

      setToasts((prev) => {
        // Enforce maxVisible limit
        const next = [...prev, toast];
        const max = config.maxVisible;
        if (next.length > max) {
          // Remove oldest toasts that exceed the limit
          const removed = next.slice(0, next.length - max);
          removed.forEach((t) => {
            const timer = timersRef.current.get(t.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(t.id);
            }
          });
          return next.slice(next.length - max);
        }
        return next;
      });

      // Auto-dismiss timer
      if (toast.duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, toast.duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [config.duration, config.maxVisible, config.dismissible, dismiss]
  );

  const toast = {
    info: (title: string, message: string, options?: Partial<ToastNotification>) =>
      addToast('info', title, message, options),
    success: (title: string, message: string, options?: Partial<ToastNotification>) =>
      addToast('success', title, message, options),
    warning: (title: string, message: string, options?: Partial<ToastNotification>) =>
      addToast('warning', title, message, options),
    error: (title: string, message: string, options?: Partial<ToastNotification>) =>
      addToast('error', title, message, options),
  };

  const dismissAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    toasts,
    toast,
    dismiss,
    dismissAll,
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    flexDirection: config.position.startsWith('bottom') ? 'column-reverse' : 'column',
    gap: spacing[3],
    pointerEvents: 'none',
    ...positionStyles[config.position],
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div style={containerStyle} aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast notification={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a <ToastProvider>');
  }
  return ctx;
}

export { ToastContext };
