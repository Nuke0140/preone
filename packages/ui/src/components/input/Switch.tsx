'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, radius, shadows, duration, easing, fontFamily } from '@preone/design-tokens';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'onChange'> {
  size?: 'sm' | 'md' | 'lg';
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

const switchConfig = {
  sm: { width: 36, height: 20, thumb: 14, translate: 16 },
  md: { width: 44, height: 24, thumb: 18, translate: 20 },
  lg: { width: 52, height: 28, thumb: 22, translate: 24 },
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ size = 'md', checked, defaultChecked = false, onChange, label, description, disabled = false, className, style, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;
    const autoId = useId();
    const switchId = props.id || autoId;
    const config = switchConfig[size];

    const handleToggle = () => {
      if (disabled) return;
      if (!isControlled) setInternalChecked(!isChecked);
      onChange?.(!isChecked);
    };

    const wrapperStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: spacing[3],
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
    };

    const trackStyle: React.CSSProperties = {
      width: `${config.width}px`,
      height: `${config.height}px`,
      borderRadius: radius.full,
      backgroundColor: isChecked ? colors.neutral[900] : colors.neutral[300],
      border: 'none',
      padding: `${(config.height - config.thumb) / 2}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: isChecked ? 'flex-end' : 'flex-start',
      transition: `background-color ${duration.normal} ${easing.DEFAULT}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginTop: description ? '2px' : '0',
      outline: 'none',
      position: 'relative',
    };

    const thumbStyle: React.CSSProperties = {
      width: `${config.thumb}px`,
      height: `${config.thumb}px`,
      borderRadius: radius.full,
      backgroundColor: '#fff',
      boxShadow: shadows.sm,
      transition: `all ${duration.normal} ${easing.DEFAULT}`,
    };

    const labelStyle: React.CSSProperties = {
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

    return (
      <div className={cn('preone-switch-wrapper', className)} style={{ ...wrapperStyle, ...style }} onClick={handleToggle}>
        <button
          ref={ref}
          id={switchId}
          role="switch"
          aria-checked={isChecked}
          aria-disabled={disabled}
          style={trackStyle}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleToggle();
            }
          }}
          {...props}
        >
          <span style={thumbStyle} />
        </button>
        {(label || description) && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label && <label htmlFor={switchId} style={labelStyle}>{label}</label>}
            {description && <span style={descStyle}>{description}</span>}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
