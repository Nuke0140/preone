'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, radius, duration, easing, fontFamily } from '@preone/design-tokens';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  direction?: 'horizontal' | 'vertical';
  error?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const radioSizes = {
  sm: { dot: 16, inner: 6 },
  md: { dot: 20, inner: 8 },
  lg: { dot: 24, inner: 10 },
};

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ options, value, defaultValue, onChange, size = 'md', label, direction = 'vertical', error = false, disabled = false, className, style }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const currentValue = value ?? internalValue;
    const config = radioSizes[size];

    const groupStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[1],
    };

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
      marginBottom: spacing[1],
    };

    const optionsContainerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: direction === 'vertical' ? 'column' : 'row',
      gap: direction === 'vertical' ? spacing[2] : spacing[4],
      flexWrap: 'wrap',
    };

    const handleChange = (val: string) => {
      if (disabled) return;
      setInternalValue(val);
      onChange?.(val);
    };

    return (
      <div ref={ref} className={cn('preone-radio-group', className)} style={{ ...groupStyle, ...style }} role="radiogroup" aria-label={label}>
        {label && <span style={labelStyle}>{label}</span>}
        <div style={optionsContainerStyle}>
          {options.map((option) => {
            const isSelected = currentValue === option.value;
            const isItemDisabled = disabled || option.disabled;

            const itemStyle: React.CSSProperties = {
              display: 'inline-flex',
              alignItems: option.description ? 'flex-start' : 'center',
              gap: spacing[2],
              cursor: isItemDisabled ? 'not-allowed' : 'pointer',
              opacity: isItemDisabled ? 0.5 : 1,
              userSelect: 'none',
            };

            const dotStyle: React.CSSProperties = {
              width: `${config.dot}px`,
              height: `${config.dot}px`,
              minWidth: `${config.dot}px`,
              borderRadius: radius.full,
              border: `2px solid ${error ? colors.red[400] : isSelected ? colors.neutral[900] : colors.neutral[300]}`,
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all ${duration.fast} ${easing.DEFAULT}`,
              marginTop: option.description ? '2px' : '0',
            };

            const innerDotStyle: React.CSSProperties = {
              width: `${config.inner}px`,
              height: `${config.inner}px`,
              borderRadius: radius.full,
              backgroundColor: colors.neutral[900],
              transform: isSelected ? 'scale(1)' : 'scale(0)',
              transition: `transform ${duration.fast} ${easing.bounce}`,
            };

            const optionLabelStyle: React.CSSProperties = {
              fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.base : fontSize.sm,
              fontFamily: fontFamily.sans,
              color: colors.neutral[800],
              lineHeight: '1.4',
            };

            const descStyle: React.CSSProperties = {
              fontSize: fontSize.xs,
              fontFamily: fontFamily.sans,
              color: colors.neutral[500],
              marginTop: '2px',
            };

            const handleClick = () => {
              if (!isItemDisabled) handleChange(option.value);
            };

            const handleKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleClick();
              }
            };

            return (
              <div key={option.value} style={itemStyle} onClick={handleClick} onKeyDown={handleKeyDown} role="radio" aria-checked={isSelected} aria-disabled={isItemDisabled} tabIndex={isItemDisabled ? -1 : 0}>
                <div style={dotStyle}>
                  <div style={innerDotStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={optionLabelStyle}>{option.label}</span>
                  {option.description && <span style={descStyle}>{option.description}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
