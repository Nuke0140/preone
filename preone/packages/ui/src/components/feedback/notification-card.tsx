/**
 * @preone/ui — NotificationCard Component
 *
 * A rich notification card for displaying user-facing notifications
 * with avatar, title, message, timestamp, read/unread state, and actions.
 * Inspired by Linear/GitHub notification cards.
 *
 * Features:
 * - **Avatar**: Optional avatar for the notification source
 * - **Read/unread indicator**: Visual distinction for unread items
 * - **Timestamp**: Relative or absolute time display
 * - **Action buttons**: Optional action area
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="article"` with `aria-label` for screen readers
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { NotificationCard } from '@preone/ui/feedback';
 *
 * <NotificationCard
 *   title="New comment"
 *   message="Jane commented on your post"
 *   timestamp="2 min ago"
 *   unread
 *   avatar={<Avatar size="sm"><AvatarFallback>J</AvatarFallback></Avatar>}
 *   actions={<Button size="sm">Reply</Button>}
 * />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * NotificationCard variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-card` / `--color-card-foreground` — card surface
 * - `--color-muted-foreground` — secondary text
 * - `--color-primary` — unread indicator dot
 * - `--color-border` — divider
 * - `--radius-lg` — card radius
 */
export const notificationCardVariants = cva(
  [
    'relative flex gap-3',
    'rounded-[var(--radius-lg)]',
    'p-4',
    'transition-colors',
    'duration-[var(--duration-fast,150ms)]',
  ].join(' '),
  {
    variants: {
      unread: {
        true: 'bg-[var(--color-muted)]/50',
        false: 'bg-[var(--color-card)]',
      },
    },
    defaultVariants: {
      unread: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link NotificationCard} component.
 *
 * Extends standard `<div>` attributes with PreOne notification features.
 */
export interface NotificationCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationCardVariants> {
  /** Optional avatar element for the notification source. */
  avatar?: React.ReactNode;

  /** Notification title — e.g. "New comment". */
  title: string;

  /** Notification message body. */
  message?: string;

  /** Timestamp display — e.g. "2 min ago", "Jan 15". */
  timestamp?: string;

  /**
   * When `true`, the notification is visually marked as unread.
   *
   * @default false
   */
  unread?: boolean;

  /** Optional action buttons area. */
  actions?: React.ReactNode;

  /** Click handler — typically navigates to the notification target. */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne NotificationCard — a rich notification display card.
 *
 * **Accessibility:**
 * - `role="article"` for proper semantic structure
 * - Unread dot is `aria-hidden="true"` (decorative)
 * - Clickable card is keyboard-focusable when `onClick` is provided
 *
 * @param props - All NotificationCardProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <NotificationCard
 *   title="New comment"
 *   message="Jane commented on your post"
 *   timestamp="2 min ago"
 *   unread
 * />
 * ```
 */
export const NotificationCard = React.forwardRef<HTMLDivElement, NotificationCardProps>(
  (
    {
      className,
      avatar,
      title,
      message,
      timestamp,
      unread = false,
      actions,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isClickable = !!onClick;

    return (
      <div
        ref={ref}
        role="article"
        tabIndex={isClickable ? 0 : undefined}
        className={cn(
          notificationCardVariants({ unread }),
          isClickable && [
            'cursor-pointer',
            'hover:bg-[var(--color-muted)]/70',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          ],
          className,
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        aria-label={`${unread ? 'Unread: ' : ''}${title}`}
        {...props}
      >
        {/* Unread dot */}
        {unread && (
          <span
            className={cn(
              'absolute top-4 left-1.5',
              'h-2 w-2 rounded-[var(--radius-full)]',
              'bg-[var(--color-primary)]',
            )}
            aria-hidden="true"
          />
        )}

        {/* Avatar */}
        {avatar && (
          <div className="shrink-0">
            {avatar}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              {title}
            </span>
            {timestamp && (
              <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                {timestamp}
              </span>
            )}
          </div>
          {message && (
            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)] line-clamp-2">
              {message}
            </p>
          )}
          {actions && (
            <div className="mt-2 flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  },
);

NotificationCard.displayName = 'NotificationCard';
