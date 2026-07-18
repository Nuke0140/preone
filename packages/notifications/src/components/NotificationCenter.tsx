'use client';

import React, { forwardRef, useState, useMemo } from 'react';
import { Notification, NotificationType } from '../types';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';
import { NotificationItem } from './NotificationItem';

// ─── Icons ───────────────────────────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FilterIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// Suppress unused warning — FilterIcon is available for consumers
void FilterIcon;

const CheckAllIcon: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const BellOffIcon: React.FC = () => (
  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
    <path d="M18 8a6 6 0 0 0-9.33-5" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ─── Filter types ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | NotificationType;

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface NotificationCenterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the panel is open */
  open: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** List of notifications */
  notifications: Notification[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Mark a notification as read */
  onMarkRead: (id: string) => void;
  /** Mark all notifications as read */
  onMarkAllRead: () => void;
  /** Delete a notification */
  onDelete: (id: string) => void;
  /** Click on a notification (e.g. to navigate) */
  onClickNotification?: (notification: Notification) => void;
  /** Panel placement */
  placement?: 'left' | 'right';
  /** Panel width */
  width?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const NotificationCenter = forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      open,
      onClose,
      notifications,
      unreadCount,
      onMarkRead,
      onMarkAllRead,
      onDelete,
      onClickNotification,
      placement = 'right',
      width = '400px',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [visible, setVisible] = useState(false);

    // Animate in/out
    React.useEffect(() => {
      if (open) {
        requestAnimationFrame(() => setVisible(true));
        document.body.style.overflow = 'hidden';
      } else {
        setVisible(false);
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    // Escape key
    React.useEffect(() => {
      if (!open) return;
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    // Filtered notifications
    const filteredNotifications = useMemo(() => {
      switch (activeFilter) {
        case 'all':
          return notifications;
        case 'unread':
          return notifications.filter((n) => !n.read);
        default:
          // Filter by type
          return notifications.filter((n) => n.type === activeFilter);
      }
    }, [notifications, activeFilter]);

    if (!open) return null;

    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      zIndex: 9990,
      opacity: visible ? 1 : 0,
      transition: `opacity ${duration.normal} ${easing.DEFAULT}`,
    };

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      bottom: 0,
      width,
      backgroundColor: '#fff',
      boxShadow: shadows['2xl'],
      zIndex: 9991,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...(placement === 'right'
        ? { right: 0, borderLeft: `1px solid ${colors.neutral[200]}`, transform: visible ? 'translateX(0)' : 'translateX(100%)' }
        : { left: 0, borderRight: `1px solid ${colors.neutral[200]}`, transform: visible ? 'translateX(0)' : 'translateX(-100%)' }),
      transition: `transform ${duration.slow} ${easing.DEFAULT}`,
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[5]} ${spacing[6]}`,
      borderBottom: `1px solid ${colors.neutral[100]}`,
      flexShrink: 0,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[900],
      margin: 0,
      lineHeight: 1.4,
    };

    const headerActionsStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[1],
    };

    const iconBtnStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: radius.md,
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.neutral[400],
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    };

    const filterBarStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[1],
      padding: `${spacing[3]} ${spacing[6]}`,
      borderBottom: `1px solid ${colors.neutral[100]}`,
      overflowX: 'auto',
      flexShrink: 0,
      scrollbarWidth: 'none',
    };

    const filterTabStyle = (isActive: boolean): React.CSSProperties => ({
      padding: `${spacing[1.5]} ${spacing[3]}`,
      borderRadius: radius.md,
      fontSize: fontSize.xs,
      fontWeight: isActive ? fontWeight.semibold : fontWeight.medium,
      fontFamily: fontFamily.sans,
      color: isActive ? colors.neutral[900] : colors.neutral[500],
      backgroundColor: isActive ? colors.neutral[100] : 'transparent',
      border: 'none',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    });

    const listStyle: React.CSSProperties = {
      flex: 1,
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: `${colors.neutral[300]} transparent`,
    };

    const emptyStateStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[12],
      textAlign: 'center',
    };

    const emptyTitleStyle: React.CSSProperties = {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[4],
    };

    const emptyDescStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
      margin: 0,
      marginTop: spacing[1],
    };

    const countBadgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '20px',
      height: '20px',
      padding: `0 ${spacing[1.5]}`,
      borderRadius: radius.full,
      backgroundColor: unreadCount > 0 ? colors.red[500] : colors.neutral[200],
      color: unreadCount > 0 ? '#fff' : colors.neutral[500],
      fontSize: '11px',
      fontWeight: fontWeight.bold,
      fontFamily: fontFamily.sans,
      lineHeight: 1,
      marginLeft: spacing[2],
    };

    const markAllBtnStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      color: unreadCount > 0 ? colors.sky[600] : colors.neutral[400],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: unreadCount > 0 ? 'pointer' : 'default',
      padding: `${spacing[1]} ${spacing[2]}`,
      borderRadius: radius.sm,
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
    };

    return (
      <>
        <div style={overlayStyle} onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          className={cn('preone-notification-center', className)}
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-label="Notification center"
          {...props}
        >
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h2 style={titleStyle}>
                Notifications
                <span style={countBadgeStyle}>{unreadCount}</span>
              </h2>
            </div>
            <div style={headerActionsStyle}>
              <button
                style={markAllBtnStyle}
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                aria-label="Mark all as read"
                type="button"
                onMouseEnter={(e) => {
                  if (unreadCount > 0) e.currentTarget.style.backgroundColor = colors.sky[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <CheckAllIcon />
                Mark all read
              </button>
              <button
                style={iconBtnStyle}
                onClick={onClose}
                aria-label="Close notification center"
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
            </div>
          </div>

          {/* Filter tabs */}
          <div style={filterBarStyle} role="tablist" aria-label="Filter notifications">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                style={filterTabStyle(activeFilter === tab.key)}
                role="tab"
                aria-selected={activeFilter === tab.key}
                onClick={() => setActiveFilter(tab.key)}
                type="button"
                onMouseEnter={(e) => {
                  if (activeFilter !== tab.key) {
                    e.currentTarget.style.backgroundColor = colors.neutral[50];
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== tab.key) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={listStyle} role="list" aria-label="Notifications">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onDelete={onDelete}
                  onClick={onClickNotification}
                />
              ))
            ) : (
              <div style={emptyStateStyle}>
                <div style={{ color: colors.neutral[300] }}>
                  <BellOffIcon />
                </div>
                <h3 style={emptyTitleStyle}>
                  {activeFilter === 'all' ? 'No notifications yet' : 'No matching notifications'}
                </h3>
                <p style={emptyDescStyle}>
                  {activeFilter === 'all'
                    ? 'When you receive notifications, they will appear here.'
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

NotificationCenter.displayName = 'NotificationCenter';
