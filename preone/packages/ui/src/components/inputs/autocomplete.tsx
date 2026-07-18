/**
 * @preone/ui — Autocomplete
 *
 * A combobox with type-ahead search, keyboard navigation, and highlighted
 * match text.
 *
 * @example
 * ```tsx
 * <Autocomplete
 *   options={[{ value: 'apple', label: 'Apple' }, { value: 'banana', label: 'Banana' }]}
 *   onChange={(val) => console.log(val)}
 * />
 * ```
 *
 * @module autocomplete
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An option in the autocomplete. */
export interface AutocompleteOption {
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

const autocompleteVariants = cva(
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

/** Props for the Autocomplete component. */
export interface AutocompleteProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof autocompleteVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Available options. */
  options: AutocompleteOption[];
  /** Controlled value. */
  value?: string;
  /** Default value. */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onChange?: (value: string) => void;
  /** Called when the input text changes (for filtering). */
  onInputChange?: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Empty state message when no matches. */
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Highlight utility
// ---------------------------------------------------------------------------

/**
 * Highlights matching text within a label by wrapping the match in a <mark>.
 *
 * @param label - The full label text.
 * @param query - The search query to highlight.
 * @returns An array of React nodes with highlighted segments.
 */
function highlightMatch(label: string, query: string): React.ReactNode[] {
  if (!query) return [label];
  const lowerLabel = label.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  if (index === -1) return [label];

  const before = label.slice(0, index);
  const match = label.slice(index, index + query.length);
  const after = label.slice(index + query.length);

  return [
    before,
    <mark
      key="match"
      className="bg-[var(--primary)]/20 text-[var(--foreground)] rounded-[1px] px-[1px]"
    >
      {match}
    </mark>,
    after,
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Autocomplete — A combobox with type-ahead search and keyboard navigation.
 *
 * - forwardRef compatible
 * - Arrow keys navigate options, Enter selects, Escape closes
 * - Highlighted match text
 * - ARIA combobox role
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link AutocompleteProps}
 * @returns The rendered autocomplete component.
 */
export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      options,
      value: controlledValue,
      defaultValue = '',
      onChange,
      onInputChange,
      placeholder = 'Search…',
      emptyMessage = 'No results found',
      disabled,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;
    const listboxId = `${id}-listbox`;

    const [inputValue, setInputValue] = React.useState(
      () => String(controlledValue ?? defaultValue)
    );
    const isControlled = controlledValue !== undefined;
    const [open, setOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filtered = React.useMemo(() => {
      if (!inputValue) return options;
      const q = inputValue.toLowerCase();
      return options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
      );
    }, [options, inputValue]);

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

    const selectOption = React.useCallback(
      (option: AutocompleteOption) => {
        const display = option.label;
        setInputValue(display);
        if (!isControlled) onChange?.(option.value);
        else onChange?.(option.value);
        onInputChange?.(display);
        setOpen(false);
        setHighlightedIndex(-1);
      },
      [isControlled, onChange, onInputChange]
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onInputChange?.(val);
        setOpen(true);
        setHighlightedIndex(-1);
      },
      [onInputChange]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            setOpen(true);
            return;
          }
        }

        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault();
            const next = Math.min(highlightedIndex + 1, filtered.length - 1);
            setHighlightedIndex(next);
            break;
          }
          case 'ArrowUp': {
            e.preventDefault();
            const prev = Math.max(highlightedIndex - 1, 0);
            setHighlightedIndex(prev);
            break;
          }
          case 'Enter': {
            e.preventDefault();
            if (highlightedIndex >= 0 && filtered[highlightedIndex] && !filtered[highlightedIndex].disabled) {
              selectOption(filtered[highlightedIndex]);
            }
            break;
          }
          case 'Escape': {
            setOpen(false);
            setHighlightedIndex(-1);
            break;
          }
        }
      },
      [open, highlightedIndex, filtered, selectOption]
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div ref={containerRef} className="relative">
          <input
            ref={ref}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
            }
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            aria-autocomplete="list"
            disabled={disabled}
            value={inputValue}
            placeholder={placeholder}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            className={cn(autocompleteVariants({ variant, size, error }), className)}
            {...props}
          />

          {open && filtered.length > 0 && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Suggestions"
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
              {filtered.map((option, i) => (
                <div
                  key={option.value}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === highlightedIndex}
                  aria-disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) selectOption(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={cn(
                    'flex items-center',
                    'px-[var(--spacing-3,0.75rem)] py-[var(--spacing-2,0.5rem)]',
                    'text-[var(--text-sm,0.875rem)]',
                    'rounded-[var(--radius-md,0.5rem)]',
                    'cursor-pointer',
                    'transition-colors',
                    'disabled:opacity-50 disabled:pointer-events-none',
                    i === highlightedIndex && 'bg-[var(--accent)]',
                    option.disabled && 'opacity-50 pointer-events-none'
                  )}
                >
                  {highlightMatch(option.label, inputValue)}
                </div>
              ))}
            </div>
          )}

          {open && filtered.length === 0 && inputValue && (
            <div
              className={cn(
                'absolute z-50 mt-1 w-full',
                'bg-[var(--popover)]',
                'text-[var(--popover-foreground)]',
                'border border-[var(--border)]',
                'rounded-[var(--radius-lg,0.75rem)]',
                'shadow-[var(--shadow-lg)]',
                'px-[var(--spacing-3,0.75rem)] py-[var(--spacing-3,0.75rem)]',
                'text-[var(--text-sm,0.875rem)]',
                'text-[var(--muted-foreground)]'
              )}
            >
              {emptyMessage}
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

Autocomplete.displayName = 'Autocomplete';

export { autocompleteVariants };
