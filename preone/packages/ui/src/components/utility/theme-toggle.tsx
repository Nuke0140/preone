/**
 * @preone/ui — ThemeToggle Component
 *
 * A light/dark mode toggle button with smooth icon transitions between
 * Sun and Moon icons from Lucide.
 *
 * Features:
 * - **Light/Dark toggle**: Switches between Sun and Moon icons
 * - **Smooth transitions**: Icon cross-fade with rotation animation
 * - **Controlled & Uncontrolled**: Supports both `isDark` prop and internal state
 * - **onChange callback**: Fires `onChange(isDark)` when toggled
 * - **Variants**: default, outline, ghost
 * - **Sizes**: sm, default, lg
 * - **forwardRef**: Full ref forwarding to the button element
 * - **ARIA**: `aria-pressed` and `aria-label` for accessibility
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Very large whitespace
 * - Rounded corners (var(--radius-lg))
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Premium minimal
 *
 * @example
 * ```tsx
 * import { ThemeToggle } from '@preone/ui';
 *
 * <ThemeToggle onChange={(isDark) => setTheme(isDark ? 'dark' : 'light')} />
 * <ThemeToggle isDark={isDark} onChange={handleToggle} variant="outline" size="sm" />
 * <ThemeToggle isDark={false} onChange={(d) => document.documentElement.classList.toggle('dark', d)} />
 * ```
 *
 * @module theme-toggle
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the ThemeToggle. */
export type ThemeToggleVariant = 'default' | 'outline' | 'ghost';

/** Size variant for the ThemeToggle. */
export type ThemeToggleSize = 'sm' | 'default' | 'lg';

/**
 * ThemeToggle variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--primary` / `--primary-foreground` — default action colour
 * - `--accent` / `--accent-foreground` — accent / hover colour
 * - `--foreground` — text colour
 * - `--border` — border colour
 * - `--ring` — focus ring colour
 * - `--radius-lg` — border radius
 * - `--shadow-sm` — shadow token
 * - `--duration-fast` — transition duration
 * - `--ease-default` — transition easing
 */
export const themeToggleVariants = cva(
  [
    'inline-flex items-center justify-center',
    'relative',
    'overflow-hidden',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — subtle filled background. */
        default: [
          'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--secondary)]/80',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--secondary)]/70',
        ].join(' '),

        /** Outline — bordered, no fill. */
        outline: [
          'border border-[var(--border)] bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),

        /** Ghost — no border, no fill. */
        ghost: [
          'bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
          'active:bg-[var(--accent)]/70',
        ].join(' '),
      },

      size: {
        /** Small — 32px. */
        sm: 'h-8 w-8 rounded-[var(--radius-md)]',

        /** Default — 40px. */
        default: 'h-10 w-10 rounded-[var(--radius-lg)]',

        /** Large — 48px. */
        lg: 'h-12 w-12 rounded-[var(--radius-lg)]',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ThemeToggle component. */
export interface ThemeToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof themeToggleVariants> {
  /**
   * Whether the current theme is dark mode.
   * When provided, the component is controlled.
   * When omitted, the component manages its own state.
   */
  isDark?: boolean;
  /**
   * Default dark mode state for uncontrolled usage.
   * @default false
   */
  defaultIsDark?: boolean;
  /**
   * Callback fired when the toggle is clicked.
   * Receives the new dark mode state (`true` = dark, `false` = light).
   */
  onChange?: (isDark: boolean) => void;
  /**
   * Visual variant.
   * @default 'default'
   */
  variant?: ThemeToggleVariant;
  /**
   * Size preset.
   * @default 'default'
   */
  size?: ThemeToggleSize;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ThemeToggle — A light/dark mode toggle with smooth icon transitions.
 *
 * Renders a button that shows a Sun icon in light mode and a Moon icon
 * in dark mode, with a smooth cross-fade and rotation transition between
 * the two states.
 *
 * **Controlled usage:**
 * ```tsx
 * const [isDark, setIsDark] = useState(false);
 * <ThemeToggle isDark={isDark} onChange={setIsDark} />
 * ```
 *
 * **Uncontrolled usage:**
 * ```tsx
 * <ThemeToggle onChange={(isDark) => applyTheme(isDark)} />
 * ```
 *
 * **Accessibility:**
 * - `aria-pressed` reflects the dark mode state
 * - `aria-label` provides context ("Switch to dark mode" / "Switch to light mode")
 * - Focus ring visible on keyboard navigation
 *
 * @param props - {@link ThemeToggleProps}
 * @param ref - Forwarded ref to the underlying button element.
 * @returns The rendered theme toggle.
 */
export const ThemeToggle = React.forwardRef<
  HTMLButtonElement,
  ThemeToggleProps
>(
  (
    {
      className,
      isDark: isDarkProp,
      defaultIsDark = false,
      onChange,
      disabled,
      variant = 'default',
      size = 'default',
      ...props
    },
    ref,
  ) => {
    const [internalIsDark, setInternalIsDark] = React.useState(defaultIsDark);
    const isControlled = isDarkProp !== undefined;
    const isDark = isControlled ? isDarkProp : internalIsDark;

    const handleToggle = React.useCallback(() => {
      const nextIsDark = !isDark;
      if (!isControlled) {
        setInternalIsDark(nextIsDark);
      }
      onChange?.(nextIsDark);
    }, [isDark, isControlled, onChange]);

    // Icon size based on button size
    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          themeToggleVariants({ variant, size }),
          className,
        )}
        disabled={disabled}
        onClick={handleToggle}
        {...props}
      >
        {/* Sun icon — visible in light mode, hidden in dark mode */}
        <Sun
          className={cn(
            iconSize,
            'absolute',
            'transition-all',
            'duration-300',
            'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
            isDark
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100',
          )}
          aria-hidden="true"
        />
        {/* Moon icon — visible in dark mode, hidden in light mode */}
        <Moon
          className={cn(
            iconSize,
            'absolute',
            'transition-all',
            'duration-300',
            'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0',
          )}
          aria-hidden="true"
        />
        {/* Invisible spacer to maintain button sizing */}
        <span className={cn(iconSize, 'invisible')} aria-hidden="true" />
      </button>
    );
  },
);

ThemeToggle.displayName = 'ThemeToggle';
