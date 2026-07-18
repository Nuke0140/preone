/**
 * @preone/ui — Alert Component
 *
 * A contextual alert banner for conveying status, warnings, errors, and
 * informational messages. Inspired by Linear/Stripe alert patterns —
 * prominent, readable, and dismissible.
 *
 * Features:
 * - **Variants**: default, destructive, success, warning, info
 * - **Optional icon, title, description**: Structured content
 * - **Dismissible**: Close button with `onDismiss` callback
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="alert"` for screen reader announcements
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Alert } from '@preone/ui/feedback';
 *
 * <Alert variant="info" title="Heads up">
 *   You have unsaved changes.
 * </Alert>
 *
 * <Alert
 *   variant="destructive"
 *   title="Error"
 *   icon={<AlertCircle />}
 *   onDismiss={() => setVisible(false)}
 * >
 *   Failed to save changes.
 * </Alert>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the Alert component. */
export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

/** Maps variant to icon component. */
const variantIconMap: Record<AlertVariant, React.ComponentType<React.SVGAttributes<SVGElement>>> = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

/**
 * Alert variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-foreground` — default text
 * - `--color-destructive` / `--color-destructive-foreground` — destructive
 * - `--color-success` / `--color-success-foreground` — success
 * - `--color-warning` / `--color-warning-foreground` — warning
 * - `--color-info` / `--color-info-foreground` — info
 * - `--color-border` — border colour
 * - `--radius-lg` — container radius
 */
export const alertVariants = cva(
  [
    'relative flex gap-3',
    'rounded-[var(--radius-lg)]',
    'border',
    'p-4',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — neutral info style. */
        default: [
          'border-[var(--color-border)] bg-[var(--color-muted)]',
          'text-[var(--color-foreground)]',
        ].join(' '),

        /** Destructive — red error style. */
        destructive: [
          'border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/10',
          'text-[var(--color-destructive-foreground)]',
        ].join(' '),

        /** Success — green confirmation style. */
        success: [
          'border-[var(--color-success)]/20 bg-[var(--color-success)]/10',
          'text-[var(--color-success-foreground)]',
        ].join(' '),

        /** Warning — amber caution style. */
        warning: [
          'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10',
          'text-[var(--color-warning-foreground)]',
        ].join(' '),

        /** Info — blue informational style. */
        info: [
          'border-[var(--color-info)]/20 bg-[var(--color-info)]/10',
          'text-[var(--color-info-foreground)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Maps variant to icon colour classes. */
const variantIconColorMap: Record<AlertVariant, string> = {
  default: 'text-[var(--color-muted-foreground)]',
  destructive: 'text-[var(--color-destructive)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Alert} component.
 *
 * Extends standard `<div>` attributes with PreOne alert features.
 */
export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Optional custom icon — overrides the default variant icon. */
  icon?: React.ReactNode;

  /** Alert title — rendered as a bold heading. */
  title?: string;

  /** Dismiss callback — when provided, a close button is shown. */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Alert — a contextual banner for status and feedback messages.
 *
 * **Accessibility:**
 * - `role="alert"` for screen reader live announcements
 * - Icon is `aria-hidden="true"` (decorative)
 * - Dismiss button has `aria-label="Dismiss"`
 *
 * @param props - All AlertProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <Alert variant="warning" title="Warning">
 *   Your session will expire in 5 minutes.
 * </Alert>
 * ```
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = 'default', icon, title, onDismiss, children, ...props },
    ref,
  ) => {
    const DefaultIcon = variantIconMap[variant as AlertVariant] ?? Info;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {/* Icon */}
        <span
          className={cn(
            'shrink-0 mt-0.5',
            variantIconColorMap[variant as AlertVariant] ?? variantIconColorMap.default,
          )}
          aria-hidden="true"
        >
          {icon ?? <DefaultIcon className="h-5 w-5" />}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="font-semibold leading-none mb-1">
              {title}
            </h5>
          )}
          {children && (
            <div className="text-sm opacity-90">
              {children}
            </div>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'shrink-0 ml-2',
              'inline-flex items-center justify-center',
              'h-6 w-6 rounded-[var(--radius-md)]',
              'text-[var(--color-muted-foreground)]',
              'hover:bg-[var(--color-muted)]',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';
