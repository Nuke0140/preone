import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for FormSection styling.
 */
export type FormSectionVariant = 'default' | 'card' | 'bordered';

/**
 * Sizes for FormSection.
 */
export type FormSectionSize = 'sm' | 'md' | 'lg';

/**
 * Props for the FormSection component.
 */
export interface FormSectionProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  /** Section title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Visual variant */
  variant?: FormSectionVariant;
  /** Size */
  size?: FormSectionSize;
  /** Whether the section is disabled */
  disabled?: boolean;
  /** Whether the section is loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Section icon */
  icon?: React.ReactNode;
  /** Actions slot (e.g., edit button) */
  actions?: React.ReactNode;
}

const variantStyles: Record<FormSectionVariant, string> = {
  default: '',
  card:
    'rounded-lg border border-[var(--preone-border)] bg-[var(--preone-surface)] p-6 shadow-sm',
  bordered:
    'border-l-4 border-[var(--preone-color-primary)] pl-4',
};

const sizeStyles: Record<FormSectionSize, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const titleSizeStyles: Record<FormSectionSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * PreOne FormSection component for grouping form fields with a
 * title and optional description. Supports variants, sizes,
 * disabled/loading/dark modes, and ARIA grouping.
 *
 * @example
 * ```tsx
 * <FormSection title="Personal Info" description="Your basic details">
 *   <FormField name="firstName">...</FormField>
 *   <FormField name="lastName">...</FormField>
 * </FormSection>
 * ```
 */
export const FormSection = React.forwardRef<HTMLFieldSetElement, FormSectionProps>(
  (
    {
      title,
      description,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      icon,
      actions,
      className,
      children,
      ...props
    },
    ref: React.Ref<HTMLFieldSetElement>,
  ) => {
    const sectionId = React.useId();
    const descriptionId = description ? `${sectionId}-desc` : undefined;

    return (
      <fieldset
        ref={ref}
        className={cn(
          'flex flex-col',
          variantStyles[variant],
          sizeStyles[size],
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        disabled={disabled}
        aria-busy={loading}
        aria-describedby={descriptionId}
        data-section-variant={variant}
        data-section-size={size}
        data-dark={dark || undefined}
        {...(props as React.HTMLAttributes<HTMLFieldSetElement>)}
      >
        <div className="flex items-center justify-between">
          <legend
            className={cn(
              'font-semibold text-[var(--preone-text-primary)] flex items-center gap-2',
              titleSizeStyles[size],
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {title}
          </legend>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {description && (
          <p
            id={descriptionId}
            className={cn(
              'text-sm text-[var(--preone-text-secondary)]',
              dark && 'text-[var(--preone-text-secondary-dark)]',
            )}
          >
            {description}
          </p>
        )}

        <div className={cn('flex flex-col', sizeStyles[size], loading && 'animate-pulse')}>
          {children}
        </div>
      </fieldset>
    );
  },
);

FormSection.displayName = 'FormSection';
