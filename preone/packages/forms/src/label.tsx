import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from './cn.js';

/**
 * Variants for Label styling.
 */
export type LabelVariant = 'default' | 'floating' | 'sr-only';

/**
 * Sizes for Label.
 */
export type LabelSize = 'sm' | 'md' | 'lg';

/**
 * Props for the Label component.
 */
export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Visual variant */
  variant?: LabelVariant;
  /** Size */
  size?: LabelSize;
  /** Whether the labeled field is required */
  required?: boolean;
  /** Whether the labeled field is disabled */
  disabled?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
}

const sizeStyles: Record<LabelSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * PreOne Label component built on @radix-ui/react-label.
 * Supports floating labels, screen-reader-only mode, required indicators,
 * and full ARIA accessibility.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email" required size="md">Email</Label>
 * ```
 */
export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  LabelProps
>(
  (
    {
      variant = 'default',
      size = 'md',
      required = false,
      disabled = false,
      dark = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn(
          'font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          'text-[var(--preone-text-primary)]',
          sizeStyles[size],
          required &&
            "after:content-['*'] after:ml-0.5 after:text-[var(--preone-color-error)]",
          disabled && 'opacity-50 cursor-not-allowed',
          dark && 'text-[var(--preone-text-primary-dark)]',
          variant === 'floating' &&
            'absolute left-3 top-1/2 -translate-y-1/2 transition-all peer-focus:top-2 peer-focus:text-xs peer-focus:text-[var(--preone-color-primary)] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs',
          variant === 'sr-only' && 'sr-only',
          className,
        )}
        data-label-variant={variant}
        data-label-size={size}
        data-dark={dark || undefined}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </LabelPrimitive.Root>
    );
  },
);

Label.displayName = 'Label';
