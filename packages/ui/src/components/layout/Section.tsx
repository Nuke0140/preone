'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily } from '@preone/design-tokens';

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  divider?: boolean;
}

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ title, description, action, divider = false, className, style, children, ...props }, ref) => (
    <section
      ref={ref}
      className={cn('preone-section', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        paddingBottom: divider ? spacing[8] : undefined,
        borderBottom: divider ? `1px solid ${colors.neutral[100]}` : undefined,
        ...style,
      }}
      {...props}
    >
      {(title || description || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {title && (
              <h2 style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                fontFamily: fontFamily.sans,
                color: colors.neutral[900],
                margin: 0,
                lineHeight: 1.4,
              }}>
                {title}
              </h2>
            )}
            {description && (
              <p style={{
                fontSize: fontSize.sm,
                fontFamily: fontFamily.sans,
                color: colors.neutral[500],
                margin: 0,
                marginTop: spacing[1],
                lineHeight: 1.5,
              }}>
                {description}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
);

Section.displayName = 'Section';
