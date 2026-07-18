'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  children?: MenuItem[];
}

export interface MenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items: MenuItem[];
  onSelect?: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const menuSizes = {
  sm: { padding: `${spacing[1.5]} ${spacing[3]}`, fontSize: fontSize.sm, minHeight: '28px' },
  md: { padding: `${spacing[2]} ${spacing[3]}`, fontSize: fontSize.sm, minHeight: '36px' },
  lg: { padding: `${spacing[2.5]} ${spacing[4]}`, fontSize: fontSize.base, minHeight: '40px' },
};

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ items, onSelect, size = 'md', className, style, ...props }, ref) => {
    const config = menuSizes[size];

    const menuStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      padding: `${spacing[1]} 0`,
      minWidth: '180px',
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      overflow: 'hidden',
      ...style,
    };

    const getMenuItemStyle = (item: MenuItem): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: config.padding,
      minHeight: config.minHeight,
      fontSize: config.fontSize,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.normal,
      color: item.danger ? colors.red[600] : item.disabled ? colors.neutral[400] : colors.neutral[700],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: item.disabled ? 'not-allowed' : 'pointer',
      width: '100%',
      textAlign: 'left',
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      opacity: item.disabled ? 0.5 : 1,
      outline: 'none',
    });

    return (
      <div ref={ref} className={cn('preone-menu', className)} style={menuStyle} role="menu" {...props}>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <button
              role="menuitem"
              aria-disabled={item.disabled}
              style={getMenuItemStyle(item)}
              onClick={() => !item.disabled && onSelect?.(item.id)}
              onMouseEnter={(e) => {
                if (!item.disabled) e.currentTarget.style.backgroundColor = colors.neutral[50];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor = colors.neutral[50];
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && <span style={{ display: 'inline-flex', color: colors.neutral[400] }} aria-hidden="true">{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span style={{
                  fontSize: fontSize.xs,
                  color: colors.neutral[400],
                  fontFamily: fontFamily.mono,
                }}>
                  {item.shortcut}
                </span>
              )}
            </button>
            {item.divider && index < items.length - 1 && (
              <div style={{ height: '1px', backgroundColor: colors.neutral[100], margin: `${spacing[1]} 0` }} role="separator" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

Menu.displayName = 'Menu';
