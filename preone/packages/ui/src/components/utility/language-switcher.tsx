/**
 * @preone/ui — LanguageSwitcher Component
 *
 * A language selector dropdown with a Globe icon from Lucide,
 * showing the current language and providing a dropdown to select
 * from available languages.
 *
 * Features:
 * - **Globe icon**: Visual indicator for language selection
 * - **Current language display**: Shows the active language label
 * - **Dropdown selection**: List of available languages
 * - **Controlled & Uncontrolled**: Supports both `value` prop and internal state
 * - **Variants**: default, outline, ghost
 * - **Sizes**: sm, default, lg
 * - **forwardRef**: Full ref forwarding to the trigger button
 * - **ARIA**: Proper combobox/listbox pattern via Radix
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
 * import { LanguageSwitcher } from '@preone/ui';
 *
 * const languages = [
 *   { code: 'en', label: 'English' },
 *   { code: 'ko', label: '한국어' },
 *   { code: 'ja', label: '日本語' },
 *   { code: 'zh', label: '中文' },
 * ];
 *
 * <LanguageSwitcher
 *   languages={languages}
 *   value="en"
 *   onChange={(code) => setLocale(code)}
 * />
 *
 * <LanguageSwitcher
 *   languages={languages}
 *   variant="ghost"
 *   size="sm"
 * />
 * ```
 *
 * @module language-switcher
 */

import * as React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { cva, type VariantProps } from 'class-variance-authority';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A language option in the language switcher. */
export interface LanguageOption {
  /** ISO 639-1 language code (e.g., 'en', 'ko', 'ja'). */
  code: string;
  /** Human-readable language label (e.g., 'English', '한국어'). */
  label: string;
  /** Optional short label for compact display (e.g., 'EN', 'KR'). */
  shortLabel?: string;
}

/** Visual style variant for the LanguageSwitcher. */
export type LanguageSwitcherVariant = 'default' | 'outline' | 'ghost';

/** Size variant for the LanguageSwitcher. */
export type LanguageSwitcherSize = 'sm' | 'default' | 'lg';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * LanguageSwitcher trigger variant definitions.
 *
 * CSS Variable Reference:
 * - `--primary` / `--primary-foreground` — default action colour
 * - `--secondary` / `--secondary-foreground` — secondary action colour
 * - `--accent` / `--accent-foreground` — accent / hover colour
 * - `--foreground` — text colour
 * - `--muted-foreground` — muted text colour
 * - `--border` — border colour
 * - `--ring` — focus ring colour
 * - `--radius-lg` — border radius
 * - `--shadow-sm` — shadow token
 * - `--duration-fast` — transition duration
 * - `--ease-default` — transition easing
 */
export const languageSwitcherVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'font-medium',
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
        ].join(' '),

        /** Outline — bordered, no fill. */
        outline: [
          'border border-[var(--border)] bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
        ].join(' '),

        /** Ghost — no border, no fill. */
        ghost: [
          'bg-transparent text-[var(--foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
          'focus-visible:ring-[var(--ring)]',
        ].join(' '),
      },

      size: {
        /** Small — compact. */
        sm: 'h-8 px-2.5 text-[var(--text-sm)] rounded-[var(--radius-md)]',

        /** Default — standard. */
        default: 'h-10 px-4 text-[var(--text-sm)] rounded-[var(--radius-lg)]',

        /** Large — prominent. */
        lg: 'h-12 px-5 text-[var(--text-base)] rounded-[var(--radius-lg)]',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the LanguageSwitcher component. */
export interface LanguageSwitcherProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Array of available languages to select from. */
  languages: LanguageOption[];
  /**
   * The code of the currently selected language (controlled).
   * When omitted, the component manages its own state.
   */
  value?: string;
  /**
   * Default language code for uncontrolled usage.
   * Falls back to the first language's code if not provided.
   */
  defaultValue?: string;
  /**
   * Callback fired when the user selects a new language.
   * @param code - The `code` of the newly selected language.
   */
  onChange?: (code: string) => void;
  /**
   * Visual variant.
   * @default 'default'
   */
  variant?: LanguageSwitcherVariant;
  /**
   * Size preset.
   * @default 'default'
   */
  size?: LanguageSwitcherSize;
  /**
   * Whether to show the Globe icon.
   * @default true
   */
  showGlobe?: boolean;
  /**
   * Whether to use short labels for the trigger display.
   * @default false
   */
  compact?: boolean;
  /**
   * Whether the switcher is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * Placeholder text when no language is selected.
   * @default 'Language'
   */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LanguageSwitcher — A dropdown language selector with a Globe icon.
 *
 * Wraps @radix-ui/react-select with PreOne design system styling.
 * Displays the current language with an optional Globe icon and
 * a dropdown list of available languages.
 *
 * **Accessibility:**
 * - Full ARIA combobox/listbox pattern via Radix Select
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Type-ahead search in the dropdown
 * - `aria-label` on the trigger for screen readers
 *
 * @param props - {@link LanguageSwitcherProps}
 * @param ref - Forwarded ref to the container div.
 * @returns The rendered language switcher.
 */
export const LanguageSwitcher = React.forwardRef<
  HTMLDivElement,
  LanguageSwitcherProps
>(
  (
    {
      className,
      languages,
      value: valueProp,
      defaultValue,
      onChange,
      variant = 'default',
      size = 'default',
      showGlobe = true,
      compact = false,
      disabled = false,
      placeholder = 'Language',
      ...props
    },
    ref,
  ) => {
    const isControlled = valueProp !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(
      defaultValue ?? languages[0]?.code ?? '',
    );
    const selectedCode = isControlled ? valueProp : internalValue;

    const selectedLanguage = languages.find((lang) => lang.code === selectedCode);

    const handleChange = React.useCallback(
      (code: string) => {
        if (!isControlled) {
          setInternalValue(code);
        }
        onChange?.(code);
      },
      [isControlled, onChange],
    );

    const displayLabel = selectedLanguage
      ? compact && selectedLanguage.shortLabel
        ? selectedLanguage.shortLabel
        : selectedLanguage.label
      : placeholder;

    return (
      <div
        ref={ref}
        className={cn('inline-flex', className)}
        {...props}
      >
        <RadixSelect.Root
          value={selectedCode}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <RadixSelect.Trigger
            className={cn(
              languageSwitcherVariants({ variant, size }),
            )}
            aria-label="Select language"
          >
            {showGlobe && (
              <Globe
                className={cn(
                  'shrink-0',
                  'text-[var(--muted-foreground)]',
                  size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
                )}
                aria-hidden="true"
              />
            )}
            <RadixSelect.Value>
              {displayLabel}
            </RadixSelect.Value>
            <RadixSelect.Icon asChild>
              <ChevronDown
                className={cn(
                  'shrink-0',
                  'text-[var(--muted-foreground)]',
                  'transition-transform',
                  'duration-[var(--duration-fast,150ms)]',
                  size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
                )}
                aria-hidden="true"
              />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              className={cn(
                'z-50',
                'min-w-[8rem]',
                'overflow-hidden',
                'rounded-[var(--radius-lg,0.75rem)]',
                'bg-[var(--popover)]',
                'text-[var(--popover-foreground)]',
                'shadow-[var(--shadow-sm)]',
                'border border-[var(--border)]',
                'data-[state=open]:animate-in',
                'data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0',
                'data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95',
                'data-[state=open]:zoom-in-95',
              )}
              position="popper"
              sideOffset={4}
              align="center"
            >
              <RadixSelect.Viewport
                className={cn(
                  'p-1',
                  'max-h-64',
                )}
              >
                {languages.map((language) => (
                  <RadixSelect.Item
                    key={language.code}
                    value={language.code}
                    className={cn(
                      'relative',
                      'flex',
                      'w-full',
                      'cursor-pointer',
                      'select-none',
                      'items-center',
                      'gap-2',
                      'rounded-[var(--radius-md,0.5rem)]',
                      'py-2',
                      'pl-8',
                      'pr-3',
                      'text-[var(--text-sm)]',
                      'outline-none',
                      'transition-colors',
                      'duration-[var(--duration-fast,150ms)]',
                      'hover:bg-[var(--accent)]',
                      'hover:text-[var(--accent-foreground)]',
                      'focus:bg-[var(--accent)]',
                      'focus:text-[var(--accent-foreground)]',
                      'data-[disabled]:pointer-events-none',
                      'data-[disabled]:opacity-50',
                    )}
                  >
                    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                      <RadixSelect.ItemIndicator>
                        <Check
                          className="h-4 w-4 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                      </RadixSelect.ItemIndicator>
                    </span>
                    <RadixSelect.ItemText>
                      <span className="font-medium">{language.label}</span>
                      {language.shortLabel && (
                        <span className="ml-2 text-[var(--muted-foreground)] text-[var(--text-xs)]">
                          {language.shortLabel}
                        </span>
                      )}
                    </RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      </div>
    );
  },
);

LanguageSwitcher.displayName = 'LanguageSwitcher';
