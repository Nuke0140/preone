'use client';

import React, { forwardRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const variantAccentColors: Record<ToastVariant, string> = {
  default: colors.neutral[500],
  success: colors.green[500],
  warning: colors.amber[500],
  danger: colors.red[500],
  info: colors.sky[500],
};

const variantIcons: Record<ToastVariant, string> = {
  default: '●',
  success: '✓',
  warning: '⚠',
  danger: '✕',
  info: 'ℹ',
};

export interface ToastItemProps extends React.HTMLAttributes<HTMLDivElement> {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export const ToastItem = forwardRef<HTMLDivElement, ToastItemProps>(
  ({ toast, onDismiss, className, style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      requestAnimationFrame(() => setVisible(true));

      if (toast.duration !== 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 200);
        }, toast.duration || 5000);
        return () => clearTimeout(timer);
      }
    }, [toast.id, toast.duration, onDismiss]);

    const toastStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[3],
      padding: `${spacing[3]} ${spacing[4]}`,
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      maxWidth: '380px',
      minWidth: '300px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: `all ${duration.normal} ${easing.DEFAULT}`,
      ...style,
    };

    const iconStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      borderRadius: radius.full,
      backgroundColor: variantAccentColors[toast.variant || 'default'],
      color: '#fff',
      fontSize: '11px',
      fontWeight: fontWeight.bold,
      flexShrink: 0,
      marginTop: '1px',
    };

    const contentStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      margin: 0,
      lineHeight: 1.4,
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[0.5],
      lineHeight: 1.5,
    };

    const actionStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: variantAccentColors[toast.variant || 'default'],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      marginTop: spacing[1],
    };

    return (
      <div ref={ref} className={cn('preone-toast', className)} style={toastStyle} role="alert" aria-live="polite" {...props}>
        <span style={iconStyle} aria-hidden="true">{variantIcons[toast.variant || 'default']}</span>
        <div style={contentStyle}>
          {toast.title && <p style={titleStyle}>{toast.title}</p>}
          {toast.description && <p style={descStyle}>{toast.description}</p>}
          {toast.action && (
            <button style={actionStyle} onClick={toast.action.onClick} type="button">
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[1],
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: colors.neutral[400],
            borderRadius: radius.sm,
            flexShrink: 0,
          }}
          onClick={() => {
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 200);
          }}
          aria-label="Dismiss notification"
          type="button"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }
);

ToastItem.displayName = 'ToastItem';

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

const positionStyles: Record<ToastPosition, React.CSSProperties> = {
  'top-right': { top: spacing[4], right: spacing[4] },
  'top-left': { top: spacing[4], left: spacing[4] },
  'bottom-right': { bottom: spacing[4], right: spacing[4] },
  'bottom-left': { bottom: spacing[4], left: spacing[4] },
  'top-center': { top: spacing[4], left: '50%', transform: 'translateX(-50%)' },
  'bottom-center': { bottom: spacing[4], left: '50%', transform: 'translateX(-50%)' },
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    flexDirection: position.startsWith('bottom') ? 'column-reverse' : 'column',
    gap: spacing[2],
    pointerEvents: 'none',
    ...positionStyles[position],
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div style={containerStyle}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';
