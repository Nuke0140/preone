import * as React from 'react';
import { Controller, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Variants for AddressField styling.
 */
export type AddressFieldVariant = 'default' | 'outlined' | 'filled';

/**
 * Sizes for AddressField.
 */
export type AddressFieldSize = 'sm' | 'md' | 'lg';

/**
 * Address data structure.
 */
export interface AddressData {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/**
 * Country option.
 */
export interface CountryOption {
  code: string;
  label: string;
}

const defaultCountries: CountryOption[] = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'AU', label: 'Australia' },
  { code: 'JP', label: 'Japan' },
  { code: 'CN', label: 'China' },
  { code: 'IN', label: 'India' },
  { code: 'BR', label: 'Brazil' },
];

/**
 * Props for the AddressField component.
 */
export interface AddressFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Form instance from useForm */
  form: UseFormReturn<T>;
  /** Base field name (e.g., "address" — sub-fields will be address.street, etc.) */
  name: TName;
  /** Label text for the address group */
  label?: string;
  /** Visual variant */
  variant?: AddressFieldVariant;
  /** Size */
  size?: AddressFieldSize;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Available countries */
  countries?: CountryOption[];
  /** Show street line 2 */
  showStreet2?: boolean;
  /** Layout mode */
  layout?: 'stacked' | 'grid';
}

const inputVariantStyles: Record<AddressFieldVariant, string> = {
  default:
    'border border-[var(--preone-border)] bg-[var(--preone-surface)] rounded-md',
  outlined:
    'border-2 border-[var(--preone-border)] bg-transparent rounded-md',
  filled:
    'border-b-2 border-[var(--preone-border)] bg-[var(--preone-surface-secondary)] rounded-t-md',
};

const inputSizeStyles: Record<AddressFieldSize, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-base px-3',
  lg: 'h-12 text-lg px-4',
};

/**
 * PreOne AddressField component for multi-field address input
 * (street, city, state, zip, country) with react-hook-form integration.
 * Supports variants, sizes, disabled/loading/dark modes, and ARIA.
 *
 * @example
 * ```tsx
 * <AddressField
 *   form={methods}
 *   name="address"
 *   label="Mailing Address"
 *   required
 *   layout="grid"
 * />
 * ```
 */
export const AddressField = React.forwardRef<
  HTMLDivElement,
  AddressFieldProps<any, any>
>(
  <T extends FieldValues, TName extends FieldPath<T>>(
    {
      form,
      name,
      label,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      required = false,
      helperText,
      countries = defaultCountries,
      showStreet2 = true,
      layout = 'stacked',
      className,
      ...props
    }: AddressFieldProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const baseName = String(name);
    const { register, formState: { errors } } = form;

    const getFieldError = (subField: string) => {
      const path = `${baseName}.${subField}`;
      const parts = path.split('.');
      let current: any = errors;
      for (const part of parts) {
        if (!current) return undefined;
        current = current[part];
      }
      return current?.message as string | undefined;
    };

    const inputClass = cn(
      inputVariantStyles[variant],
      inputSizeStyles[size],
      'w-full outline-none text-[var(--preone-text-primary)] placeholder:text-[var(--preone-text-tertiary)]',
      'focus:ring-2 focus:ring-[var(--preone-color-primary)] focus:border-[var(--preone-color-primary)]',
      dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
    );

    const labelClass = cn(
      'font-medium text-sm text-[var(--preone-text-primary)]',
      dark && 'text-[var(--preone-text-primary-dark)]',
    );

    const errorClass = 'text-xs text-[var(--preone-color-error)] mt-0.5';

    return (
      <fieldset
        ref={ref as React.Ref<HTMLFieldSetElement>}
        className={cn(
          'flex flex-col gap-3',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          loading && 'animate-pulse',
          className,
        )}
        disabled={disabled}
        aria-label={label || 'Address'}
        data-dark={dark || undefined}
        {...(props as React.HTMLAttributes<HTMLFieldSetElement>)}
      >
        {label && (
          <legend className={cn(labelClass, required && "after:content-['*'] after:ml-0.5 after:text-[var(--preone-color-error)]")}>
            {label}
          </legend>
        )}

        {/* Street Line 1 */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${baseName}-street`} className={labelClass}>
            Street Address
          </label>
          <input
            id={`${baseName}-street`}
            {...register(`${baseName}.street` as any)}
            placeholder="123 Main St"
            disabled={disabled}
            className={cn(inputClass, getFieldError('street') && 'border-[var(--preone-color-error)]')}
            aria-invalid={!!getFieldError('street')}
          />
          {getFieldError('street') && (
            <span role="alert" className={errorClass}>{getFieldError('street')}</span>
          )}
        </div>

        {/* Street Line 2 */}
        {showStreet2 && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${baseName}-street2`} className={cn(labelClass, 'text-[var(--preone-text-secondary)]')}>
              Apt, Suite, Unit (optional)
            </label>
            <input
              id={`${baseName}-street2`}
              {...register(`${baseName}.street2` as any)}
              placeholder="Apt 4B"
              disabled={disabled}
              className={inputClass}
            />
          </div>
        )}

        {/* City + State + Zip in grid */}
        <div className={cn(layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : 'flex flex-col gap-3')}>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${baseName}-city`} className={labelClass}>
              City
            </label>
            <input
              id={`${baseName}-city`}
              {...register(`${baseName}.city` as any)}
              placeholder="New York"
              disabled={disabled}
              className={cn(inputClass, getFieldError('city') && 'border-[var(--preone-color-error)]')}
              aria-invalid={!!getFieldError('city')}
            />
            {getFieldError('city') && (
              <span role="alert" className={errorClass}>{getFieldError('city')}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${baseName}-state`} className={labelClass}>
              State / Province
            </label>
            <input
              id={`${baseName}-state`}
              {...register(`${baseName}.state` as any)}
              placeholder="NY"
              disabled={disabled}
              className={cn(inputClass, getFieldError('state') && 'border-[var(--preone-color-error)]')}
              aria-invalid={!!getFieldError('state')}
            />
            {getFieldError('state') && (
              <span role="alert" className={errorClass}>{getFieldError('state')}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${baseName}-zip`} className={labelClass}>
              ZIP / Postal
            </label>
            <input
              id={`${baseName}-zip`}
              {...register(`${baseName}.zip` as any)}
              placeholder="10001"
              disabled={disabled}
              className={cn(inputClass, getFieldError('zip') && 'border-[var(--preone-color-error)]')}
              aria-invalid={!!getFieldError('zip')}
            />
            {getFieldError('zip') && (
              <span role="alert" className={errorClass}>{getFieldError('zip')}</span>
            )}
          </div>
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${baseName}-country`} className={labelClass}>
            Country
          </label>
          <select
            id={`${baseName}-country`}
            {...register(`${baseName}.country` as any)}
            disabled={disabled}
            className={cn(
              inputClass,
              'appearance-none',
              getFieldError('country') && 'border-[var(--preone-color-error)]',
            )}
            aria-invalid={!!getFieldError('country')}
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
          {getFieldError('country') && (
            <span role="alert" className={errorClass}>{getFieldError('country')}</span>
          )}
        </div>

        {helperText && (
          <span className="text-xs text-[var(--preone-text-secondary)]">
            {helperText}
          </span>
        )}
      </fieldset>
    );
  },
) as <T extends FieldValues, TName extends FieldPath<T>>(
  props: AddressFieldProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(AddressField as any).displayName = 'AddressField';
