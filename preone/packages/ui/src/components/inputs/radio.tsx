/**
 * @preone/ui — Radio
 *
 * A radio group built on @radix-ui/react-radio-group with custom styled
 * radio indicators.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]}
 *   onChange={(val) => console.log(val)}
 * />
 * ```
 *
 * @module radio
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A radio option. */
export interface RadioOption {
  /** Unique value. */
  value: string;
  /** Display label. */
  label: string;
  /** Whether the option is disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const radioIndicatorVariants = cva(
  [
    'shrink-0',
    'rounded-full',
    'border',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus:ring-2',
    'focus:ring-[var(--ring)]/20',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'data-[state=checked]:border-[var(--primary)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-4,1rem)] w-[var(--spacing-4,1rem)]',
        default: 'h-[var(--spacing-5,1.25rem)] w-[var(--spacing-5,1.25rem)]',
        lg: 'h-[var(--spacing-6,1.5rem)] w-[var(--spacing-6,1.5rem)]',
      },
      variant: {
        default: 'border-[var(--input)]',
        filled: 'border-[var(--input)] bg-[var(--muted)]',
        ghost: 'border-[var(--input)]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the RadioGroup component. */
export interface RadioGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, 'size' | 'onChange'>,
    VariantProps<typeof radioIndicatorVariants> {
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Radio options. */
  options: RadioOption[];
  /** Controlled value. */
  value?: string;
  /** Default value. */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onChange?: (value: string) => void;
  /** Whether the radio group is disabled. */
  disabled?: boolean;
  /** Orientation of the radio group. */
  orientation?: 'horizontal' | 'vertical';
  /** Error state. */
  error?: boolean;
  /** Error message. */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RadioGroup — A radio group using @radix-ui/react-radio-group with custom
 * styled radio indicators.
 *
 * - forwardRef compatible
 * - ARIA radio group role via Radix
 * - Keyboard navigation via Radix
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link RadioGroupProps}
 * @returns The rendered radio group component.
 */
export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(
  (
    {
      className,
      size,
      variant,
      options,
      value,
      defaultValue,
      onChange,
      disabled = false,
      orientation = 'vertical',
      error = false,
      errorMessage,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const dotSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

    return (
      <div className="flex flex-col gap-[var(--spacing-1,0.25rem)]">
        <RadioGroupPrimitive.Root
          ref={ref}
          id={id}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error && errorMessage ? errorId : undefined}
          orientation={orientation}
          className={cn(
            'flex',
            orientation === 'vertical'
              ? 'flex-col gap-[var(--spacing-2,0.5rem)]'
              : 'flex-row flex-wrap gap-[var(--spacing-4,1rem)]',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-[var(--spacing-2,0.5rem)]">
              <RadioGroupPrimitive.Item
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  radioIndicatorVariants({ size, variant }),
                  error && 'border-[var(--destructive)]! data-[state=checked]:border-[var(--destructive)]!'
                )}
              >
                <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                  <span
                    className="rounded-full bg-[var(--primary)]"
                    style={{
                      width: dotSize,
                      height: dotSize,
                    }}
                  />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>

              {option.label && (
                <label
                  className={cn(
                    'text-[var(--text-sm,0.875rem)]',
                    'text-[var(--foreground)]',
                    'cursor-pointer',
                    'select-none',
                    (option.disabled || disabled) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </label>
              )}
            </div>
          ))}
        </RadioGroupPrimitive.Root>

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

RadioGroup.displayName = 'RadioGroup';

export { radioIndicatorVariants };
