/**
 * @preone/ui — Password
 *
 * A password input with show/hide toggle (Eye/EyeOff), strength indicator
 * (weak/medium/strong), and full variant support.
 *
 * @example
 * ```tsx
 * <Password variant="filled" size="lg" showStrength placeholder="Create password" />
 * <Password error errorMessage="Password is required" />
 * ```
 *
 * @module password
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants (reuses input variants)
// ---------------------------------------------------------------------------

const passwordVariants = cva(
  [
    'w-full',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
    'placeholder:text-[var(--muted-foreground)]',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'pr-[var(--spacing-10,2.5rem)]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-transparent',
          'border',
          'border-[var(--input)]',
          'text-[var(--foreground)]',
          'hover:border-[var(--ring)]',
          'focus:border-[var(--ring)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
          'shadow-[var(--shadow-inner)]',
        ].join(' '),
        filled: [
          'bg-[var(--muted)]',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus:bg-transparent',
          'focus:border-[var(--ring)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus:bg-[var(--accent)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
        ].join(' '),
      },
      size: {
        sm: [
          'h-[var(--spacing-8,2rem)]',
          'px-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'h-[var(--spacing-10,2.5rem)]',
          'px-[var(--spacing-3,0.75rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        lg: [
          'h-[var(--spacing-12,3rem)]',
          'px-[var(--spacing-4,1rem)]',
          'text-[var(--text-base,1rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
        ].join(' '),
      },
      error: {
        true: [
          'border-[var(--destructive)]!',
          'focus:ring-[var(--destructive)]/20!',
          'focus:border-[var(--destructive)]!',
        ].join(' '),
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      error: false,
    },
  }
);

// ---------------------------------------------------------------------------
// Strength calculation
// ---------------------------------------------------------------------------

/** Password strength levels. */
export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Evaluates password strength based on length, character diversity,
 * and common patterns.
 *
 * @param password - The password string to evaluate.
 * @returns A {@link PasswordStrength} value.
 */
function evaluateStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

/** Color mapping for strength levels. */
const strengthColors: Record<PasswordStrength, string> = {
  weak: 'var(--destructive)',
  medium: 'var(--warning)',
  strong: 'var(--success)',
};

/** Label mapping for strength levels. */
const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
};

/** Width percentage mapping for strength bars. */
const strengthWidth: Record<PasswordStrength, string> = {
  weak: '33%',
  medium: '66%',
  strong: '100%',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the Password component. */
export interface PasswordProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    VariantProps<typeof passwordVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Show the password strength indicator. */
  showStrength?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Password — A password input with show/hide toggle and optional strength indicator.
 *
 * - forwardRef compatible
 * - ARIA toggle button for visibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link PasswordProps}
 * @returns The rendered password input element.
 */
export const Password = React.forwardRef<HTMLInputElement, PasswordProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      showStrength = false,
      disabled,
      value,
      defaultValue,
      onChange,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;
    const toggleId = `${id}-toggle`;

    const [visible, setVisible] = React.useState(false);
    const [strength, setStrength] = React.useState<PasswordStrength>('weak');

    const currentValue = (value ?? defaultValue ?? '') as string;

    React.useEffect(() => {
      if (showStrength) {
        setStrength(evaluateStrength(String(currentValue)));
      }
    }, [currentValue, showStrength]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (showStrength) {
        setStrength(evaluateStrength(e.target.value));
      }
      onChange?.(e);
    };

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            className={cn(passwordVariants({ variant, size, error }), className)}
            {...props}
          />

          <button
            id={toggleId}
            type="button"
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            className={cn(
              'absolute right-0 top-0 flex h-full items-center',
              'pr-[var(--spacing-3,0.75rem)]',
              'text-[var(--muted-foreground)]',
              'hover:text-[var(--foreground)]',
              'transition-colors',
              'duration-[var(--duration-fast,150ms)]',
              'focus:outline-none'
            )}
          >
            {visible ? (
              <EyeOff size={size === 'lg' ? 20 : 16} aria-hidden="true" />
            ) : (
              <Eye size={size === 'lg' ? 20 : 16} aria-hidden="true" />
            )}
          </button>
        </div>

        {showStrength && String(currentValue).length > 0 && (
          <div className="flex items-center gap-[var(--spacing-2,0.5rem)] pl-[var(--spacing-1,0.25rem)]">
            <div
              className="h-[3px] rounded-full bg-[var(--muted)]"
              style={{ width: '100%' }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: strengthWidth[strength],
                  backgroundColor: strengthColors[strength],
                }}
              />
            </div>
            <span
              className="text-[var(--text-xs,0.75rem)] whitespace-nowrap"
              style={{ color: strengthColors[strength] }}
            >
              {strengthLabels[strength]}
            </span>
          </div>
        )}

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

Password.displayName = 'Password';

export { passwordVariants };
