'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, letterSpacing } from '@preone/design-tokens';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, breadcrumbs, actions, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('preone-page-header', className)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: spacing[6],
        ...style,
      }}
      {...props}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        {breadcrumbs && <div style={{ marginBottom: spacing[1] }}>{breadcrumbs}</div>}
        <h1 style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          fontFamily: fontFamily.sans,
          color: colors.neutral[900],
          margin: 0,
          letterSpacing: letterSpacing.tight,
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: fontSize.base,
            fontFamily: fontFamily.sans,
            color: colors.neutral[500],
            margin: 0,
            lineHeight: 1.5,
            marginTop: spacing[1],
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
);

PageHeader.displayName = 'PageHeader';
