/**
 * @preone/ui — Spinner Component (Internal)
 *
 * An animated spinner used internally by loading-state components and
 * any other component that needs a compact loading indicator.
 *
 * Features:
 * - **Sizes**: xs, sm, default, lg
 * - **Design tokens**: All sizing and colour via CSS custom properties
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `aria-hidden="true"` by default (decorative)
 *
 * @example
 * ```tsx
 * import { Spinner } from '@preone/ui/data';
 *
 * <Spinner size="sm" />
 * <Spinner size="lg" className="text-[var(--primary)]" />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual size variant for the Spinner component. */
export type SpinnerSize = 'xs' | 'sm' | 'default' | 'lg';

/**
 * Spinner size definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-primary` — default stroke colour
 * - `--duration-fast` — spin animation duration
 */
export const spinnerVariants = cva(
  [
    'animate-spin',
    'text-[var(--color-primary)]',
    'shrink-0',
  ].join(' '),
  {
    variants: {
      size: {
        /** Extra-small — 12×12px, for inline indicators. */
        xs: 'h-3 w-3',
        /** Small — 16×16px, for badges and compact areas. */
        sm: 'h-4 w-4',
        /** Default — 20×20px, standard spinner. */
        default: 'h-5 w-5',
        /** Large — 28×28px, for prominent loading states. */
        lg: 'h-7 w-7',
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
 * Props for the {@link Spinner} component.
 *
 * Extends standard `<svg>` attributes with PreOne size variants.
 */
export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Spinner — an animated circular loading indicator.
 *
 * Renders an SVG with a spinning animation. By default `aria-hidden="true"`
 * because it is decorative; parent components should set `aria-busy="true"`
 * on the container when appropriate.
 *
 * @param props - All SpinnerProps plus standard SVG attributes.
 * @param ref - Forwarded ref to the underlying `<svg>` element.
 *
 * @example
 * ```tsx
 * <Spinner size="sm" />
 * <Spinner size="lg" className="text-[var(--destructive)]" />
 * ```
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cn(spinnerVariants({ size }), className)}
      aria-hidden="true"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
);

Spinner.displayName = 'Spinner';
