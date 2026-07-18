'use client';

import React, { forwardRef, useCallback } from 'react';
import { Notification, NotificationType, NotificationAction } from '../types';
import { cn, Avatar } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';
import { formatRelativeTime } from './NotificationItem';

// ─── Icons ───────────────────────────────────────────────────────────────────

const InfoIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SuccessIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const WarningIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const typeIcons: Record<NotificationType, React.FC<{ size?: number }>> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const typeColors: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  info: { bg: colors.sky[50], border: colors.sky[200], icon: colors.sky[500] },
  success: { bg: colors.green[50], border: colors.green[200], icon: colors.green[500] },
  warning: { bg: colors.amber[50], border: colors.amber[200], icon: colors.amber[500] },
  error: { bg: colors.red[50], border: colors.red[200], icon: colors.red[500] },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface NotificationCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  notification: Notification;
  onDismiss?: (id: string) => void;
  onAction?: (action: NotificationAction, notification: Notification) => void;
  onClick?: (notification: Notification) => void;
  /** Show detailed view with full message body */
  detailed?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const NotificationCard = forwardRef<HTMLDivElement, NotificationCardProps>(
  ({ notification, onDismiss, onAction, onClick, detailed = true, className, style, ...props }, ref) => {
    const TypeIcon = typeIcons[notification.type];
    const typeColor = typeColors[notification.type];

    const handleClick = useCallback(() => {
      onClick?.(notification);
    }, [notification, onClick]);

    const handleDismiss = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDismiss?.(notification.id);
      },
      [notification.id, onDismiss]
    );

    const cardStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderLeft: `4px solid ${typeColor.icon}`,
      borderRadius: radius.xl,
      boxShadow: shadows.DEFAULT,
      overflow: 'hidden',
      transition: `box-shadow ${duration.normal} ${easing.DEFAULT}, transform ${duration.normal} ${easing.DEFAULT}`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: `${spacing[4]} ${spacing[5]}`,
      borderBottom: notification.message && detailed ? `1px solid ${colors.neutral[100]}` : 'none',
    };

    const iconContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: radius.lg,
      backgroundColor: typeColor.bg,
      color: typeColor.icon,
      flexShrink: 0,
    };

    const headerContentStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleRowStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      margin: 0,
      lineHeight: 1.4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };

    const timeStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
      flexShrink: 0,
      whiteSpace: 'nowrap',
    };

    const categoryBadgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: typeColor.icon,
      backgroundColor: typeColor.bg,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      borderRadius: radius.sm,
      marginTop: spacing[1],
    };

    const bodyStyle: React.CSSProperties = {
      padding: `${spacing[0]} ${spacing[5]} ${spacing[4]}`,
    };

    const messageStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[600],
      margin: 0,
      lineHeight: 1.6,
    };

    const footerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[3]} ${spacing[5]}`,
      borderTop: `1px solid ${colors.neutral[100]}`,
      backgroundColor: colors.neutral[50],
    };

    const actionsContainerStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[2],
    };

    const actionBtnStyle = (variant: NotificationAction['variant'] = 'primary'): React.CSSProperties => ({
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      padding: `${spacing[1.5]} ${spacing[3]}`,
      borderRadius: radius.md,
      border: variant === 'secondary' ? `1px solid ${colors.neutral[200]}` : 'none',
      backgroundColor: variant === 'primary' ? typeColor.icon : variant === 'ghost' ? 'transparent' : '#fff',
      color: variant === 'primary' ? '#fff' : colors.neutral[600],
      cursor: 'pointer',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    });

    const dismissBtnStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      padding: 0,
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.neutral[400],
      borderRadius: radius.md,
      flexShrink: 0,
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    };

    const unreadIndicatorStyle: React.CSSProperties = {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: radius.full,
      backgroundColor: colors.sky[500],
      marginRight: spacing[2],
      flexShrink: 0,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-notification-card', className)}
        style={cardStyle}
        role="article"
        aria-label={`Notification: ${notification.title}`}
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.boxShadow = shadows.md;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = shadows.DEFAULT;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        {...props}
      >
        {/* Header */}
        <div style={headerStyle}>
          {notification.avatar ? (
            <Avatar
              src={notification.avatar.src}
              alt={notification.avatar.alt || ''}
              fallback={notification.avatar.fallback}
              size="md"
            />
          ) : (
            <div style={iconContainerStyle} aria-hidden="true">
              <TypeIcon size={20} />
            </div>
          )}

          <div style={headerContentStyle}>
            <div style={titleRowStyle}>
              <h4 style={titleStyle}>
                {!notification.read && <span style={unreadIndicatorStyle} aria-label="Unread" />}
                {notification.title}
              </h4>
              <span style={timeStyle}>{formatRelativeTime(notification.timestamp)}</span>
            </div>
            {notification.category && (
              <span style={categoryBadgeStyle}>{notification.category}</span>
            )}
          </div>

          {onDismiss && (
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
        </div>

        {/* Body */}
        {detailed && notification.message && (
          <div style={bodyStyle}>
            <p style={messageStyle}>{notification.message}</p>
          </div>
        )}

        {/* Footer with actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div style={footerStyle}>
            <div style={actionsContainerStyle}>
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  style={actionBtnStyle(action.variant)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAction) {
                      onAction(action, notification);
                    } else {
                      action.onClick();
                    }
                  }}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

NotificationCard.displayName = 'NotificationCard';
