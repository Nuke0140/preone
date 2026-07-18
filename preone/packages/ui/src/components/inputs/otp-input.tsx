/**
 * @preone/ui — OTP Input
 *
 * An N-digit one-time-password input with individual character boxes,
 * auto-focus advancement, backspace navigation, and full paste support.
 *
 * @example
 * ```tsx
 * <OTPInput length={6} onComplete={(code) => console.log(code)} />
 * <OTPInput length={4} variant="filled" size="lg" />
 * ```
 *
 * @module otp-input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const otpBoxVariants = cva(
  [
    'flex items-center justify-center',
    'text-center',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
    'font-[var(--font-semibold,600)]',
    'caret-transparent',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
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
        ].join(' '),
        filled: [
          'bg-[var(--muted)]',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'focus:bg-transparent',
          'focus:border-[var(--ring)]',
          'focus:ring-2',
          'focus:ring-[var(--ring)]/20',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border-b-2',
          'border-[var(--input)]',
          'text-[var(--foreground)]',
          'rounded-none',
          'focus:border-[var(--ring)]',
        ].join(' '),
      },
      size: {
        sm: [
          'h-[var(--spacing-10,2.5rem)]',
          'w-[var(--spacing-10,2.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'h-[var(--spacing-12,3rem)]',
          'w-[var(--spacing-12,3rem)]',
          'text-[var(--text-lg,1.125rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
        ].join(' '),
        lg: [
          'h-[var(--spacing-14,3.5rem)]',
          'w-[var(--spacing-14,3.5rem)]',
          'text-[var(--text-xl,1.25rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the OTPInput component. */
export interface OTPInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof otpBoxVariants> {
  /** Number of OTP digits. @default 6 */
  length?: number;
  /** Visual variant of each box. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset for each box. */
  size?: 'sm' | 'default' | 'lg';
  /** Controlled value of the OTP. */
  value?: string;
  /** Default uncontrolled value. */
  defaultValue?: string;
  /** Called when any digit changes. Receives the full OTP string. */
  onChange?: (value: string) => void;
  /** Called when all digits are filled. */
  onComplete?: (value: string) => void;
  /** Whether the OTP input is disabled. */
  disabled?: boolean;
  /** Whether the input is in an error state. */
  error?: boolean;
  /** Error message displayed below the OTP input. */
  errorMessage?: string;
  /** Allowed character pattern (regex string). @default '\\d' */
  pattern?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * OTPInput — N-digit OTP input with individual character boxes, auto-focus
 * advancement, backspace navigation, and paste support.
 *
 * - forwardRef compatible
 * - ARIA role="group" with labeled boxes
 * - Keyboard navigation (arrow keys, backspace)
 * - Paste support fills all boxes from left
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link OTPInputProps}
 * @returns The rendered OTP input element.
 */
export const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  (
    {
      className,
      length = 6,
      variant,
      size,
      value: controlledValue,
      defaultValue = '',
      onChange,
      onComplete,
      disabled = false,
      error = false,
      errorMessage,
      pattern = '\\d',
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const regex = React.useMemo(() => new RegExp(`^${pattern}$`), [pattern]);

    const [internalValue, setInternalValue] = React.useState<string[]>(
      () => Array.from({ length }, (_, i) => defaultValue[i] ?? '')
    );

    const isControlled = controlledValue !== undefined;
    const digits = isControlled
      ? Array.from({ length }, (_, i) => controlledValue[i] ?? '')
      : internalValue;

    const setDigit = React.useCallback(
      (index: number, char: string) => {
        const next = [...digits];
        next[index] = char;
        const str = next.join('');

        if (!isControlled) setInternalValue(next);
        onChange?.(str);

        if (str.length === length && !str.includes('')) {
          onComplete?.(str);
        }
      },
      [digits, isControlled, length, onChange, onComplete]
    );

    const focusInput = React.useCallback((index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[clamped]?.focus();
    }, [length]);

    const handleChange = React.useCallback(
      (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // Take the last character typed (handles over-type in a single-char box)
        const char = raw[raw.length - 1] ?? '';

        if (char && !regex.test(char)) return;

        setDigit(index, char);

        if (char) {
          focusInput(index + 1);
        }
      },
      [regex, setDigit, focusInput]
    );

    const handleKeyDown = React.useCallback(
      (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
          if (!digits[index]) {
            // If current box is empty, move back and clear
            setDigit(index - 1, '');
            focusInput(index - 1);
          } else {
            setDigit(index, '');
          }
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          focusInput(index - 1);
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          focusInput(index + 1);
          e.preventDefault();
        }
      },
      [digits, setDigit, focusInput]
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').slice(0, length);

        const next = [...digits];
        for (let i = 0; i < pasted.length; i++) {
          if (regex.test(pasted[i])) {
            next[i] = pasted[i];
          }
        }

        const str = next.join('');
        if (!isControlled) setInternalValue(next);
        onChange?.(str);
        focusInput(Math.min(pasted.length, length - 1));

        if (!str.includes('') && str.length === length) {
          onComplete?.(str);
        }
      },
      [digits, length, regex, isControlled, onChange, onComplete, focusInput]
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
      },
      []
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div
          ref={ref}
          role="group"
          aria-label="One-time password"
          aria-describedby={error && errorMessage ? errorId : undefined}
          className={cn('flex gap-[var(--spacing-2,0.5rem)]', className)}
          {...props}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              id={`${id}-${i}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              aria-label={`Digit ${i + 1} of ${length}`}
              disabled={disabled}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={handleFocus}
              className={cn(
                otpBoxVariants({ variant, size }),
                error && 'border-[var(--destructive)]! focus:ring-[var(--destructive)]/20!'
              )}
            />
          ))}
        </div>

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

OTPInput.displayName = 'OTPInput';

export { otpBoxVariants };
