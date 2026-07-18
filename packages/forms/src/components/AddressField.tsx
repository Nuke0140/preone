'use client';

import React, { forwardRef, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, borderWidth, duration, easing } from '@preone/design-tokens';

export interface AddressFieldProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
> {
  /** Base field name for react-hook-form — stores the full address object */
  name: TName;
  /** Control from useForm */
  control: import('react-hook-form').Control<T>;
  /** Label */
  label?: string;
  /** Helper text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to show the address line 2 field */
  showAddressLine2?: boolean;
  /** Country options */
  countries?: { label: string; value: string }[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

const defaultCountries = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Canada', value: 'CA' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Australia', value: 'AU' },
  { label: 'Japan', value: 'JP' },
  { label: 'China', value: 'CN' },
  { label: 'India', value: 'IN' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Mexico', value: 'MX' },
  { label: 'South Korea', value: 'KR' },
  { label: 'Netherlands', value: 'NL' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'Singapore', value: 'SG' },
];

const USStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const inputStyle = (hasError: boolean, isDisabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '40px',
  padding: `0 ${spacing[3]}`,
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.neutral[900],
  backgroundColor: isDisabled ? colors.neutral[50] : '#fff',
  border: `${borderWidth.DEFAULT} solid ${hasError ? colors.red[300] : colors.neutral[200]}`,
  borderRadius: radius.md,
  outline: 'none',
  transition: `border-color ${duration.fast} ${easing.DEFAULT}`,
  ...(isDisabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}),
});

const selectStyle = (hasError: boolean, isDisabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '40px',
  padding: `0 ${spacing[3]}`,
  paddingRight: spacing[8],
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.neutral[900],
  backgroundColor: isDisabled ? colors.neutral[50] : '#fff',
  border: `${borderWidth.DEFAULT} solid ${hasError ? colors.red[300] : colors.neutral[200]}`,
  borderRadius: radius.md,
  outline: 'none',
  appearance: 'none' as const,
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: `border-color ${duration.fast} ${easing.DEFAULT}`,
  ...(isDisabled ? { opacity: 0.6 } : {}),
});

const fieldLabelStyle: React.CSSProperties = {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.neutral[700],
  fontFamily: fontFamily.sans,
};

function AddressFieldInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label = 'Address',
    description,
    required = false,
    showAddressLine2 = true,
    countries = defaultCountries,
    disabled = false,
    className,
    style,
  }: AddressFieldProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[4],
    ...style,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.neutral[700],
    fontFamily: fontFamily.sans,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1.5],
  };

  const cityStateRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: spacing[3],
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.red[600],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  };

  const helperTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.neutral[500],
  };

  return (
    <div ref={ref} className={cn('preone-address-field', className)} style={wrapperStyle}>
      <Controller
        name={name}
        control={control}
        rules={{
          ...(required ? { required: 'Address is required' } : {}),
        }}
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          const address = value || {
            street1: '',
            street2: '',
            city: '',
            state: '',
            zip: '',
            country: 'US',
          };

          const updateField = (field: string, val: string) => {
            onChange({ ...address, [field]: val });
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
              {/* Section header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[0.5] }}>
                <span style={sectionLabelStyle}>
                  {label}
                  {required && (
                    <span style={{ color: colors.red[500], fontWeight: fontWeight.bold, marginLeft: spacing[0.5] }} aria-hidden="true">
                      *
                    </span>
                  )}
                </span>
                {description && <span style={helperTextStyle}>{description}</span>}
              </div>

              {/* Street address line 1 */}
              <div style={rowStyle}>
                <label htmlFor={`${autoId}-street1`} style={fieldLabelStyle}>
                  Street Address
                </label>
                <input
                  id={`${autoId}-street1`}
                  type="text"
                  style={inputStyle(!!error, disabled)}
                  value={address.street1}
                  onChange={(e) => updateField('street1', e.target.value)}
                  placeholder="123 Main St"
                  disabled={disabled}
                  autoComplete="address-line1"
                />
              </div>

              {/* Street address line 2 */}
              {showAddressLine2 && (
                <div style={rowStyle}>
                  <label htmlFor={`${autoId}-street2`} style={fieldLabelStyle}>
                    Apartment, suite, etc.
                  </label>
                  <input
                    id={`${autoId}-street2`}
                    type="text"
                    style={inputStyle(false, disabled)}
                    value={address.street2}
                    onChange={(e) => updateField('street2', e.target.value)}
                    placeholder="Apt 4B"
                    disabled={disabled}
                    autoComplete="address-line2"
                  />
                </div>
              )}

              {/* City, State, Zip */}
              <div style={cityStateRowStyle}>
                <div style={rowStyle}>
                  <label htmlFor={`${autoId}-city`} style={fieldLabelStyle}>
                    City
                  </label>
                  <input
                    id={`${autoId}-city`}
                    type="text"
                    style={inputStyle(!!error, disabled)}
                    value={address.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="San Francisco"
                    disabled={disabled}
                    autoComplete="address-level2"
                  />
                </div>
                <div style={rowStyle}>
                  <label htmlFor={`${autoId}-state`} style={fieldLabelStyle}>
                    State
                  </label>
                  <select
                    id={`${autoId}-state`}
                    style={selectStyle(!!error, disabled)}
                    value={address.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">—</option>
                    {USStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={rowStyle}>
                  <label htmlFor={`${autoId}-zip`} style={fieldLabelStyle}>
                    ZIP
                  </label>
                  <input
                    id={`${autoId}-zip`}
                    type="text"
                    style={inputStyle(!!error, disabled)}
                    value={address.zip}
                    onChange={(e) => updateField('zip', e.target.value)}
                    placeholder="94105"
                    disabled={disabled}
                    autoComplete="postal-code"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Country */}
              <div style={rowStyle}>
                <label htmlFor={`${autoId}-country`} style={fieldLabelStyle}>
                  Country
                </label>
                <select
                  id={`${autoId}-country`}
                  style={selectStyle(!!error, disabled)}
                  value={address.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  disabled={disabled}
                  autoComplete="country"
                >
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <span id={`${autoId}-error`} style={errorTextStyle} role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error.message}
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}

export const AddressField = forwardRef(AddressFieldInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: AddressFieldProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AddressField as any).displayName = 'AddressField';
