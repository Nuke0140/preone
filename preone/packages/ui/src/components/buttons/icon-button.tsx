/**
 * @preone/ui — IconButton Component
 *
 * An icon-only button component that wraps the base `Button` with
 * a simplified API for icon-only interactions.
 *
 * Features:
 * - **Icon prop**: Accepts any Lucide icon component
 * - **Label prop**: Required for accessibility (renders `aria-label`)
 * - **Variant/Size**: Inherits Button variants with icon-appropriate defaults
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `aria-label` is always set for screen reader accessibility
 * - **Design tokens**: All styling via CSS custom properties
 *
 * @example
 * ```tsx
 * import { IconButton } from '@preone/ui';
 * import { Pencil, Trash2, Plus } from 'lucide-react';
 *
 * <IconButton icon={Pencil} label="Edit item" />
 * <IconButton icon={Trash2} label="Delete item" variant="destructive" />
 * <IconButton icon={Plus} label="Add new item" size="sm" />
 * ```
 */

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Button, type ButtonVariant } from './button.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * IconButton variant definitions.
 *
 * Inherits the same variant set as Button, but forces the icon size
 * variant. The variant-specific styles are delegated to the underlying
 * Button component.
 */
export const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'shrink-0',
  ].join(' '),
  {
    variants: {
      /** Size of the icon button container. */
      size: {
        /** Small — 32×32px for dense layouts. */
        sm: 'h-8 w-8',
        /** Default — 40×40px standard icon button. */
        default: 'h-10 w-10',
        /** Large — 48×48px for prominent actions. */
        lg: 'h-12 w-12',
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
 * Props for the IconButton component.
 *
 * Extends the standard `<button>` HTML attributes. The `icon` and `label`
 * props are required for accessibility and visual rendering.
 */
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * The Lucide icon component to render inside the button.
   *
   * Must be a valid Lucide icon component (e.g., `Pencil`, `Trash2`, `Plus`).
   * The icon is rendered at a size appropriate for the button's `size` prop.
   */
  icon: LucideIcon;

  /**
   * Accessible label for the button.
   *
   * Rendered as `aria-label` on the underlying `<button>`.
   * This is **required** because icon-only buttons have no visible text
   * and would be inaccessible to screen readers without a label.
   */
  label: string;

  /**
   * Visual style variant for the button.
   * Inherits the same variants as the base Button component.
   *
   * @default 'ghost'
   */
  variant?: ButtonVariant;

  /**
   * Size of the icon button.
   * Controls both the button dimensions and the icon size.
   *
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * When `true`, the button shows a loading spinner instead of the icon
   * and prevents interaction.
   *
   * @default false
   */
  loading?: boolean;

  /**
   * When `true`, the button renders as a Slot from @radix-ui/react-slot,
   * merging its props onto the immediate child element.
   *
   * @default false
   */
  asChild?: boolean;
}

// ---------------------------------------------------------------------------
// Icon Size Mapping
// ---------------------------------------------------------------------------

/** Maps IconButton size to the appropriate Lucide icon pixel size. */
const iconSizeMap: Record<string, number> = {
  sm: 16,
  default: 20,
  lg: 24,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne IconButton — an icon-only button with built-in accessibility.
 *
 * Wraps the base `Button` component with an icon-first API. The `label`
 * prop is always required and rendered as `aria-label`, ensuring screen
 * reader users can identify the button's purpose.
 *
 * **Accessibility:**
 * - `aria-label` is always set via the required `label` prop
 * - `aria-busy` is set when `loading` is `true`
 * - `aria-disabled` is set when `loading` is `true`
 * - `aria-hidden="true"` on the icon element (label provides the accessible name)
 *
 * @param props - All IconButtonProps plus standard button HTML attributes.
 * @param ref - Forwarded ref to the underlying button element.
 *
 * @example
 * ```tsx
 * // Edit button
 * <IconButton icon={Pencil} label="Edit item" />
 *
 * // Destructive delete button
 * <IconButton icon={Trash2} label="Delete item" variant="destructive" />
 *
 * // Small add button
 * <IconButton icon={Plus} label="Add item" size="sm" variant="outline" />
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      icon: Icon,
      label,
      variant = 'ghost',
      size = 'default',
      loading = false,
      asChild = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const iconSize = iconSizeMap[size] ?? 20;

    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        className={cn(iconButtonVariants({ size }), className)}
        aria-label={label}
        loading={loading}
        asChild={asChild}
        disabled={disabled}
        {...props}
      >
        {loading ? undefined : <Icon size={iconSize} aria-hidden="true" />}
      </Button>
    );
  },
);

IconButton.displayName = 'IconButton';
