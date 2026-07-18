import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for UnreadBadge styling.
 */
export type UnreadBadgeVariant = 'default' | 'dot' | 'count';

/**
 * Sizes for UnreadBadge.
 */
export type UnreadBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Props for the UnreadBadge component.
 */
export interface UnreadBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Number of unread items */
  count: number;
  /** Visual variant */
  variant?: UnreadBadgeVariant;
  /** Size */
  size?: UnreadBadgeSize;
  /** Maximum count to display (e.g., 99+) */
  maxCount?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the badge is disabled */
  disabled?: boolean;
  /** Whether to show even when count is 0 */
  showZero?: boolean;
}

const sizeStyles: Record<UnreadBadgeSize, string> = {
  sm: 'min-w-[16px] h-4 text-[10px] px-1',
  md: 'min-w-[20px] h-5 text-xs px-1.5',
  lg: 'min-w-[24px] h-6 text-sm px-2',
};

const dotSizeStyles: Record<UnreadBadgeSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

/**
 * PreOne UnreadBadge — badge component for displaying unread count.
 * Supports count, dot, and default variants with design token theming.
 *
 * @example
 * ```tsx
 * <UnreadBadge count={5} variant="count" size="md" />
 * <UnreadBadge count={3} variant="dot" />
 * <UnreadBadge count={0} showZero />
 * ```
 */
export const UnreadBadge = React.forwardRef<HTMLSpanElement, UnreadBadgeProps>(
  (
    {
      count,
      variant = 'count',
      size = 'md',
      maxCount = 99,
      dark = false,
      disabled = false,
      showZero = false,
      className,
      ...props
    },
    ref: React.Ref<HTMLSpanElement>,
  ) => {
    if (count === 0 && !showZero) return null;

    const displayCount = count > maxCount ? `${maxCount}+` : count;

    if (variant === 'dot') {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-block rounded-full bg-[var(--preone-color-error)]',
            dotSizeStyles[size],
            disabled && 'opacity-50',
            dark && 'dark',
            className,
          )}
          role="status"
          aria-label={count > 0 ? `${count} unread` : 'No unread'}
          data-dark={dark || undefined}
          data-badge-variant={variant}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold leading-none',
          'bg-[var(--preone-color-error)] text-white',
          sizeStyles[size],
          disabled && 'opacity-50',
          dark && 'dark',
          variant === 'default' && 'bg-[var(--preone-color-primary)]',
          className,
        )}
        role="status"
        aria-label={`${count} unread`}
        data-dark={dark || undefined}
        data-badge-variant={variant}
        {...props}
      >
        {displayCount}
      </span>
    );
  },
);

UnreadBadge.displayName = 'UnreadBadge';
