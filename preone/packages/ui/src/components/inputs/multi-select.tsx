/**
 * @preone/ui — Multi-Select
 *
 * A multi-select component with chips/tags for selected items, individual
 * item removal, and a clear-all button.
 *
 * @example
 * ```tsx
 * <MultiSelect
 *   options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]}
 *   onChange={(vals) => console.log(vals)}
 * />
 * ```
 *
 * @module multi-select
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An option in the multi-select. */
export interface MultiSelectOption {
  /** Unique value. */
  value: string;
  /** Display label. */
  label: string;
  /** Whether the option is disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const multiSelectVariants = cva(
  [
    'flex w-full items-center flex-wrap',
    'gap-[var(--spacing-1,0.25rem)]',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
    'cursor-pointer',
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
          'focus-within:border-[var(--ring)]',
          'focus-within:ring-2',
          'focus-within:ring-[var(--ring)]/20',
          'shadow-[var(--shadow-inner)]',
        ].join(' '),
        filled: [
          'bg-[var(--muted)]',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus-within:bg-transparent',
          'focus-within:border-[var(--ring)]',
          'focus-within:ring-2',
          'focus-within:ring-[var(--ring)]/20',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border',
          'border-transparent',
          'text-[var(--foreground)]',
          'hover:bg-[var(--accent)]',
          'focus-within:bg-[var(--accent)]',
          'focus-within:ring-2',
          'focus-within:ring-[var(--ring)]/20',
        ].join(' '),
      },
      size: {
        sm: [
          'min-h-[var(--spacing-8,2rem)]',
          'px-[var(--spacing-2,0.5rem)]',
          'py-[var(--spacing-1,0.25rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        default: [
          'min-h-[var(--spacing-10,2.5rem)]',
          'px-[var(--spacing-3,0.75rem)]',
          'py-[var(--spacing-1.5,0.375rem)]',
          'text-[var(--text-sm,0.875rem)]',
          'rounded-[var(--radius-md,0.5rem)]',
        ].join(' '),
        lg: [
          'min-h-[var(--spacing-12,3rem)]',
          'px-[var(--spacing-4,1rem)]',
          'py-[var(--spacing-2,0.5rem)]',
          'text-[var(--text-base,1rem)]',
          'rounded-[var(--radius-lg,0.75rem)]',
        ].join(' '),
      },
      error: {
        true: [
          'border-[var(--destructive)]!',
          'focus-within:ring-[var(--destructive)]/20!',
          'focus-within:border-[var(--destructive)]!',
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

/** Props for the MultiSelect component. */
export interface MultiSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof multiSelectVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Placeholder text. */
  placeholder?: string;
  /** Available options. */
  options: MultiSelectOption[];
  /** Controlled selected values. */
  value?: string[];
  /** Default selected values (uncontrolled). */
  defaultValue?: string[];
  /** Called when the selected values change. */
  onChange?: (values: string[]) => void;
  /** Whether the multi-select is disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MultiSelect — A multi-select with chips/tags for selected items.
 *
 * - forwardRef compatible
 * - Remove individual items via chip X button
 * - Clear all button
 * - ARIA listbox with options
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link MultiSelectProps}
 * @returns The rendered multi-select component.
 */
export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      placeholder = 'Select…',
      options,
      value: controlledValue,
      defaultValue = [],
      onChange,
      disabled = false,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;
    const listboxId = `${id}-listbox`;

    const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue);
    const isControlled = controlledValue !== undefined;
    const selected = isControlled ? controlledValue : internalValue;

    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleValue = React.useCallback(
      (val: string) => {
        const next = selected.includes(val)
          ? selected.filter((v) => v !== val)
          : [...selected, val];
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [selected, isControlled, onChange]
    );

    const removeValue = React.useCallback(
      (val: string) => {
        const next = selected.filter((v) => v !== val);
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [selected, isControlled, onChange]
    );

    const clearAll = React.useCallback(() => {
      if (!isControlled) setInternalValue([]);
      onChange?.([]);
    }, [isControlled, onChange]);

    const labelMap = React.useMemo(
      () => Object.fromEntries(options.map((o) => [o.value, o.label])),
      [options]
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div ref={containerRef} className="relative">
          {/* Trigger area */}
          <div
            ref={ref}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            tabIndex={0}
            onClick={() => !disabled && setOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!disabled) setOpen((prev) => !prev);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            className={cn(
              multiSelectVariants({ variant, size, error }),
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          >
            {selected.length === 0 && (
              <span className="text-[var(--muted-foreground)] pointer-events-none">
                {placeholder}
              </span>
            )}

            {selected.map((val) => (
              <span
                key={val}
                className={cn(
                  'inline-flex items-center gap-[var(--spacing-1,0.25rem)]',
                  'bg-[var(--primary)]/10',
                  'text-[var(--primary)]',
                  'rounded-[var(--radius-sm,0.125rem)]',
                  'px-[var(--spacing-2,0.5rem)]',
                  'py-[var(--spacing-0.5,0.125rem)]',
                  'text-[var(--text-sm,0.875rem)]',
                  'font-medium'
                )}
              >
                {labelMap[val] ?? val}
                <button
                  type="button"
                  aria-label={`Remove ${labelMap[val] ?? val}`}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(val);
                  }}
                  className="hover:text-[var(--destructive)] transition-colors focus:outline-none"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}

            <div className="ml-auto flex items-center gap-[var(--spacing-1,0.25rem)] shrink-0">
              {selected.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear all"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors focus:outline-none"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
              <ChevronDown
                size={size === 'lg' ? 20 : 16}
                className="text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Dropdown */}
          {open && (
            <div
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-label="Options"
              className={cn(
                'absolute z-50 mt-1 w-full',
                'bg-[var(--popover)]',
                'text-[var(--popover-foreground)]',
                'border border-[var(--border)]',
                'rounded-[var(--radius-lg,0.75rem)]',
                'shadow-[var(--shadow-lg)]',
                'max-h-[var(--spacing-60,15rem)]',
                'overflow-y-auto',
                'p-[var(--spacing-1,0.25rem)]'
              )}
            >
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      toggleValue(option.value);
                    }}
                    className={cn(
                      'flex w-full items-center gap-[var(--spacing-2,0.5rem)]',
                      'px-[var(--spacing-3,0.75rem)] py-[var(--spacing-2,0.5rem)]',
                      'text-[var(--text-sm,0.875rem)]',
                      'rounded-[var(--radius-md,0.5rem)]',
                      'hover:bg-[var(--accent)]',
                      'focus:bg-[var(--accent)]',
                      'focus:outline-none',
                      'transition-colors',
                      'disabled:opacity-50 disabled:pointer-events-none',
                      isSelected && 'bg-[var(--accent)]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[var(--spacing-4,1rem)] w-[var(--spacing-4,1rem)] items-center justify-center',
                        'rounded-[var(--radius-sm,0.125rem)]',
                        'border border-[var(--input)]',
                        'transition-colors',
                        isSelected && 'bg-[var(--primary)] border-[var(--primary)]'
                      )}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          className="text-[var(--primary-foreground)]"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 5L4 7L8 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
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

MultiSelect.displayName = 'MultiSelect';

export { multiSelectVariants };
