/**
 * @preone/ui — Button Component
 *
 * A versatile, production-grade button component for the PreOne Enterprise Platform.
 *
 * Features:
 * - **Variants**: default, secondary, outline, ghost, link, destructive
 * - **Sizes**: sm, default, lg, icon
 * - **States**: disabled, loading (with animated spinner)
 * - **asChild**: Compose with any element via @radix-ui/react-slot
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: Complete accessibility attributes
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Very large whitespace (generous padding)
 * - Rounded corners (var(--radius-lg))
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Inter font
 * - 8-point spacing grid
 *
 * @example
 * ```tsx
 * import { Button } from '@preone/ui';
 *
 * <Button variant="default" size="default">Save Changes</Button>
 * <Button variant="destructive" loading>Deleting…</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 * <Button variant="ghost" asChild>
 *   <a href="/docs">Read Docs</a>
 * </Button>
 * ```
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the Button component. */
export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';

/** Size variant for the Button component. */
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

/**
 * Button variant definitions using `class-variance-authority`.
 *
 * Each variant is fully styled via design token CSS variables, ensuring
 * automatic dark mode support and consistency with the PreOne design system.
 *
 * CSS Variable Reference:
 * - `--primary` / `--primary-foreground` — default action colour
 * - `--secondary` / `--secondary-foreground` — secondary action colour
 * - `--destructive` / `--destructive-foreground` — destructive action colour
 * - `--accent` / `--accent-foreground` — accent / hover colour
 * - `--muted-foreground` — muted text colour
 * - `--border` — border colour
 * - `--ring` — focus ring colour
 * - `--background` / `--foreground` — surface / text colour
 * - `--radius-lg` — default border radius (12px)
 * - `--shadow-sm` / `--shadow-default` — shadow tokens
 * - `--duration-fast` — transition duration
 * - `--ease-default` — transition easing
 */
export const buttonVariants = cva(
  // ── Base styles ────────────────────────────────────────────────────────
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /**
         * Primary action button — filled with the primary colour.
         * Use for the main CTA on any surface.
         */
        default: [
          'bg-[var(--primary)] text-[var(--primary-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--primary)]/90',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--primary)]/80',
        ].join(' '),

        /**
         * Secondary action button — subtle filled style.
         * Use for secondary actions alongside a primary button.
         */
        secondary: [
          'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--secondary)]/80',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--secondary)]/70',
        ].join(' '),

        /**
         * Outlined button — border only, no fill.
         * Use for tertiary actions or in dense layouts.
         */
        outline: [
          'border border-[var(--border)] bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),

        /**
         * Ghost button — no border, no fill.
         * Use for subtle actions, toolbar buttons, or inline triggers.
         */
        ghost: [
          'bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),

        /**
         * Link button — appears as a text link.
         * Use for navigation-style actions within a button context.
         */
        link: [
          'bg-transparent text-[var(--primary)] underline-offset-4',
          'hover:underline',
          'focus-visible:ring-[var(--ring)]',
        ].join(' '),

        /**
         * Destructive button — red-filled danger action.
         * Use for irreversible or high-risk actions (delete, remove).
         */
        destructive: [
          'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--destructive)]/90',
          'focus-visible:ring-[var(--destructive)]',
          'active:bg-[var(--destructive)]/80',
        ].join(' '),
      },

      size: {
        /**
         * Small — compact padding for dense layouts and toolbars.
         * Height ~32px, horizontal padding 12px.
         */
        sm: 'h-8 px-3 text-[var(--text-sm)] rounded-[var(--radius-md)]',

        /**
         * Default — standard button size.
         * Height ~40px, horizontal padding 24px (generous whitespace).
         */
        default: 'h-10 px-6 text-[var(--text-sm)] rounded-[var(--radius-lg)]',

        /**
         * Large — prominent button for hero sections or stand-alone CTAs.
         * Height ~48px, horizontal padding 32px.
         */
        lg: 'h-12 px-8 text-[var(--text-base)] rounded-[var(--radius-lg)]',

        /**
         * Icon — square button for icon-only usage.
         * 40×40px by default. Pair with `IconButton` for proper aria-label.
         */
        icon: 'h-10 w-10 rounded-[var(--radius-lg)]',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

/**
 * Animated spinner component displayed when the button is in loading state.
 * Uses the `Loader2` icon from Lucide with a CSS spin animation.
 */
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin', className)}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the Button component.
 *
 * Extends the standard `<button>` HTML attributes with PreOne-specific
 * variant, size, and state props.
 */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When `true`, the button renders as a Slot from @radix-ui/react-slot,
   * merging its props onto the immediate child element instead of rendering
   * a `<button>`. This enables composition with links, routers, etc.
   *
   * @default false
   *
   * @example
   * ```tsx
   * <Button asChild>
   *   <a href="/dashboard">Go to Dashboard</a>
   * </Button>
   * ```
   */
  asChild?: boolean;

  /**
   * When `true`, the button enters a loading state:
   * - Shows an animated spinner
   * - Sets `aria-busy="true"`
   * - Sets `aria-disabled="true"` to prevent interaction
   * - The button text remains visible beside the spinner
   *
   * @default false
   */
  loading?: boolean;

  /**
   * The content rendered inside the button.
   * Can be text, icons, or any React node.
   */
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Button — the foundational interactive element.
 *
 * Renders a `<button>` by default, or composes with a child element
 * when `asChild` is `true`. Supports all standard HTML button attributes,
 * ARIA attributes, and PreOne design variants.
 *
 * **Accessibility:**
 * - `aria-busy` is set to `true` when `loading` is `true`
 * - `aria-disabled` is set to `true` when `loading` is `true`
 * - Standard `disabled` attribute is supported
 * - Focus ring is visible on keyboard navigation via `focus-visible`
 *
 * @param props - All ButtonProps plus standard button HTML attributes.
 * @param ref - Forwarded ref to the underlying button element.
 *
 * @example
 * ```tsx
 * // Default primary button
 * <Button>Save Changes</Button>
 *
 * // Loading state
 * <Button loading>Saving…</Button>
 *
 * // Destructive action
 * <Button variant="destructive">Delete Account</Button>
 *
 * // Compose with a router link
 * <Button variant="outline" asChild>
 *   <Link to="/settings">Settings</Link>
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    // Determine the underlying component: Slot for asChild, button otherwise
    const Component = asChild ? Slot : 'button';

    // When loading, prevent interaction without visually disabling the button
    const isDisabled = disabled || loading;

    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={loading ? 'true' : undefined}
        {...props}
      >
        {loading && <ButtonSpinner />}
        {children}
      </Component>
    );
  },
);

Button.displayName = 'Button';
