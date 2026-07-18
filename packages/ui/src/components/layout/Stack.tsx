'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { spacing } from '@preone/design-tokens';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
  gap?: string;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  divider?: React.ReactNode;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ direction = 'vertical', gap = spacing[4], align, justify, wrap = false, divider, className, style, children, ...props }, ref) => {

    const stackStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: direction === 'horizontal' ? 'row' : 'column',
      gap: divider ? undefined : gap,
      alignItems: align,
      justifyContent: justify,
      flexWrap: wrap ? 'wrap' : undefined,
      ...style,
    };

    if (!divider) {
      return (
        <div ref={ref} className={cn('preone-stack', className)} style={stackStyle} {...props}>
          {children}
        </div>
      );
    }

    const childArray = React.Children.toArray(children).filter(Boolean);

    return (
      <div ref={ref} className={cn('preone-stack', className)} style={stackStyle} {...props}>
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < childArray.length - 1 && (
              <div
                style={{
                  ...(direction === 'horizontal'
                    ? { width: '1px', alignSelf: 'stretch', margin: `0 ${gap}` }
                    : { height: '1px', width: '100%', margin: `${gap} 0` }),
                }}
              >
                {divider}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

export interface HStackProps extends Omit<StackProps, 'direction'> {}

export const HStack = forwardRef<HTMLDivElement, HStackProps>(
  (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
);

HStack.displayName = 'HStack';

export interface VStackProps extends Omit<StackProps, 'direction'> {}

export const VStack = forwardRef<HTMLDivElement, VStackProps>(
  (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
);

VStack.displayName = 'VStack';
