'use client';

import React, { forwardRef, useState, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontFamily, duration, easing } from '@preone/design-tokens';

export interface RatingProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  allowHalf?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ratingSizes = { sm: 16, md: 22, lg: 28 };

const StarIcon: React.FC<{ filled: boolean; half?: boolean; size: number }> = ({ filled, half, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    {filled && !half ? (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
    ) : half ? (
      <>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <clipPath id={`half-${size}`}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" clipPath={`url(#half-${size})`} />
      </>
    ) : (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    )}
  </svg>
);

export const Rating = forwardRef<HTMLDivElement, RatingProps>(
  ({ value, defaultValue = 0, onChange, max = 5, size = 'md', allowHalf = false, readOnly = false, disabled = false, label, className, style }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const displayValue = hoverValue ?? currentValue;
    const iconSize = ratingSizes[size];

    const handleClick = useCallback(
      (starValue: number) => {
        if (readOnly || disabled) return;
        const newValue = currentValue === starValue ? starValue - 1 : starValue;
        if (!isControlled) setInternalValue(newValue);
        onChange?.(newValue);
      },
      [currentValue, disabled, isControlled, onChange, readOnly]
    );

    const handleMouseEnter = (starValue: number) => {
      if (readOnly || disabled) return;
      setHoverValue(starValue);
    };

    const handleMouseLeave = () => {
      setHoverValue(null);
    };

    const wrapperStyle: React.CSSProperties = {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: spacing[1],
    };

    const starsContainerStyle: React.CSSProperties = {
      display: 'inline-flex',
      gap: spacing[0.5],
      cursor: readOnly || disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    };

    const starStyle = (index: number): React.CSSProperties => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: index <= displayValue ? colors.amber[400] : colors.neutral[300],
      transition: `color ${duration.fast} ${easing.DEFAULT}, transform ${duration.fast} ${easing.DEFAULT}`,
      transform: hoverValue !== null && index <= hoverValue ? 'scale(1.1)' : 'scale(1)',
    });

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[700],
    };

    return (
      <div ref={ref} className={cn('preone-rating', className)} style={{ ...wrapperStyle, ...style }} role="radiogroup" aria-label={label || `Rating: ${currentValue} out of ${max}`}>
        {label && <span style={labelStyle}>{label}</span>}
        <div
          style={starsContainerStyle}
          onMouseLeave={handleMouseLeave}
          role="group"
        >
          {Array.from({ length: max }, (_, i) => {
            const isFilled = displayValue >= i + 1;
            const isHalf = allowHalf && displayValue >= i + 0.5 && displayValue < i + 1;

            return (
              <span
                key={i}
                style={starStyle(i + 1)}
                onClick={() => handleClick(allowHalf && displayValue === i + 1 ? i + 0.5 : i + 1)}
                onMouseEnter={() => handleMouseEnter(i + 1)}
                role="radio"
                aria-checked={i < currentValue}
                aria-label={`${i + 1} star${i > 0 ? 's' : ''}`}
                tabIndex={readOnly || disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleClick(i + 1);
                  }
                }}
              >
                <StarIcon filled={isFilled} half={isHalf} size={iconSize} />
              </span>
            );
          })}
        </div>
      </div>
    );
  }
);

Rating.displayName = 'Rating';
