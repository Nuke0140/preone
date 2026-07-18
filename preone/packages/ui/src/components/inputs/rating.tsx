/**
 * @preone/ui — Rating
 *
 * A star rating component (1–5 or custom max) with half-star support,
 * read-only mode, and Star icon from lucide-react.
 *
 * @example
 * ```tsx
 * <Rating value={3} onChange={(v) => console.log(v)} />
 * <Rating max={10} allowHalf size="lg" readOnly value={7.5} />
 * ```
 *
 * @module rating
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const ratingVariants = cva(
  [
    'inline-flex',
    'items-center',
    'gap-[var(--spacing-0.5,0.125rem)]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: '[&_svg]:h-[var(--spacing-4,1rem)] [&_svg]:w-[var(--spacing-4,1rem)]',
        default: '[&_svg]:h-[var(--spacing-5,1.25rem)] [&_svg]:w-[var(--spacing-5,1.25rem)]',
        lg: '[&_svg]:h-[var(--spacing-6,1.5rem)] [&_svg]:w-[var(--spacing-6,1.5rem)]',
      },
      variant: {
        default: '',
        filled: '',
        ghost: '',
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

/** Props for the Rating component. */
export interface RatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof ratingVariants> {
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant (affects empty star style). */
  variant?: 'default' | 'filled' | 'ghost';
  /** Maximum rating value. @default 5 */
  max?: number;
  /** Current rating value. */
  value?: number;
  /** Default value (uncontrolled). */
  defaultValue?: number;
  /** Called when the rating changes. */
  onChange?: (value: number) => void;
  /** Allow half-star ratings. @default false */
  allowHalf?: boolean;
  /** Read-only mode (no interaction). */
  readOnly?: boolean;
  /** Whether the rating is disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Rating — A star rating component with half-star support and read-only mode.
 *
 * - forwardRef compatible
 * - Star icon from lucide-react
 * - Half-star rendering
 * - Keyboard navigation (ArrowLeft/Right)
 * - ARIA slider role for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link RatingProps}
 * @returns The rendered rating component.
 */
export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      className,
      size,
      variant,
      max = 5,
      value: controlledValue,
      defaultValue = 0,
      onChange,
      allowHalf = false,
      readOnly = false,
      disabled = false,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;

    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const [hoverValue, setHoverValue] = React.useState<number | null>(null);
    const displayValue = hoverValue ?? currentValue;

    const stars = React.useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);

    const setValue = React.useCallback(
      (val: number) => {
        if (readOnly || disabled) return;
        if (!isControlled) setInternalValue(val);
        onChange?.(val);
      },
      [readOnly, disabled, isControlled, onChange]
    );

    const handleClick = React.useCallback(
      (star: number, isLeftHalf: boolean) => {
        if (readOnly || disabled) return;
        if (allowHalf && isLeftHalf) {
          // If clicking the same half-star value, clear it
          setValue(currentValue === star - 0.5 ? 0 : star - 0.5);
        } else {
          // If clicking the same value, clear it
          setValue(currentValue === star ? 0 : star);
        }
      },
      [allowHalf, readOnly, disabled, currentValue, setValue]
    );

    const handleMouseEnter = React.useCallback(
      (star: number, isLeftHalf: boolean) => {
        if (readOnly || disabled) return;
        setHoverValue(allowHalf && isLeftHalf ? star - 0.5 : star);
      },
      [allowHalf, readOnly, disabled]
    );

    const handleMouseLeave = React.useCallback(() => {
      setHoverValue(null);
    }, []);

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (readOnly || disabled) return;
        const step = allowHalf ? 0.5 : 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.min(currentValue + step, max);
          setValue(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = Math.max(currentValue - step, 0);
          setValue(next);
        }
      },
      [readOnly, disabled, allowHalf, currentValue, max, setValue]
    );

    /** Renders a single star with fill logic. */
    const renderStar = (starIndex: number) => {
      const filled = displayValue >= starIndex;
      const halfFilled = allowHalf && !filled && displayValue >= starIndex - 0.5;
      const empty = !filled && !halfFilled;

      const filledColor = 'text-[var(--warning)] fill-[var(--warning)]';
      const emptyColor = variant === 'filled'
        ? 'text-[var(--muted)] fill-[var(--muted)]'
        : variant === 'ghost'
        ? 'text-[var(--muted-foreground)]'
        : 'text-[var(--muted-foreground)]';

      return (
        <span
          key={starIndex}
          className={cn(
            'relative inline-flex',
            !readOnly && !disabled && 'cursor-pointer'
          )}
          onClick={(e) => {
            if (readOnly || disabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
            handleClick(starIndex, isLeftHalf);
          }}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
            handleMouseEnter(starIndex, isLeftHalf);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {filled ? (
            <Star className={cn(filledColor)} aria-hidden="true" />
          ) : halfFilled ? (
            <span className="relative">
              <Star className={cn(emptyColor)} aria-hidden="true" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: '50%' }}
                aria-hidden="true"
              >
                <Star className={cn(filledColor)} aria-hidden="true" />
              </span>
            </span>
          ) : (
            <Star className={cn(emptyColor)} aria-hidden="true" />
          )}
        </span>
      );
    };

    return (
      <div
        ref={ref}
        id={id}
        role={readOnly ? 'img' : 'slider'}
        aria-valuenow={currentValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${currentValue} out of ${max} stars`}
        aria-label={`Rating: ${currentValue} out of ${max} stars`}
        aria-orientation="horizontal"
        tabIndex={readOnly || disabled ? undefined : 0}
        onKeyDown={handleKeyDown}
        className={cn(
          ratingVariants({ size, variant }),
          disabled && 'opacity-50 cursor-not-allowed',
          readOnly && 'cursor-default',
          className
        )}
        {...props}
      >
        {stars.map((starIndex) => renderStar(starIndex))}
      </div>
    );
  }
);

Rating.displayName = 'Rating';

export { ratingVariants };
