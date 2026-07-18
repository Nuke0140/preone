/**
 * @preone/ui — Select
 *
 * A select dropdown built on @radix-ui/react-select with variant styling
 * matching the input system, and optional searchable options.
 *
 * @example
 * ```tsx
 * <Select options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]} />
 * <Select searchable variant="filled" size="lg" placeholder="Pick a fruit…" />
 * ```
 *
 * @module select
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const selectTriggerVariants = cva(
  [
    'flex w-full items-center justify-between',
    'outline-none',
    'transition-all',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'font-[family-name:var(--font-sans,Inter)]',
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An option in the select dropdown. */
export interface SelectOption {
  /** Unique value. */
  value: string;
  /** Display label. */
  label: string;
  /** Whether the option is disabled. */
  disabled?: boolean;
}

/** Props for the Select component. */
export interface SelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof selectTriggerVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Placeholder text when no value is selected. */
  placeholder?: string;
  /** Available options. */
  options: SelectOption[];
  /** Controlled value. */
  value?: string;
  /** Default value (uncontrolled). */
  defaultValue?: string;
  /** Called when the selected value changes. */
  onChange?: (value: string) => void;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Name attribute for forms. */
  name?: string;
  /** Enable search/filter in dropdown. */
  searchable?: boolean;
  /** Label for accessibility. */
  label?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Select — A select dropdown using @radix-ui/react-select.
 *
 * - forwardRef compatible
 * - Searchable option filtering
 * - ARIA attributes via Radix primitives
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link SelectProps}
 * @returns The rendered select component.
 */
export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      placeholder = 'Select…',
      options,
      value,
      defaultValue,
      onChange,
      disabled = false,
      name,
      searchable = false,
      label,
      id: propId,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const id = propId ?? autoId;
    const errorId = `${id}-error`;

    const [searchQuery, setSearchQuery] = React.useState('');
    const searchRef = React.useRef<HTMLInputElement>(null);

    const filteredOptions = React.useMemo(() => {
      if (!searchable || !searchQuery) return options;
      const q = searchQuery.toLowerCase();
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, searchable, searchQuery]);

    const iconSize = size === 'lg' ? 20 : 16;

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={disabled}
          name={name}
        >
          <SelectPrimitive.Trigger
            ref={ref as React.Ref<HTMLButtonElement>}
            id={id}
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            aria-label={label}
            className={cn(
              selectTriggerVariants({ variant, size, error }),
              '[&[data-placeholder]]:text-[var(--muted-foreground)]',
              className
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown size={iconSize} className="text-[var(--muted-foreground)] shrink-0" aria-hidden="true" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className={cn(
                'z-50',
                'min-w-[var(--spacing-56,14rem)]',
                'bg-[var(--popover)]',
                'text-[var(--popover-foreground)]',
                'border border-[var(--border)]',
                'rounded-[var(--radius-lg,0.75rem)]',
                'shadow-[var(--shadow-lg)]',
                'overflow-hidden',
                'animate-in fade-in-0 zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=top]:slide-in-from-bottom-2'
              )}
            >
              {/* Search field */}
              {searchable && (
                <div className="border-b border-[var(--border)] p-[var(--spacing-2,0.5rem)]">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-[var(--spacing-2,0.5rem)] top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search…"
                      className={cn(
                        'w-full h-[var(--spacing-8,2rem)] pl-[var(--spacing-7,1.75rem)] pr-[var(--spacing-2,0.5rem)]',
                        'bg-[var(--muted)]',
                        'border border-[var(--input)]',
                        'rounded-[var(--radius-md,0.5rem)]',
                        'text-[var(--text-sm,0.875rem)]',
                        'outline-none',
                        'placeholder:text-[var(--muted-foreground)]'
                      )}
                    />
                  </div>
                </div>
              )}

              <SelectPrimitive.Viewport className="p-[var(--spacing-1,0.25rem)] max-h-[var(--spacing-60,15rem)]">
                {filteredOptions.length === 0 && (
                  <div className="px-[var(--spacing-3,0.75rem)] py-[var(--spacing-2,0.5rem)] text-[var(--text-sm,0.875rem)] text-[var(--muted-foreground)]">
                    No options found
                  </div>
                )}
                {filteredOptions.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      'relative flex cursor-pointer items-center',
                      'rounded-[var(--radius-md,0.5rem)]',
                      'py-[var(--spacing-2,0.5rem)]',
                      'pl-[var(--spacing-8,2rem)]',
                      'pr-[var(--spacing-2,0.5rem)]',
                      'text-[var(--text-sm,0.875rem)]',
                      'outline-none',
                      'transition-colors',
                      'hover:bg-[var(--accent)]',
                      'focus:bg-[var(--accent)]',
                      'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                      'data-[highlighted]:bg-[var(--accent)]'
                    )}
                  >
                    <span className="absolute left-[var(--spacing-2,0.5rem)] flex items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check size={16} className="text-[var(--primary)]" aria-hidden="true" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

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

Select.displayName = 'Select';

export { selectTriggerVariants };
