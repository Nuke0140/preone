'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, radius, shadows, duration, easing, spacing } from '@preone/design-tokens';

export type FABVariant = 'primary' | 'secondary' | 'extended';
export type FABSize = 'sm' | 'md' | 'lg';

export interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: FABVariant;
  size?: FABSize;
  icon: React.ReactNode;
  label?: string;
}

const sizeConfig: Record<FABSize, { dimension: string; iconSize: number; fontSize: string; padding: string }> = {
  sm: { dimension: '40px', iconSize: 16, fontSize: '0.875rem', padding: `0 ${spacing[3]}` },
  md: { dimension: '56px', iconSize: 22, fontSize: '0.875rem', padding: `0 ${spacing[5]}` },
  lg: { dimension: '72px', iconSize: 28, fontSize: '1rem', padding: `0 ${spacing[6]}` },
};

export const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ variant = 'primary', size = 'md', icon, label, disabled, className, style, ...props }, ref) => {
    const config = sizeConfig[size];
    const isExtended = variant === 'extended' || !!label;
    const isSecondary = variant === 'secondary';

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      transition: `all ${duration.normal} ${easing.DEFAULT}`,
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
      position: 'relative',
      boxShadow: shadows.lg,
      borderRadius: radius.xl,
    };

    const variantStyle: React.CSSProperties = isSecondary
      ? { backgroundColor: colors.neutral[100], color: colors.neutral[700] }
      : { backgroundColor: colors.neutral[900], color: colors.neutral[50] };

    const dimensionStyle: React.CSSProperties = isExtended
      ? {
          height: config.dimension,
          padding: config.padding,
          borderRadius: radius.xl,
        }
      : {
          width: config.dimension,
          height: config.dimension,
          borderRadius: radius.full,
        };

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyle,
      ...dimensionStyle,
      ...style,
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = shadows.xl;
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = shadows.lg;
      props.onMouseLeave?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = `${shadows.lg}, 0 0 0 2px ${colors.neutral[50]}, 0 0 0 4px ${colors.neutral[400]}`;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = shadows.lg;
      props.onBlur?.(e);
    };

    return (
      <button
        ref={ref}
        className={cn('preone-fab', className)}
        style={mergedStyle}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={label || 'Floating action'}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          {icon}
        </span>
        {label && (
          <span style={{ fontSize: config.fontSize, fontWeight: 500, letterSpacing: '0.01em' }}>
            {label}
          </span>
        )}
      </button>
    );
  }
);

FAB.displayName = 'FAB';
