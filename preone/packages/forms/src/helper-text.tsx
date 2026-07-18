import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for HelperText styling.
 */
export type HelperTextVariant = 'default' | 'success' | 'warning' | 'error';

/**
 * Sizes for HelperText.
 */
export type HelperTextSize = 'sm' | 'md';

/**
 * Props for the HelperText component.
 */
export interface HelperTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant indicating status */
  variant?: HelperTextVariant;
  /** Size */
  size?: HelperTextSize;
  /** Whether the associated field is disabled */
  disabled?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
}

const variantStyles: Record<HelperTextVariant, string> = {
  default: 'text-[var(--preone-text-secondary)]',
  success: 'text-[var(--preone-color-success)]',
  warning: 'text-[var(--preone-color-warning)]',
  error: 'text-[var(--preone-color-error)]',
};

const sizeStyles: Record<HelperTextSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
};

/**
 * PreOne HelperText component displayed below form fields.
 * Supports semantic variant coloring, sizes, disabled/dark modes,
 * and ARIA description linking.
 *
 * @example
 * ```tsx
 * <HelperText variant="default" size="sm">
 *   Enter your work email address
 * </HelperText>
 * ```
 */
export const HelperText = React.forwardRef<HTMLSpanElement, HelperTextProps>(
  (
    {
      variant = 'default',
      size = 'sm',
      disabled = false,
      dark = false,
      className,
      children,
      ...props
    },
    ref: React.Ref<HTMLSpanElement>,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'flex items-center gap-1',
          variantStyles[variant],
          dark && variant === 'default' && 'text-[var(--preone-text-secondary-dark)]',
          sizeStyles[size],
          disabled && 'opacity-50',
          className,
        )}
        role="note"
        aria-disabled={disabled}
        data-helper-variant={variant}
        data-helper-size={size}
        data-dark={dark || undefined}
        {...props}
      >
        {children}
      </span>
    );
  },
);

HelperText.displayName = 'HelperText';
