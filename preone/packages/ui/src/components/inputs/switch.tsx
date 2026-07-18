/**
 * @preone/ui — Switch
 *
 * A toggle switch built on @radix-ui/react-switch with custom styled
 * thumb and track, and an optional label.
 *
 * @example
 * ```tsx
 * <Switch label="Dark mode" onCheckedChange={(v) => console.log(v)} />
 * <Switch size="lg" variant="filled" />
 * ```
 *
 * @module switch
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const switchTrackVariants = cva(
  [
    'relative',
    'inline-flex',
    'shrink-0',
    'rounded-full',
    'border-2',
    'border-transparent',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus-visible:ring-2',
    'focus-visible:ring-[var(--ring)]/20',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'data-[state=checked]:bg-[var(--primary)]',
    'data-[state=unchecked]:bg-[var(--input)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-5,1.25rem)] w-[var(--spacing-9,2.25rem)]',
        default: 'h-[var(--spacing-6,1.5rem)] w-[var(--spacing-11,2.75rem)]',
        lg: 'h-[var(--spacing-7,1.75rem)] w-[var(--spacing-14,3.5rem)]',
      },
      variant: {
        default: '',
        filled: 'data-[state=unchecked]:bg-[var(--muted)]',
        ghost: 'data-[state=unchecked]:bg-transparent data-[state=unchecked]:border-[var(--input)]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

const switchThumbVariants = cva(
  [
    'block',
    'rounded-full',
    'bg-[var(--background)]',
    'shadow-[var(--shadow-sm)]',
    'transition-transform',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'data-[state=checked]:translate-x-full',
    'data-[state=unchecked]:translate-x-0',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-3.5,0.875rem)] w-[var(--spacing-3.5,0.875rem)]',
        default: 'h-[var(--spacing-4.5,1.125rem)] w-[var(--spacing-4.5,1.125rem)]',
        lg: 'h-[var(--spacing-5.5,1.375rem)] w-[var(--spacing-5.5,1.375rem)]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the Switch component. */
export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, 'size'>,
    VariantProps<typeof switchTrackVariants> {
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Optional label displayed next to the switch. */
  label?: string;
  /** Whether the switch is in an error state. */
  error?: boolean;
  /** Error message. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Switch — A toggle switch using @radix-ui/react-switch.
 *
 * - forwardRef compatible
 * - Custom styled thumb and track
 * - Optional label
 * - ARIA switch role via Radix
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link SwitchProps}
 * @returns The rendered switch component.
 */
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(
  (
    {
      className,
      size,
      variant,
      label,
      error = false,
      errorMessage,
      disabled,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    return (
      <div className="flex flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="flex items-center gap-[var(--spacing-2,0.5rem)]">
          <SwitchPrimitive.Root
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            className={cn(
              switchTrackVariants({ size, variant }),
              error && 'data-[state=checked]:bg-[var(--destructive)]! data-[state=unchecked]:bg-[var(--destructive)]/30!',
              className
            )}
            {...props}
          >
            <SwitchPrimitive.Thumb
              className={cn(
                switchThumbVariants({ size }),
                'ml-[2px]'
              )}
            />
          </SwitchPrimitive.Root>

          {label && (
            <label
              htmlFor={id}
              className={cn(
                'text-[var(--text-sm,0.875rem)]',
                'text-[var(--foreground)]',
                'cursor-pointer',
                'select-none',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
        </div>

        {error && errorMessage && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              'text-[var(--text-sm,0.875rem)]',
              'text-[var(--destructive)]',
              'pl-[var(--spacing-1,0.25rem)]'
            )}
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { switchTrackVariants, switchThumbVariants };
