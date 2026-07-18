'use client';

import React, { forwardRef } from 'react';
import { cn } from '@preone/ui';
import { colors, fontSize, fontFamily, fontWeight } from '@preone/design-tokens';

export interface HelperTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Helper text content */
  children: React.ReactNode;
  /** Unique id for aria-describedby */
  id?: string;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export const HelperText = forwardRef<HTMLSpanElement, HelperTextProps>(
  ({ children, id, className, style, ...props }, ref) => {
    const textStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.normal,
      color: colors.neutral[500],
      lineHeight: 1.5,
      ...style,
    };

    return (
      <span
        ref={ref}
        id={id}
        className={cn('preone-helper-text', className)}
        style={textStyle}
        {...props}
      >
        {children}
      </span>
    );
  }
);

HelperText.displayName = 'HelperText';
