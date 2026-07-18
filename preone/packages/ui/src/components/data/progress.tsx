/**
 * @preone/ui — Progress Component
 *
 * A composable progress bar using @radix-ui/react-progress.
 * Supports colour variants, sizes, optional label, and percentage display.
 *
 * Features:
 * - **@radix-ui/react-progress**: Accessible progress semantics
 * - **Variants**: default, success, warning, destructive
 * - **Sizes**: sm, default, lg
 * - **Label & percentage**: Optional text above the bar
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: Complete accessibility via Radix primitives
 * - **Design tokens**: All colours and sizing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Progress } from '@preone/ui/data';
 *
 * <Progress value={65} variant="default" />
 * <Progress value={100} variant="success" showPercentage label="Upload complete" />
 * <Progress value={85} variant="warning" size="lg" />
 * ```
 */

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the Progress component. */
export type ProgressVariant = 'default' | 'success' | 'warning' | 'destructive';

/** Size variant for the Progress component. */
export type ProgressSize = 'sm' | 'default' | 'lg';

/** Maps variant to indicator colour. */
const variantColorMap: Record<ProgressVariant, string> = {
  default: 'bg-[var(--color-primary)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  destructive: 'bg-[var(--color-destructive)]',
};

/**
 * Progress track (root) size definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-muted` — track background
 * - `--radius-full` — pill shape
 */
export const progressVariants = cva(
  [
    'relative w-full overflow-hidden',
    'bg-[var(--color-muted)]',
    'rounded-[var(--radius-full)]',
  ].join(' '),
  {
    variants: {
      size: {
        /** Small — 4px height. */
        sm: 'h-1',
        /** Default — 8px height. */
        default: 'h-2',
        /** Large — 12px height. */
        lg: 'h-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Progress} component.
 *
 * Extends Radix Progress root props with PreOne variants and display options.
 */
export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  /**
   * The current progress value (0–100).
   * Maps to Radix `value` prop.
   *
   * @default 0
   */
  value?: number;

  /**
   * Visual style variant — changes the indicator colour.
   *
   * @default 'default'
   */
  variant?: ProgressVariant;

  /**
   * Optional label displayed above the progress bar.
   */
  label?: string;

  /**
   * When `true`, the numeric percentage is shown beside the label.
   *
   * @default false
   */
  showPercentage?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Progress — an accessible progress bar with variants and labels.
 *
 * **Accessibility:**
 * - Built on @radix-ui/react-progress for proper ARIA `progressbar` role
 * - `aria-valuenow`, `aria-valuemin`, `aria-valuemax` set automatically
 * - Label is associated via `aria-labelledby` when provided
 *
 * @param props - All ProgressProps plus Radix Progress root props.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <Progress value={65} />
 * <Progress value={100} variant="success" showPercentage label="Upload" />
 * ```
 */
export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      size,
      variant = 'default',
      value = 0,
      label,
      showPercentage = false,
      ...props
    },
    ref,
  ) => {
    const labelId = label ? React.useId() : undefined;
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div className="w-full">
        {(label || showPercentage) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <span
                id={labelId}
                className="text-sm font-medium text-[var(--color-foreground)]"
              >
                {label}
              </span>
            )}
            {showPercentage && (
              <span className="text-sm tabular-nums text-[var(--color-muted-foreground)]">
                {Math.round(clampedValue)}%
              </span>
            )}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(progressVariants({ size }), className)}
          value={clampedValue}
          aria-labelledby={labelId}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              'h-full w-full flex-1 transition-all',
              'duration-[var(--duration-normal,300ms)]',
              'ease-[var(--ease-default,ease)]',
              variantColorMap[variant],
            )}
            style={{ transform: `translateX(-${100 - clampedValue}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  },
);

Progress.displayName = 'Progress';
