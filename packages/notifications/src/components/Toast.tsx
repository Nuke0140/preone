'use client';

import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { ToastNotification, NotificationAction } from '../types';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

// ─── Icons ───────────────────────────────────────────────────────────────────

const InfoIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SuccessIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const WarningIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const CloseIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const typeIcons: Record<ToastNotification['type'], React.FC<{ size?: number }>> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const typeAccentColors: Record<ToastNotification['type'], { bg: string; border: string; icon: string; progress: string }> = {
  info: { bg: colors.sky[50], border: colors.sky[200], icon: colors.sky[500], progress: colors.sky[400] },
  success: { bg: colors.green[50], border: colors.green[200], icon: colors.green[500], progress: colors.green[400] },
  warning: { bg: colors.amber[50], border: colors.amber[200], icon: colors.amber[500], progress: colors.amber[400] },
  error: { bg: colors.red[50], border: colors.red[200], icon: colors.red[500], progress: colors.red[400] },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ notification, onDismiss, className, style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(100);
    const typeConfig = typeAccentColors[notification.type];
    const Icon = typeIcons[notification.type];

    // Animate in
    useEffect(() => {
      requestAnimationFrame(() => setVisible(true));
    }, []);

    // Progress bar for auto-dismiss
    useEffect(() => {
      if (notification.duration <= 0) return;

      const intervalMs = 50;
      const totalSteps = notification.duration / intervalMs;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        setProgress(Math.max(0, 100 - (step / totalSteps) * 100));
        if (step >= totalSteps) {
          clearInterval(interval);
        }
      }, intervalMs);

      return () => clearInterval(interval);
    }, [notification.duration]);

    const handleDismiss = useCallback(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notification.id), 200);
    }, [notification.id, onDismiss]);

    const toastStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[3],
      padding: `${spacing[3]} ${spacing[4]}`,
      backgroundColor: '#fff',
      border: `1px solid ${typeConfig.border}`,
      borderLeft: `4px solid ${typeConfig.icon}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      maxWidth: '400px',
      minWidth: '300px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(24px) scale(0.95)',
      transition: `all ${duration.normal} ${easing.DEFAULT}`,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    };

    const iconStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      borderRadius: radius.md,
      backgroundColor: typeConfig.bg,
      color: typeConfig.icon,
      flexShrink: 0,
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

    const messageStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[0.5],
      lineHeight: 1.5,
    };

    const actionBarStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[2],
      marginTop: spacing[2],
    };

    const actionButtonStyle = (variant: NotificationAction['variant'] = 'primary'): React.CSSProperties => ({
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: variant === 'ghost' ? colors.neutral[500] : typeConfig.icon,
      backgroundColor: 'transparent',
      border: variant === 'secondary' ? `1px solid ${typeConfig.border}` : 'none',
      cursor: 'pointer',
      padding: `${spacing[0.5]} ${spacing[2]}`,
      borderRadius: radius.sm,
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
    });

    const dismissBtnStyle: React.CSSProperties = {
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
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    };

    const progressBarStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: '3px',
      backgroundColor: typeConfig.progress,
      borderRadius: `0 0 0 ${radius.lg}`,
      width: `${progress}%`,
      transition: 'width 50ms linear',
    };

    return (
      <div
        ref={ref}
        className={cn('preone-notification-toast', className)}
        style={toastStyle}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        {...props}
      >
        <span style={iconStyle} aria-hidden="true">
          <Icon size={16} />
        </span>
        <div style={contentStyle}>
          <p style={titleStyle}>{notification.title}</p>
          <p style={messageStyle}>{notification.message}</p>
          {notification.actions && notification.actions.length > 0 && (
            <div style={actionBarStyle}>
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  style={actionButtonStyle(action.variant)}
                  onClick={action.onClick}
                  type="button"
                  aria-label={action.label}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {notification.dismissible && (
          <button
            style={dismissBtnStyle}
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            type="button"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.neutral[100];
              e.currentTarget.style.color = colors.neutral[600];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.neutral[400];
            }}
          >
            <CloseIcon />
          </button>
        )}
        {notification.duration > 0 && <div style={progressBarStyle} />}
      </div>
    );
  }
);

Toast.displayName = 'Toast';
