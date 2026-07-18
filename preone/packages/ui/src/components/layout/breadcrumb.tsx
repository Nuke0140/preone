/**
 * @preone/ui — Breadcrumb Component
 *
 * Breadcrumb with items, separator, and ellipsis for overflow.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItem href="/students">Students</BreadcrumbItem>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItem current>John Doe</BreadcrumbItem>
 * </Breadcrumb>
 *
 * <Breadcrumb>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbSeparator />
 *   <BreadcrumbEllipsis />
 *   <BreadcrumbSeparator />
 *   <BreadcrumbItem current>Current Page</BreadcrumbItem>
 * </Breadcrumb>
 * ```
 */

import * as React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/** Props for the {@link Breadcrumb} component. */
export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * Breadcrumb navigation container — renders an ordered list of breadcrumb items.
 */
const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn('text-sm text-[var(--muted-foreground)]', className)}
      {...props}
    >
      <ol className="flex items-center flex-wrap gap-1.5">{children}</ol>
    </nav>
  )
);
Breadcrumb.displayName = 'Breadcrumb';

// ---------------------------------------------------------------------------
// BreadcrumbItem
// ---------------------------------------------------------------------------

/** Props for the {@link BreadcrumbItem} component. */
export interface BreadcrumbItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Optional href — renders as a link. */
  href?: string;
  /** Whether this is the current (last) breadcrumb. */
  current?: boolean;
}

/**
 * Breadcrumb item — renders as a link or plain text.
 * The current item is rendered as text with `aria-current="page"`.
 */
const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, href, current = false, children, ...props }, ref) => (
    <li
      ref={ref}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      {href && !current ? (
        <a
          href={href}
          className={cn(
            'rounded-[var(--radius-sm)] px-1.5 py-0.5',
            'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'
          )}
        >
          {children}
        </a>
      ) : (
        <span
          aria-current={current ? 'page' : undefined}
          className={cn(
            'px-1.5 py-0.5',
            current
              ? 'font-medium text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)]'
          )}
        >
          {children}
        </span>
      )}
    </li>
  )
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

// ---------------------------------------------------------------------------
// BreadcrumbSeparator
// ---------------------------------------------------------------------------

/** Props for the {@link BreadcrumbSeparator} component. */
export interface BreadcrumbSeparatorProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Custom separator content (defaults to ChevronRight icon). */
  separator?: React.ReactNode;
}

/**
 * Breadcrumb separator — renders a chevron or custom separator between items.
 */
const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ className, separator, ...props }, ref) => (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn('flex items-center text-[var(--muted-foreground)]', className)}
      {...props}
    >
      {separator ?? <ChevronRight className="h-3.5 w-3.5" />}
    </li>
  )
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

// ---------------------------------------------------------------------------
// BreadcrumbEllipsis
// ---------------------------------------------------------------------------

/** Props for the {@link BreadcrumbEllipsis} component. */
export interface BreadcrumbEllipsisProps extends React.LiHTMLAttributes<HTMLLIElement> {}

/**
 * Breadcrumb ellipsis — indicates hidden/collapsed breadcrumb items.
 */
const BreadcrumbEllipsis = React.forwardRef<HTMLLIElement, BreadcrumbEllipsisProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn('flex items-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4 text-[var(--muted-foreground)]" />
    </li>
  )
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbEllipsis };
