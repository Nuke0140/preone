import * as React from 'react';
import { cn } from './cn.js';
import { type NotificationItemData } from './notification-item.js';

/**
 * Props for the NotificationCenter component.
 */
export interface NotificationCenterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Notification items */
  notifications: NotificationItemData[];
  /** Callback when a notification is clicked */
  onNotificationClick?: (id: string) => void;
  /** Callback when a notification is dismissed */
  onNotificationDismiss?: (id: string) => void;
  /** Callback to mark a notification as read */
  onMarkAsRead?: (id: string) => void;
  /** Callback to mark all as read */
  onMarkAllAsRead?: () => void;
  /** Callback to load more notifications */
  onLoadMore?: () => void;
  /** Whether notifications are loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: number;
  /** Title */
  title?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether the panel is open */
  open?: boolean;
  /** Callback when panel closes */
  onClose?: () => void;
  /** Trigger element (e.g., bell icon button) */
  trigger?: React.ReactNode;
}

/**
 * PreOne NotificationCenter — dropdown/panel for managing notifications.
 * Shows a list of notifications with read/unread state, mark-all-as-read,
 * and infinite scroll loading. Supports dark mode and ARIA.
 *
 * @example
 * ```tsx
 * <NotificationCenter
 *   notifications={notifications}
 *   onNotificationClick={handleClick}
 *   onMarkAsRead={markRead}
 *   onMarkAllAsRead={markAllRead}
 *   dark={isDark}
 *   trigger={<BellButton />}
 * />
 * ```
 */
export const NotificationCenter = React.forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      notifications,
      onNotificationClick,
      onNotificationDismiss,
      onMarkAsRead,
      onMarkAllAsRead,
      onLoadMore,
      loading = false,
      dark = false,
      maxHeight = 480,
      title = 'Notifications',
      emptyMessage = 'No notifications',
      open: controlledOpen,
      onClose,
      trigger,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isOpen = controlledOpen ?? internalOpen;
    const listRef = React.useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleToggle = React.useCallback(() => {
      setInternalOpen((prev) => !prev);
    }, []);

    const handleClose = React.useCallback(() => {
      setInternalOpen(false);
      onClose?.();
    }, [onClose]);

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return;
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (ref && 'current' in ref && ref.current && !ref.current.contains(target)) {
          handleClose();
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, handleClose, ref]);

    // Infinite scroll
    const handleScroll = React.useCallback(() => {
      if (!listRef.current || !onLoadMore || loading) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        onLoadMore();
      }
    }, [onLoadMore, loading]);

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex', dark && 'dark', className)}
        data-dark={dark || undefined}
        {...props}
      >
        {/* Trigger */}
        {trigger && (
          <div onClick={handleToggle} className="cursor-pointer">
            {trigger}
          </div>
        )}

        {/* Dropdown panel */}
        {isOpen && (
          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-50 w-96 rounded-lg border shadow-xl',
              'bg-[var(--preone-surface)] border-[var(--preone-border)]',
              dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
            )}
            role="dialog"
            aria-label={title}
            aria-modal="false"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--preone-border)]">
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    'font-semibold text-sm text-[var(--preone-text-primary)]',
                    dark && 'text-[var(--preone-text-primary-dark)]',
                  )}
                >
                  {title}
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[var(--preone-color-primary)] px-1.5 py-0.5 text-xs font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onMarkAllAsRead && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className="text-xs font-medium text-[var(--preone-color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)] rounded"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-[var(--preone-surface-secondary)] transition-colors"
                  aria-label="Close notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-[var(--preone-text-tertiary)]" aria-hidden="true">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight: maxHeight - 56 }}
              onScroll={handleScroll}
              role="list"
              aria-label="Notification list"
            >
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="text-sm text-[var(--preone-text-secondary)]">
                    {emptyMessage}
                  </span>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b border-[var(--preone-border)] cursor-pointer transition-colors',
                      'hover:bg-[var(--preone-surface-secondary)]',
                      !notification.read && 'bg-[var(--preone-color-primary-soft)]',
                      dark && 'border-[var(--preone-border-dark)] hover:bg-[var(--preone-surface-secondary-dark)]',
                    )}
                    role="listitem"
                    onClick={() => {
                      onNotificationClick?.(notification.id);
                      if (!notification.read) onMarkAsRead?.(notification.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onNotificationClick?.(notification.id);
                        if (!notification.read) onMarkAsRead?.(notification.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${notification.read ? '' : 'Unread: '}${notification.title}`}
                  >
                    {/* Avatar/Icon */}
                    <div className="flex-shrink-0">
                      {notification.avatar ? (
                        <img
                          src={notification.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center',
                            'bg-[var(--preone-surface-secondary)] text-[var(--preone-text-secondary)]',
                          )}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9ZM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm text-[var(--preone-text-primary)]',
                          !notification.read && 'font-semibold',
                          dark && 'text-[var(--preone-text-primary-dark)]',
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p
                          className={cn(
                            'text-xs mt-0.5 text-[var(--preone-text-secondary)] truncate',
                            dark && 'text-[var(--preone-text-secondary-dark)]',
                          )}
                        >
                          {notification.message}
                        </p>
                      )}
                      {notification.time && (
                        <span className="text-xs text-[var(--preone-text-tertiary)] mt-0.5 block">
                          {notification.time}
                        </span>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-[var(--preone-color-primary)]" aria-label="Unread" />
                    )}

                    {/* Dismiss */}
                    {onNotificationDismiss && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotificationDismiss(notification.id);
                        }}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--preone-surface-secondary)] transition-colors"
                        aria-label={`Dismiss: ${notification.title}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-[var(--preone-text-tertiary)]" aria-hidden="true">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 rounded-full border-2 border-[var(--preone-color-primary)] border-t-transparent animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

NotificationCenter.displayName = 'NotificationCenter';
