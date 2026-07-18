import * as React from 'react';
import { cn } from './cn.js';

/**
 * Toast variant types (re-exported).
 */
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

/**
 * Props for the Toast component.
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Toast title */
  title: string;
  /** Toast description */
  description?: string;
  /** Variant type */
  variant?: ToastVariant;
  /** Whether the toast is dismissing */
  dismissing?: boolean;
  /** Action label */
  actionLabel?: string;
  /** Action handler */
  onAction?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Whether to apply dark mode */
  dark?: boolean;
}

const variantBorderStyles: Record<ToastVariant, string> = {
  default: 'border-l-[var(--preone-border)]',
  success: 'border-l-[var(--preone-color-success)]',
  error: 'border-l-[var(--preone-color-error)]',
  warning: 'border-l-[var(--preone-color-warning)]',
  info: 'border-l-[var(--preone-color-info)]',
};

const variantIconColors: Record<ToastVariant, string> = {
  default: 'text-[var(--preone-text-secondary)]',
  success: 'text-[var(--preone-color-success)]',
  error: 'text-[var(--preone-color-error)]',
  warning: 'text-[var(--preone-color-warning)]',
  info: 'text-[var(--preone-color-info)]',
};

/**
 * PreOne Toast component — individual toast notification with
 * variant styling, action buttons, dismiss, and ARIA.
 *
 * @example
 * ```tsx
 * <Toast
 *   title="Success"
 *   description="Your changes have been saved."
 *   variant="success"
 *   onDismiss={() => setVisible(false)}
 * />
 * ```
 */
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      title,
      description,
      variant = 'default',
      dismissing = false,
      actionLabel,
      onAction,
      onDismiss,
      dark = false,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border shadow-lg border-l-4',
          'bg-[var(--preone-surface)] border-[var(--preone-border)]',
          variantBorderStyles[variant],
          'transition-all duration-200',
          dismissing
            ? 'opacity-0 translate-x-4 scale-95'
            : 'opacity-100 translate-x-0 scale-100',
          dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
          className,
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-dark={dark || undefined}
        data-variant={variant}
        {...props}
      >
        <div className="flex items-start gap-3 p-4">
          <VariantIcon variant={variant} />
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'font-semibold text-sm text-[var(--preone-text-primary)]',
                dark && 'text-[var(--preone-text-primary-dark)]',
              )}
            >
              {title}
            </p>
            {description && (
              <p
                className={cn(
                  'text-sm mt-0.5 text-[var(--preone-text-secondary)]',
                  dark && 'text-[var(--preone-text-secondary-dark)]',
                )}
              >
                {description}
              </p>
            )}
            {actionLabel && (
              <button
                type="button"
                onClick={onAction}
                className="mt-2 text-sm font-medium text-[var(--preone-color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)] rounded"
              >
                {actionLabel}
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded hover:bg-[var(--preone-surface-secondary)] transition-colors flex-shrink-0"
              aria-label="Dismiss notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-[var(--preone-text-tertiary)]" aria-hidden="true">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  },
);

Toast.displayName = 'Toast';

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const iconClass = cn('h-5 w-5 flex-shrink-0 mt-0.5', variantIconColors[variant]);

  switch (variant) {
    case 'success':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={iconClass} aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
        </svg>
      );
    case 'error':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={iconClass} aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
        </svg>
      );
    case 'warning':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={iconClass} aria-hidden="true">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      );
    case 'info':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={iconClass} aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={iconClass} aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
      );
  }
}
