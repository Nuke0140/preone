'use client';

import React, { forwardRef, useCallback } from 'react';
import { Notification, NotificationType, NotificationAction } from '../types';
import { cn, Avatar } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

// ─── Icons ───────────────────────────────────────────────────────────────────

const InfoIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SuccessIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const WarningIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const DeleteIcon: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const typeIcons: Record<NotificationType, React.FC> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

const typeColors: Record<NotificationType, { bg: string; icon: string }> = {
  info: { bg: colors.sky[50], icon: colors.sky[500] },
  success: { bg: colors.green[50], icon: colors.green[500] },
  warning: { bg: colors.amber[50], icon: colors.amber[500] },
  error: { bg: colors.red[50], icon: colors.red[500] },
};

// ─── Relative time ───────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface NotificationItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(
  ({ notification, onMarkRead, onDelete, onClick, className, style, ...props }, ref) => {
    const TypeIcon = typeIcons[notification.type];
    const typeColor = typeColors[notification.type];

    const handleClick = useCallback(() => {
      if (!notification.read && onMarkRead) {
        onMarkRead(notification.id);
      }
      onClick?.(notification);
    }, [notification, onMarkRead, onClick]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(notification.id);
      },
      [notification.id, onDelete]
    );

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[3],
      padding: `${spacing[3]} ${spacing[4]}`,
      backgroundColor: notification.read ? 'transparent' : colors.sky[50],
      borderBottom: `1px solid ${colors.neutral[100]}`,
      cursor: onClick || notification.link ? 'pointer' : 'default',
      position: 'relative',
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      ...style,
    };

    const unreadDotStyle: React.CSSProperties = {
      position: 'absolute',
      top: spacing[4],
      left: spacing[1],
      width: '8px',
      height: '8px',
      borderRadius: radius.full,
      backgroundColor: colors.sky[500],
      flexShrink: 0,
    };

    const iconContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: radius.md,
      backgroundColor: typeColor.bg,
      color: typeColor.icon,
      flexShrink: 0,
    };

    const contentStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: notification.read ? fontWeight.medium : fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      margin: 0,
      lineHeight: 1.4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };

    const messageStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[0.5],
      lineHeight: 1.5,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
    };

    const metaStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      marginTop: spacing[1.5],
    };

    const timeStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
    };

    const categoryStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
      backgroundColor: colors.neutral[100],
      padding: `${spacing[0.5]} ${spacing[1.5]}`,
      borderRadius: radius.sm,
    };

    const actionsStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[2],
      marginTop: spacing[2],
    };

    const actionBtnStyle = (variant: NotificationAction['variant'] = 'primary'): React.CSSProperties => ({
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      borderRadius: radius.sm,
      border: variant === 'secondary' ? `1px solid ${colors.neutral[200]}` : 'none',
      backgroundColor: variant === 'primary' ? typeColor.icon : 'transparent',
      color: variant === 'primary' ? '#fff' : colors.neutral[600],
      cursor: 'pointer',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    });

    const deleteBtnStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[1],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.neutral[300],
      borderRadius: radius.sm,
      flexShrink: 0,
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      alignSelf: 'flex-start',
    };

    return (
      <div
        ref={ref}
        className={cn('preone-notification-item', className)}
        style={containerStyle}
        role="listitem"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`${notification.type} notification: ${notification.title}`}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = notification.read ? colors.neutral[50] : colors.sky[100];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : colors.sky[50];
        }}
        {...props}
      >
        {!notification.read && <div style={unreadDotStyle} aria-label="Unread" />}

        {notification.avatar ? (
          <Avatar
            src={notification.avatar.src}
            alt={notification.avatar.alt || ''}
            fallback={notification.avatar.fallback}
            size="sm"
          />
        ) : (
          <div style={iconContainerStyle} aria-hidden="true">
            <TypeIcon />
          </div>
        )}

        <div style={contentStyle}>
          <p style={titleStyle}>{notification.title}</p>
          <p style={messageStyle}>{notification.message}</p>

          <div style={metaStyle}>
            <span style={timeStyle}>{formatRelativeTime(notification.timestamp)}</span>
            {notification.category && (
              <span style={categoryStyle}>{notification.category}</span>
            )}
          </div>

          {notification.actions && notification.actions.length > 0 && (
            <div style={actionsStyle}>
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  style={actionBtnStyle(action.variant)}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          style={deleteBtnStyle}
          onClick={handleDelete}
          aria-label="Delete notification"
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.red[500];
            e.currentTarget.style.backgroundColor = colors.red[50];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.neutral[300];
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <DeleteIcon />
        </button>
      </div>
    );
  }
);

NotificationItem.displayName = 'NotificationItem';

// Export the relative time formatter for reuse
export { formatRelativeTime };
