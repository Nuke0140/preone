'use client';

import React, { forwardRef } from 'react';
import { cn } from '@preone/ui';
import { colors, fontSize, fontFamily, fontWeight, spacing } from '@preone/design-tokens';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field is required — shows an asterisk */
  required?: boolean;
  /** Label content */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required = false, children, className, style, htmlFor, ...props }, ref) => {
    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
      lineHeight: 1.4,
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[0.5],
      ...style,
    };

    const asteriskStyle: React.CSSProperties = {
      color: colors.red[500],
      fontWeight: fontWeight.bold,
      fontSize: fontSize.sm,
      lineHeight: 1,
    };

    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn('preone-label', className)}
        style={labelStyle}
        {...props}
      >
        {children}
        {required && (
          <span style={asteriskStyle} aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';
