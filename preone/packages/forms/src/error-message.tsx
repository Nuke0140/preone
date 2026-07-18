import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for error message styling.
 */
export type ErrorMessageVariant = 'default' | 'inline' | 'tooltip';

/**
 * Sizes for error message text.
 */
export type ErrorMessageSize = 'sm' | 'md';

/**
 * Props for the ErrorMessage component.
 */
export interface ErrorMessageProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The error message to display */
  message?: string;
  /** Visual variant */
  variant?: ErrorMessageVariant;
  /** Size */
  size?: ErrorMessageSize;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Unique id for aria-describedby linking */
  id?: string;
}

const sizeStyles: Record<ErrorMessageSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
};

/**
 * PreOne ErrorMessage component with animated entrance and exit.
 * Displays form validation errors with ARIA live region support.
 *
 * @example
 * ```tsx
 * <ErrorMessage message={errors.email?.message} id="email-error" />
 * ```
 */
export const ErrorMessage = React.forwardRef<HTMLSpanElement, ErrorMessageProps>(
  (
    {
      message,
      variant = 'default',
      size = 'sm',
      dark = false,
      className,
      id,
      ...props
    },
    ref: React.Ref<HTMLSpanElement>,
  ) => {
    if (!message) return null;

    return (
      <span
        ref={ref}
        id={id}
        role="alert"
        aria-live="polite"
        className={cn(
          'flex items-center gap-1 text-[var(--preone-color-error)] font-medium',
          sizeStyles[size],
          dark && 'text-[var(--preone-color-error-dark)]',
          variant === 'inline' && 'inline-flex',
          variant === 'tooltip' &&
            'absolute left-0 top-full mt-1 rounded bg-[var(--preone-color-error)] px-2 py-1 text-white text-xs shadow-lg z-10',
          'animate-in fade-in slide-in-from-top-1 duration-200',
          className,
        )}
        data-error-variant={variant}
        data-error-size={size}
        data-dark={dark || undefined}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5 flex-shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM6.22 5.22a.75.75 0 0 1 1.06 0L8 5.94l.72-.72a.75.75 0 0 1 1.06 1.06L9.06 7l.72.72a.75.75 0 0 1-1.06 1.06L8 8.06l-.72.72a.75.75 0 0 1-1.06-1.06L6.94 7l-.72-.72a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        {message}
      </span>
    );
  },
);

ErrorMessage.displayName = 'ErrorMessage';
