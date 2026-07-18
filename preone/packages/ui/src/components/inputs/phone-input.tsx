/**
 * @preone/ui — Phone Input
 *
 * A phone number input with a country code selector prefix dropdown.
 * Uses a combobox-style dropdown for searching and selecting country codes.
 *
 * @example
 * ```tsx
 * <PhoneInput defaultCountry="US" onChange={(val) => console.log(val)} />
 * <PhoneInput variant="filled" size="lg" />
 * ```
 *
 * @module phone-input
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Country Data
// ---------------------------------------------------------------------------

/** A country entry for the phone input. */
export interface CountryEntry {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Display name. */
  name: string;
  /** Dial code (e.g. "+1"). */
  dial: string;
  /** Flag emoji. */
  flag: string;
}

/** Commonly used countries. Extend as needed. */
export const defaultCountries: CountryEntry[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
];

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const phoneInputVariants = cva(
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the PhoneInput component. */
export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'>,
    VariantProps<typeof phoneInputVariants> {
  /** Visual variant. */
  variant?: 'default' | 'filled' | 'ghost';
  /** Size preset. */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the field is in an error state. */
  error?: boolean;
  /** Error message displayed below the field. */
  errorMessage?: string;
  /** Default country code (ISO alpha-2). */
  defaultCountry?: string;
  /** Country list. Defaults to {@link defaultCountries}. */
  countries?: CountryEntry[];
  /** Called with the full phone value (dial + number). */
  onChange?: (value: string) => void;
  /** Called when the selected country changes. */
  onCountryChange?: (country: CountryEntry) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PhoneInput — A phone number input with a country code selector prefix.
 *
 * - forwardRef compatible
 * - Combobox-style dropdown for country codes with search
 * - ARIA attributes for accessibility
 * - Dark mode via CSS variables
 * - Design token driven
 *
 * @param props - {@link PhoneInputProps}
 * @returns The rendered phone input element.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      errorMessage,
      defaultCountry = 'US',
      countries = defaultCountries,
      onChange,
      onCountryChange,
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
    const triggerId = `${id}-trigger`;

    const [selected, setSelected] = React.useState<CountryEntry>(() =>
      countries.find((c) => c.code === defaultCountry) ?? countries[0]
    );
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);

    const filtered = React.useMemo(
      () =>
        countries.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.dial.includes(search) ||
            c.code.toLowerCase().includes(search.toLowerCase())
        ),
      [countries, search]
    );

    // Close dropdown on outside click
    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    React.useEffect(() => {
      if (open && searchRef.current) {
        searchRef.current.focus();
      }
    }, [open]);

    const handleSelect = React.useCallback(
      (country: CountryEntry) => {
        setSelected(country);
        setOpen(false);
        setSearch('');
        onCountryChange?.(country);
      },
      [onCountryChange]
    );

    const handlePhoneChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPhoneNumber(val);
        onChange?.(`${selected.dial}${val}`);
      },
      [selected.dial, onChange]
    );

    return (
      <div className="flex w-full flex-col gap-[var(--spacing-1,0.25rem)]">
        <div
          ref={containerRef}
          className={cn(
            'flex items-stretch',
            'border',
            variant === 'filled' ? 'border-transparent bg-[var(--muted)]' : 'border-[var(--input)]',
            error && 'border-[var(--destructive)]!',
            'rounded-[var(--radius-md,0.5rem)]',
            'overflow-hidden',
            'focus-within:ring-2',
            error ? 'focus-within:ring-[var(--destructive)]/20' : 'focus-within:ring-[var(--ring)]/20',
            size === 'lg' && 'rounded-[var(--radius-lg,0.75rem)]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Country code trigger */}
          <button
            id={triggerId}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-[var(--spacing-1,0.25rem)]',
              'border-r border-[var(--input)]',
              variant === 'filled' ? 'bg-[var(--muted)]' : 'bg-[var(--muted)]/50',
              'px-[var(--spacing-2,0.5rem)]',
              'text-[var(--text-sm,0.875rem)]',
              'text-[var(--foreground)]',
              'hover:bg-[var(--accent)]',
              'transition-colors',
              'whitespace-nowrap',
              'focus:outline-none'
            )}
          >
            <span aria-hidden="true">{selected.flag}</span>
            <span>{selected.dial}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {/* Phone number input */}
          <input
            ref={ref}
            id={id}
            type="tel"
            aria-invalid={error || undefined}
            aria-describedby={error && errorMessage ? errorId : undefined}
            disabled={disabled}
            value={phoneNumber}
            onChange={handlePhoneChange}
            className={cn(
              'flex-1 outline-none bg-transparent',
              'text-[var(--foreground)]',
              'placeholder:text-[var(--muted-foreground)]',
              'font-[family-name:var(--font-sans,Inter)]',
              size === 'sm' && 'px-[var(--spacing-2,0.5rem)] text-[var(--text-sm,0.875rem)] h-[var(--spacing-8,2rem)]',
              size === 'default' && 'px-[var(--spacing-3,0.75rem)] text-[var(--text-sm,0.875rem)] h-[var(--spacing-10,2.5rem)]',
              size === 'lg' && 'px-[var(--spacing-4,1rem)] text-[var(--text-base,1rem)] h-[var(--spacing-12,3rem)]',
              className
            )}
            {...props}
          />

          {/* Dropdown */}
          {open && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Select country"
              className={cn(
                'absolute z-50 mt-1',
                'w-[280px]',
                'bg-[var(--popover)]',
                'text-[var(--popover-foreground)]',
                'border border-[var(--border)]',
                'rounded-[var(--radius-lg,0.75rem)]',
                'shadow-[var(--shadow-lg)]',
                'max-h-[240px]',
                'overflow-hidden',
                'flex flex-col'
              )}
              style={{ top: '100%', left: 0 }}
            >
              {/* Search box */}
              <div className="p-[var(--spacing-2,0.5rem)] border-b border-[var(--border)]">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-[var(--spacing-2,0.5rem)] top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country…"
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

              {/* Options */}
              <div className="overflow-y-auto max-h-[180px] p-[var(--spacing-1,0.25rem)]">
                {filtered.length === 0 && (
                  <div className="px-[var(--spacing-3,0.75rem)] py-[var(--spacing-2,0.5rem)] text-[var(--text-sm,0.875rem)] text-[var(--muted-foreground)]">
                    No countries found
                  </div>
                )}
                {filtered.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={country.code === selected.code}
                    onClick={() => handleSelect(country)}
                    className={cn(
                      'flex w-full items-center gap-[var(--spacing-2,0.5rem)]',
                      'px-[var(--spacing-3,0.75rem)] py-[var(--spacing-2,0.5rem)]',
                      'text-[var(--text-sm,0.875rem)]',
                      'rounded-[var(--radius-md,0.5rem)]',
                      'hover:bg-[var(--accent)]',
                      'focus:bg-[var(--accent)]',
                      'focus:outline-none',
                      'transition-colors',
                      country.code === selected.code && 'bg-[var(--accent)] font-medium'
                    )}
                  >
                    <span aria-hidden="true">{country.flag}</span>
                    <span className="flex-1 text-left">{country.name}</span>
                    <span className="text-[var(--muted-foreground)]">{country.dial}</span>
                  </button>
                ))}
              </div>
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

PhoneInput.displayName = 'PhoneInput';

export { phoneInputVariants };
