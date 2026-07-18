import * as React from 'react';
import { cn } from './cn.js';

/**
 * Notification variant types.
 */
export type NotificationVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

/**
 * Notification item data structure.
 */
export interface NotificationItemData {
  /** Unique ID */
  id: string;
  /** Notification title */
  title: string;
  /** Notification message body */
  message?: string;
  /** Avatar image URL */
  avatar?: string;
  /** Timestamp text (e.g., "2 minutes ago") */
  time?: string;
  /** Whether the notification has been read */
  read: boolean;
  /** Variant type */
  variant?: NotificationVariant;
  /** Associated URL for navigation */
  url?: string;
  /** Extra metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Props for the NotificationItem component.
 */
export interface NotificationItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Notification data */
  notification: NotificationItemData;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Dismiss handler */
  onDismiss?: (id: string) => void;
  /** Mark as read handler */
  onMarkAsRead?: (id: string) => void;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the item is selected/focused */
  selected?: boolean;
}

const variantAccentColors: Record<NotificationVariant, string> = {
  default: 'border-l-[var(--preone-border)]',
  success: 'border-l-[var(--preone-color-success)]',
  error: 'border-l-[var(--preone-color-error)]',
  warning: 'border-l-[var(--preone-color-warning)]',
  info: 'border-l-[var(--preone-color-info)]',
};

/**
 * PreOne NotificationItem — individual notification item with
 * avatar, title, message, time, read state, and variant styling.
 *
 * @example
 * ```tsx
 * <NotificationItem
 *   notification={{
 *     id: '1',
 *     title: 'New message',
 *     message: 'John sent you a message',
 *     time: '2 min ago',
 *     read: false,
 *   }}
 *   onClick={handleClick}
 *   onMarkAsRead={markRead}
 * />
 * ```
 */
export const NotificationItem = React.forwardRef<HTMLDivElement, NotificationItemProps>(
  (
    {
      notification,
      onClick,
      onDismiss,
      onMarkAsRead,
      dark = false,
      selected = false,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { id, title, message, avatar, time, read, variant = 'default' } = notification;

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 px-4 py-3 border-l-4 cursor-pointer transition-colors',
          'hover:bg-[var(--preone-surface-secondary)]',
          variantAccentColors[variant],
          !read && 'bg-[var(--preone-color-primary-soft)]',
          selected && 'ring-2 ring-inset ring-[var(--preone-color-primary)]',
          dark && 'hover:bg-[var(--preone-surface-secondary-dark)]',
          className,
        )}
        role="listitem"
        aria-label={`${read ? '' : 'Unread: '}${title}`}
        tabIndex={0}
        onClick={() => {
          onClick?.(id);
          if (!read) onMarkAsRead?.(id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onClick?.(id);
            if (!read) onMarkAsRead?.(id);
          }
          if (e.key === 'd' && onDismiss) {
            onDismiss(id);
          }
        }}
        data-dark={dark || undefined}
        data-read={read || undefined}
        data-variant={variant}
        {...props}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
              aria-hidden="true"
            />
          ) : (
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center',
                'bg-[var(--preone-surface-secondary)]',
                dark && 'bg-[var(--preone-surface-secondary-dark)]',
              )}
            >
              {variant === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[var(--preone-color-success)]" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              ) : variant === 'error' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[var(--preone-color-error)]" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                </svg>
              ) : variant === 'warning' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[var(--preone-color-warning)]" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[var(--preone-text-secondary)]" aria-hidden="true">
                  <path fillRule="evenodd" d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9ZM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm text-[var(--preone-text-primary)]',
              !read && 'font-semibold',
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {title}
          </p>
          {message && (
            <p
              className={cn(
                'text-xs mt-0.5 text-[var(--preone-text-secondary)] line-clamp-2',
                dark && 'text-[var(--preone-text-secondary-dark)]',
              )}
            >
              {message}
            </p>
          )}
          {time && (
            <span className="text-xs text-[var(--preone-text-tertiary)] mt-1 block">
              {time}
            </span>
          )}
        </div>

        {/* Unread dot */}
        {!read && (
          <span className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-[var(--preone-color-primary)]" aria-label="Unread" />
        )}

        {/* Dismiss */}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(id);
            }}
            className="flex-shrink-0 p-1 rounded hover:bg-[var(--preone-surface-secondary)] transition-colors"
            aria-label={`Dismiss: ${title}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-[var(--preone-text-tertiary)]" aria-hidden="true">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

NotificationItem.displayName = 'NotificationItem';
