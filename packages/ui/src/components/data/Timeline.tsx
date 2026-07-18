'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius } from '@preone/design-tokens';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  icon?: React.ReactNode;
  status?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<string, string> = {
  default: colors.neutral[300],
  success: colors.green[500],
  warning: colors.amber[500],
  danger: colors.red[500],
  info: colors.sky[500],
};

export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(
  ({ items, size = 'md', className, style, ...props }, ref) => {
    const dotSize = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
    const lineWidth = 2;

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      ...style,
    };

    const itemStyle: React.CSSProperties = {
      display: 'flex',
      gap: spacing[4],
      position: 'relative',
      paddingBottom: spacing[6],
    };

    const lineContainerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: `${dotSize + 4}px`,
      flexShrink: 0,
    };

    const dotStyle = (status?: string): React.CSSProperties => ({
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      borderRadius: radius.full,
      backgroundColor: status ? statusColors[status] : colors.neutral[300],
      border: `2px solid #fff`,
      boxShadow: `0 0 0 1px ${status ? statusColors[status] : colors.neutral[200]}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      zIndex: 1,
    });

    const connectorStyle: React.CSSProperties = {
      width: `${lineWidth}px`,
      flex: 1,
      backgroundColor: colors.neutral[200],
    };

    const contentStyle: React.CSSProperties = {
      paddingTop: `${(dotSize - 18) / 2}px`,
      minWidth: 0,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.base : fontSize.sm,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[800],
      margin: 0,
      lineHeight: 1.4,
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[0.5],
      lineHeight: 1.5,
    };

    const timeStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      color: colors.neutral[400],
      marginTop: spacing[1],
    };

    return (
      <div ref={ref} className={cn('preone-timeline', className)} style={containerStyle} {...props}>
        {items.map((item, index) => (
          <div key={item.id} style={itemStyle}>
            <div style={lineContainerStyle}>
              <div style={dotStyle(item.status)}>
                {item.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{item.icon}</span>}
              </div>
              {index < items.length - 1 && <div style={connectorStyle} />}
            </div>
            <div style={contentStyle}>
              <p style={titleStyle}>{item.title}</p>
              {item.description && <p style={descStyle}>{item.description}</p>}
              {item.timestamp && <span style={timeStyle}>{item.timestamp}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

Timeline.displayName = 'Timeline';
