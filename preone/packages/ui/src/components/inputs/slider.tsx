/**
 * @preone/ui — Slider
 *
 * A slider built on @radix-ui/react-slider with custom styled thumb and
 * track, supporting min/max/step values.
 *
 * @example
 * ```tsx
 * <Slider min={0} max={100} step={5} defaultValue={[50]} onValueChange={(v) => console.log(v)} />
 * <Slider size="lg" variant="filled" />
 * ```
 *
 * @module slider
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const sliderTrackVariants = cva(
  [
    'relative',
    'w-full',
    'rounded-full',
    'overflow-hidden',
    'transition-colors',
    'duration-[var(--duration-fast,150ms)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-1,0.25rem)]',
        default: 'h-[var(--spacing-2,0.5rem)]',
        lg: 'h-[var(--spacing-3,0.75rem)]',
      },
      variant: {
        default: 'bg-[var(--input)]',
        filled: 'bg-[var(--muted)]',
        ghost: 'bg-[var(--border)]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

const sliderThumbVariants = cva(
  [
    'block',
    'rounded-full',
    'bg-[var(--background)]',
    'border-2',
    'border-[var(--primary)]',
    'shadow-[var(--shadow-md)]',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'hover:border-[var(--primary)]',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-[var(--ring)]/20',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-4,1rem)] w-[var(--spacing-4,1rem)]',
        default: 'h-[var(--spacing-5,1.25rem)] w-[var(--spacing-5,1.25rem)]',
        lg: 'h-[var(--spacing-6,1.5rem)] w-[var(--spacing-6,1.5rem)]',
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

/** Props for the Slider component. */
export interface SliderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'size'>,
    VariantProps<typeof sliderTrackVariants> {
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Minimum value. @default 0 */
  min?: number;
  /** Maximum value. @default 100 */
  max?: number;
  /** Step increment. @default 1 */
  step?: number;
  /** Error state. */
  error?: boolean;
  /** Error message. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Slider — A slider using @radix-ui/react-slider with custom styled thumb
 * and track.
 *
 * - forwardRef compatible
 * - min/max/step support
 * - ARIA slider role via Radix
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link SliderProps}
 * @returns The rendered slider component.
 */
export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      size,
      variant,
      min = 0,
      max = 100,
      step = 1,
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
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <SliderPrimitive.Root
          ref={ref}
          id={id}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error && errorMessage ? errorId : undefined}
          className={cn(
            'relative flex w-full touch-none select-none items-center',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        >
          <SliderPrimitive.Track
            className={cn(sliderTrackVariants({ size, variant }))}
          >
            <SliderPrimitive.Range
              className={cn(
                'absolute h-full rounded-full',
                error ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'
              )}
            />
          </SliderPrimitive.Track>

          <SliderPrimitive.Thumb
            className={cn(
              sliderThumbVariants({ size }),
              error && 'border-[var(--destructive)]!'
            )}
          />
        </SliderPrimitive.Root>

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

Slider.displayName = 'Slider';

export { sliderTrackVariants, sliderThumbVariants };
