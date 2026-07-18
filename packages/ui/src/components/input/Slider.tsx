'use client';

import React, { forwardRef, useState, useCallback, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
  size?: 'sm' | 'md' | 'lg';
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

const sliderConfig = {
  sm: { trackHeight: 4, thumbSize: 16 },
  md: { trackHeight: 6, thumbSize: 20 },
  lg: { trackHeight: 8, thumbSize: 24 },
};

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ size = 'md', min = 0, max = 100, step = 1, value, defaultValue = 0, onChange, label, showValue = false, formatValue, disabled = false, className, style, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const autoId = useId();
    const sliderId = props.id || autoId;
    const config = sliderConfig[size];
    const percentage = ((currentValue - min) / (max - min)) * 100;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        if (!isControlled) setInternalValue(newValue);
        onChange?.(newValue);
      },
      [isControlled, onChange]
    );

    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[2],
      width: '100%',
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[700],
      fontWeight: 500,
    };

    const valueStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
    };

    const trackContainerStyle: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      height: `${config.thumbSize}px`,
      display: 'flex',
      alignItems: 'center',
    };

    const trackStyle: React.CSSProperties = {
      position: 'absolute',
      width: '100%',
      height: `${config.trackHeight}px`,
      borderRadius: radius.full,
      backgroundColor: colors.neutral[200],
      overflow: 'hidden',
    };

    const fillStyle: React.CSSProperties = {
      height: '100%',
      width: `${percentage}%`,
      backgroundColor: disabled ? colors.neutral[300] : colors.neutral[900],
      borderRadius: radius.full,
      transition: `width ${duration.fast} ${easing.DEFAULT}`,
    };

    const hiddenInputStyle: React.CSSProperties = {
      position: 'absolute',
      width: '100%',
      height: `${config.thumbSize}px`,
      opacity: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      margin: 0,
      zIndex: 1,
    };

    const thumbStyle: React.CSSProperties = {
      position: 'absolute',
      width: `${config.thumbSize}px`,
      height: `${config.thumbSize}px`,
      borderRadius: radius.full,
      backgroundColor: '#fff',
      border: `2px solid ${colors.neutral[900]}`,
      boxShadow: shadows.sm,
      left: `calc(${percentage}% - ${config.thumbSize / 2}px)`,
      pointerEvents: 'none',
      transition: `left ${duration.fast} ${easing.DEFAULT}, box-shadow ${duration.fast} ${easing.DEFAULT}`,
    };

    return (
      <div className={cn('preone-slider', className)} style={{ ...wrapperStyle, ...style }}>
        {(label || showValue) && (
          <div style={headerStyle}>
            {label && <label htmlFor={sliderId} style={labelStyle}>{label}</label>}
            {showValue && <span style={valueStyle}>{formatValue ? formatValue(currentValue) : currentValue}</span>}
          </div>
        )}
        <div style={trackContainerStyle}>
          <input
            ref={ref}
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            style={hiddenInputStyle}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={currentValue}
            aria-label={label}
            {...props}
          />
          <div style={trackStyle}>
            <div style={fillStyle} />
          </div>
          <div style={thumbStyle} />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
