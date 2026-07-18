'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { spacing, breakpoints } from '@preone/design-tokens';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

const maxWidthMap: Record<ContainerSize, string> = {
  sm: breakpoints.sm,
  md: breakpoints.md,
  lg: breakpoints.lg,
  xl: breakpoints.xl,
  full: '100%',
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = 'lg', className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('preone-container', className)}
      style={{
        width: '100%',
        maxWidth: maxWidthMap[size],
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        ...style,
      }}
      {...props}
    />
  )
);

Container.displayName = 'Container';
