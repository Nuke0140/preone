/**
 * @preone/ui — FloatingActionButton (FAB) Component
 *
 * A Floating Action Button component inspired by Material Design's FAB pattern,
 * adapted for the PreOne Enterprise design system.
 *
 * Features:
 * - **Variants**: default (filled), extended (icon + label)
 * - **Sizes**: sm, default, lg
 * - **Fixed positioning**: Renders in a fixed position on the viewport
 * - **Icon + optional label**: Supports icon-only or extended label
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: Complete accessibility attributes
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Rounded corners (full pill for extended, circle for default)
 * - Soft shadows for elevation
 * - NO heavy borders, NO glossy, NO gradients
 * - Generous touch targets for mobile
 *
 * @example
 * ```tsx
 * import { FloatingActionButton } from '@preone/ui';
 * import { Plus } from 'lucide-react';
 *
 * // Icon-only FAB
 * <FloatingActionButton icon={Plus} label="Create new item" />
 *
 * // Extended FAB with label
 * <FloatingActionButton icon={Plus} label="Create new item" variant="extended">
 *   Create
 * </FloatingActionButton>
 *
 * // Positioned FAB
 * <FloatingActionButton
 *   icon={Plus}
 *   label="Add"
 *   position={{ bottom: 24, right: 24 }}
 * />
 * ```
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual variant for the FloatingActionButton. */
export type FabVariant = 'default' | 'extended';

/** Size variant for the FloatingActionButton. */
export type FabSize = 'sm' | 'default' | 'lg';

/**
 * FAB variant definitions using `class-variance-authority`.
 *
 * All styles use design token CSS variables for automatic dark mode
 * and design system consistency.
 */
export const fabVariants = cva(
  // ── Base styles ────────────────────────────────────────────────────────
  [
    'inline-flex items-center justify-center gap-2',
    'bg-[var(--primary)] text-[var(--primary-foreground)]',
    'shadow-[var(--shadow-lg)]',
    'hover:bg-[var(--primary)]/90 hover:shadow-[var(--shadow-xl)]',
    'active:bg-[var(--primary)]/80',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
    'transition-all',
    'font-medium',
    'select-none',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /**
         * Default — circular icon-only button.
         * Renders as a perfect circle with the icon centered.
         */
        default: 'rounded-full',

        /**
         * Extended — pill-shaped button with icon + label.
         * Renders as a rounded pill with generous horizontal padding.
         */
        extended: 'rounded-full px-6',
      },

      size: {
        /**
         * Small — 40×40px for compact FABs.
         */
        sm: 'h-10 w-10 text-[var(--text-sm)]',

        /**
         * Default — 56×56px standard FAB size.
         */
        default: 'h-14 w-14 text-[var(--text-base)]',

        /**
         * Large — 64×64px for prominent FABs.
         */
        lg: 'h-16 w-16 text-[var(--text-lg)]',
      },
    },

    compoundVariants: [
      // Extended variant overrides: width is auto, height adapts
      {
        variant: 'extended',
        size: 'sm',
        className: 'h-10 w-auto',
      },
      {
        variant: 'extended',
        size: 'default',
        className: 'h-14 w-auto',
      },
      {
        variant: 'extended',
        size: 'lg',
        className: 'h-16 w-auto',
      },
    ],

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Icon Size Mapping
// ---------------------------------------------------------------------------

/** Maps FAB size to the appropriate Lucide icon pixel size. */
const fabIconSizeMap: Record<FabSize, number> = {
  sm: 18,
  default: 24,
  lg: 28,
};

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

/**
 * Position configuration for the FAB's fixed placement on the viewport.
 *
 * All values are in pixels. The FAB uses `position: fixed`.
 */
export interface FabPosition {
  /** Distance from the top edge of the viewport. */
  top?: number;
  /** Distance from the right edge of the viewport. */
  right?: number;
  /** Distance from the bottom edge of the viewport. */
  bottom?: number;
  /** Distance from the left edge of the viewport. */
  left?: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the FloatingActionButton component.
 *
 * Extends the standard `<button>` HTML attributes with FAB-specific props
 * for variant, size, positioning, and icon configuration.
 */
export interface FloatingActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * The Lucide icon component to render inside the FAB.
   * Always displayed (both in default and extended variants).
   */
  icon: LucideIcon;

  /**
   * Accessible label for the FAB.
   *
   * Rendered as `aria-label` on the underlying `<button>`.
   * Required for screen reader accessibility when using the
   * default (icon-only) variant.
   */
  label: string;

  /**
   * Visual variant of the FAB.
   *
   * - `default` — circular, icon-only
   * - `extended` — pill-shaped, icon + text label
   *
   * @default 'default'
   */
  variant?: FabVariant;

  /**
   * Size of the FAB.
   *
   * - `sm` — 40px (compact)
   * - `default` — 56px (standard)
   * - `lg` — 64px (prominent)
   *
   * @default 'default'
   */
  size?: FabSize;

  /**
   * Fixed position of the FAB on the viewport.
   * When provided, the FAB renders with `position: fixed`.
   *
   * If omitted, the FAB renders inline and can be positioned
   * via CSS or a parent container.
   *
   * @example
   * ```tsx
   * // Bottom-right corner
   * position={{ bottom: 24, right: 24 }}
   * ```
   */
  position?: FabPosition;

  /**
   * Text label for the extended variant.
   * Only rendered when `variant` is `'extended'`.
   *
   * If not provided and `variant` is `'extended'`, the `label` prop
   * (aria-label) is used as the visible text.
   */
  children?: ReactNode;

  /**
   * z-index for the fixed FAB.
   * Defaults to 50 to appear above most content.
   *
   * @default 50
   */
  zIndex?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne FloatingActionButton — a fixed-position action button.
 *
 * The FAB provides a prominent, always-accessible action trigger,
 * typically positioned in the bottom-right corner of the screen.
 * It supports both icon-only (default) and extended (icon + label) variants.
 *
 * **Accessibility:**
 * - `aria-label` is always set via the `label` prop
 * - The icon has `aria-hidden="true"` (label provides the accessible name)
 * - Standard `disabled` attribute is supported
 * - Focus ring is visible on keyboard navigation
 *
 * @param props - All FloatingActionButtonProps.
 * @param ref - Forwarded ref to the underlying button element.
 *
 * @example
 * ```tsx
 * // Basic icon-only FAB
 * <FloatingActionButton icon={Plus} label="Create" />
 *
 * // Extended FAB with visible label
 * <FloatingActionButton icon={Plus} label="Create" variant="extended">
 *   Create New
 * </FloatingActionButton>
 *
 * // Positioned in bottom-right
 * <FloatingActionButton
 *   icon={Plus}
 *   label="Add item"
 *   position={{ bottom: 24, right: 24 }}
 * />
 * ```
 */
export const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    {
      className,
      icon: Icon,
      label,
      variant = 'default',
      size = 'default',
      position,
      children,
      zIndex = 50,
      disabled,
      ...props
    },
    ref,
  ) => {
    const iconSize = fabIconSizeMap[size];

    // Build position styles if provided
    const positionStyle: React.CSSProperties = position
      ? {
          position: 'fixed',
          zIndex,
          ...position,
        }
      : { zIndex };

    return (
      <button
        ref={ref}
        className={cn(fabVariants({ variant, size }), className)}
        style={positionStyle}
        aria-label={label}
        disabled={disabled}
        {...props}
      >
        <Icon size={iconSize} aria-hidden="true" />
        {variant === 'extended' && (
          <span>{children ?? label}</span>
        )}
      </button>
    );
  },
);

FloatingActionButton.displayName = 'FloatingActionButton';
