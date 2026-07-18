/**
 * @preone/ui — Search Input
 *
 * A search input with a search icon prefix, clear button, keyboard shortcut
 * hint (⌘K), and optional debounced onChange.
 *
 * @example
 * ```tsx
 * <SearchInput placeholder="Search…" onSearch={(q) => fetch(q)} debounceMs={300} />
 * <SearchInput shortcutHint />
 * ```
 *
 * @module search-input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const searchInputVariants = cva(
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
    'pl-[var(--spacing-10,2.5rem)]',
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
          'pr-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'h-[var(--spacing-10,2.5rem)]',
          'pr-[var(--spacing-3,0.75rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        lg: [
          'h-[var(--spacing-12,3rem)]',
          'pr-[var(--spacing-4,1rem)]',
          'text-[var(--text-base,1rem)]',
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

/** Props for the SearchInput component. */
export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof searchInputVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Show ⌘K keyboard shortcut hint. */
  shortcutHint?: boolean;
  /** Debounce delay in milliseconds for the onSearch callback. @default 0 */
  debounceMs?: number;
  /** Called with the search query (debounced if debounceMs > 0). */
  onSearch?: (value: string) => void;
  /** Standard change handler (not debounced). */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Called when the clear button is clicked. */
  onClear?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SearchInput — A search input with search icon prefix, clear button,
 * keyboard shortcut hint, and optional debounced onChange.
 *
 * - forwardRef compatible
 * - ARIA role="search" container
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link SearchInputProps}
 * @returns The rendered search input element.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      shortcutHint = false,
      debounceMs = 0,
      onSearch,
      onChange,
      onClear,
      disabled,
      value: controlledValue,
      defaultValue,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const [internalValue, setInternalValue] = React.useState(
      () => String(controlledValue ?? defaultValue ?? '')
    );
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? String(controlledValue) : internalValue;

    const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!isControlled) setInternalValue(val);
        onChange?.(e);

        if (onSearch) {
          if (timerRef.current) clearTimeout(timerRef.current);
          if (debounceMs > 0) {
            timerRef.current = setTimeout(() => onSearch(val), debounceMs);
          } else {
            onSearch(val);
          }
        }
      },
      [isControlled, onChange, onSearch, debounceMs]
    );

    // Cleanup timer on unmount
    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const handleClear = React.useCallback(() => {
      if (!isControlled) setInternalValue('');
      onClear?.();
      onSearch?.('');
    }, [isControlled, onClear, onSearch]);

    const hasValue = currentValue.length > 0;

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div role="search" className="relative w-full">
          {/* Search icon */}
          <span
            className={cn(
              'pointer-events-none absolute left-0 top-0 flex h-full items-center',
              'pl-[var(--spacing-3,0.75rem)]',
              'text-[var(--muted-foreground)]'
            )}
          >
            <Search size={size === 'lg' ? 20 : 16} aria-hidden="true" />
          </span>

          <input
            ref={ref}
            id={id}
            type="search"
            role="searchbox"
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            disabled={disabled}
            value={isControlled ? controlledValue : internalValue}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={handleChange}
            className={cn(
              searchInputVariants({ variant, size }),
              hasValue && shortcutHint && 'pr-[var(--spacing-20,5rem)]',
              !hasValue && shortcutHint && 'pr-[var(--spacing-14,3.5rem)]',
              !shortcutHint && hasValue && 'pr-[var(--spacing-10,2.5rem)]',
              error && 'border-[var(--destructive)]! focus:ring-[var(--destructive)]/20!',
              className
            )}
            {...props}
          />

          {/* Clear button */}
          {hasValue && (
            <button
              type="button"
              aria-label="Clear search"
              tabIndex={-1}
              onClick={handleClear}
              disabled={disabled}
              className={cn(
                'absolute right-0 top-0 flex h-full items-center',
                shortcutHint ? 'pr-[var(--spacing-14,3.5rem)]' : 'pr-[var(--spacing-3,0.75rem)]',
                'text-[var(--muted-foreground)]',
                'hover:text-[var(--foreground)]',
                'transition-colors',
                'focus:outline-none'
              )}
            >
              <X size={size === 'lg' ? 18 : 14} aria-hidden="true" />
            </button>
          )}

          {/* Keyboard shortcut hint */}
          {shortcutHint && (
            <span
              className={cn(
                'absolute right-0 top-0 flex h-full items-center',
                'pr-[var(--spacing-3,0.75rem)]',
                'pointer-events-none',
                'text-[var(--text-xs,0.75rem)]',
                'text-[var(--muted-foreground)]',
                'border border-[var(--border)]',
                'rounded-[var(--radius-sm,0.125rem)]',
                'px-[var(--spacing-1.5,0.375rem)]',
                'py-[var(--spacing-0.5,0.125rem)]',
                'mr-[var(--spacing-2,0.5rem)]'
              )}
              aria-hidden="true"
            >
              ⌘K
            </span>
          )}
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

SearchInput.displayName = 'SearchInput';

export { searchInputVariants };
