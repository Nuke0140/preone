/**
 * @preone/ui — PageHeader Component
 *
 * Title + description + optional breadcrumb + action buttons area.
 * Provides a consistent page-level header across the application.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   breadcrumb={<Breadcrumb items={[...]} />}
 *   title="Student Directory"
 *   description="Manage enrolled students for the current academic year."
 *   actions={<Button>Add Student</Button>}
 * />
 * ```
 */

import * as React from 'react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

/** Props for the {@link PageHeader} component. */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional breadcrumb navigation rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Page title. */
  title?: React.ReactNode;
  /** Page description rendered below the title. */
  description?: React.ReactNode;
  /** Action buttons rendered to the right of the title. */
  actions?: React.ReactNode;
}

/**
 * Page header — title, description, breadcrumb, and action buttons.
 *
 * Provides a consistent page-level header with generous whitespace
 * following the Metro/Fluent design language.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, breadcrumb, title, description, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {/* Breadcrumb row */}
      {breadcrumb && <div>{breadcrumb}</div>}

      {/* Title row with actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {title && (
            <h1 className="text-2xl font-bold tracking-[var(--tracking-tight)] text-[var(--foreground)]">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-sm text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {children}
    </div>
  )
);
PageHeader.displayName = 'PageHeader';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { PageHeader };
