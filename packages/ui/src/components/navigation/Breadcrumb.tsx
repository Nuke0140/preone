'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, easing } from '@preone/design-tokens';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ChevronRightIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const breadcrumbSizes = {
  sm: { fontSize: fontSize.xs, gap: spacing[1] },
  md: { fontSize: fontSize.sm, gap: spacing[1.5] },
  lg: { fontSize: fontSize.base, gap: spacing[2] },
};

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, separator, size = 'md', className, style, ...props }, ref) => {
    const config = breadcrumbSizes[size];
    const Separator = separator || <ChevronRightIcon size={size === 'lg' ? 16 : 14} />;

    const navStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: config.gap,
      ...style,
    };

    const itemStyle = (isLast: boolean): React.CSSProperties => ({
      fontSize: config.fontSize,
      fontFamily: fontFamily.sans,
      fontWeight: isLast ? fontWeight.semibold : fontWeight.normal,
      color: isLast ? colors.neutral[900] : colors.neutral[500],
      textDecoration: 'none',
      cursor: isLast ? 'default' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
      transition: `color ${'150ms'} ${easing.DEFAULT}`,
      border: 'none',
      background: 'none',
      padding: 0,
      outline: 'none',
    });

    return (
      <nav ref={ref} className={cn('preone-breadcrumb', className)} style={navStyle} aria-label="Breadcrumb" {...props}>
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: config.gap,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: config.gap }}>
                {isLast ? (
                  <span style={itemStyle(true)} aria-current="page">
                    {item.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{item.icon}</span>}
                    {item.label}
                  </span>
                ) : (
                  <>
                    {item.href ? (
                      <a
                        href={item.href}
                        style={itemStyle(false)}
                        onClick={item.onClick}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.neutral[700]; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.neutral[500]; }}
                      >
                        {item.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{item.icon}</span>}
                        {item.label}
                      </a>
                    ) : (
                      <button
                        style={itemStyle(false)}
                        onClick={item.onClick}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.neutral[700]; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.neutral[500]; }}
                      >
                        {item.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{item.icon}</span>}
                        {item.label}
                      </button>
                    )}
                    <span style={{ display: 'inline-flex', color: colors.neutral[300] }} aria-hidden="true">
                      {Separator}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';
