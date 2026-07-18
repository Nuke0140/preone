/**
 * @preone/ui — Skeleton Component
 *
 * A low-level loading placeholder for building custom skeleton layouts.
 * Provides shape variants for text lines, circles, rectangles, and rounded blocks.
 *
 * Features:
 * - **Variants**: text, circular, rectangular, rounded
 * - **Width/height props**: Explicit sizing control
 * - **Animation**: Pulse animation via `animate-pulse`
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `aria-hidden="true"` and `role="presentation"`
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Skeleton } from '@preone/ui/data';
 *
 * <Skeleton variant="text" className="w-48" />
 * <Skeleton variant="circular" className="h-12 w-12" />
 * <Skeleton variant="rectangular" className="h-32 w-full" />
 * <Skeleton variant="rounded" className="h-24 w-full" />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Shape variant for the Skeleton component. */
export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

/**
 * Skeleton variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-muted` — placeholder background colour
 * - `--radius-full` — circular shape
 * - `--radius-lg` — rounded shape
 */
export const skeletonVariants = cva(
  [
    'animate-pulse',
    'bg-[var(--color-muted)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Text — single line of text, full width, 1em height. */
        text: 'h-4 w-full rounded-[var(--radius-md)]',

        /** Circular — for avatars and icons. Requires explicit width/height. */
        circular: 'rounded-[var(--radius-full)]',

        /** Rectangular — sharp corners, for images and cards. */
        rectangular: 'rounded-none',

        /** Rounded — soft corners, for cards and blocks. */
        rounded: 'rounded-[var(--radius-lg)]',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Skeleton} component.
 *
 * Extends standard `<div>` attributes with PreOne skeleton variants.
 */
export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /**
   * Explicit width — passed as inline style.
   * Prefer `className` for responsive widths.
   */
  width?: string | number;

  /**
   * Explicit height — passed as inline style.
   * Prefer `className` for responsive heights.
   */
  height?: string | number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Skeleton — a low-level loading placeholder for custom skeleton layouts.
 *
 * **Accessibility:**
 * - `aria-hidden="true"` — skeleton is decorative
 * - `role="presentation"` — no semantic meaning
 *
 * @param props - All SkeletonProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * // Text line skeleton
 * <Skeleton variant="text" className="w-48" />
 *
 * // Avatar skeleton
 * <Skeleton variant="circular" className="h-10 w-10" />
 *
 * // Card skeleton
 * <Skeleton variant="rounded" className="h-48 w-full" />
 * ```
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, width, height, style, ...props }, ref) => (
    <div
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn(skeletonVariants({ variant }), className)}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
        ...style,
      }}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';
