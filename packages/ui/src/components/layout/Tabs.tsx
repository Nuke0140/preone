'use client';

import React, { forwardRef, useState, useId } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  defaultActiveId?: string;
  activeId?: string;
  onChange?: (id: string) => void;
  variant?: 'line' | 'pills';
  size?: 'sm' | 'md' | 'lg';
}

const tabSizes = {
  sm: { padding: `${spacing[1.5]} ${spacing[3]}`, fontSize: fontSize.sm },
  md: { padding: `${spacing[2]} ${spacing[4]}`, fontSize: fontSize.sm },
  lg: { padding: `${spacing[3]} ${spacing[5]}`, fontSize: fontSize.base },
};

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ items, defaultActiveId, activeId, onChange, variant = 'line', size = 'md', className, style, ...props }, ref) => {
    const [internalActive, setInternalActive] = useState(defaultActiveId || items[0]?.id);
    const isControlled = activeId !== undefined;
    const currentActive = isControlled ? activeId : internalActive;
    const config = tabSizes[size];
    const tabListId = useId();

    const handleTabClick = (id: string) => {
      if (!isControlled) setInternalActive(id);
      onChange?.(id);
    };

    const tabListStyle: React.CSSProperties = {
      display: 'flex',
      gap: variant === 'pills' ? spacing[1] : spacing[0],
      borderBottom: variant === 'line' ? `2px solid ${colors.neutral[100]}` : undefined,
      padding: variant === 'pills' ? spacing[1] : undefined,
      backgroundColor: variant === 'pills' ? colors.neutral[100] : undefined,
      borderRadius: variant === 'pills' ? radius.lg : undefined,
      overflow: 'auto',
    };

    const getTabStyle = (isActive: boolean, isDisabled?: boolean): React.CSSProperties => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: config.padding,
      fontSize: config.fontSize,
      fontFamily: fontFamily.sans,
      fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
      color: isDisabled ? colors.neutral[400] : isActive ? colors.neutral[900] : colors.neutral[500],
      backgroundColor: variant === 'pills' ? (isActive ? '#fff' : 'transparent') : 'transparent',
      borderRadius: variant === 'pills' ? radius.md : undefined,
      border: 'none',
      borderBottom: variant === 'line' && isActive ? `2px solid ${colors.neutral[900]}` : variant === 'line' ? '2px solid transparent' : undefined,
      marginBottom: variant === 'line' ? '-2px' : undefined,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      opacity: isDisabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
      ...(variant === 'pills' && isActive ? { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}),
    });

    const panelStyle: React.CSSProperties = {
      paddingTop: spacing[5],
    };

    const activeItem = items.find((item) => item.id === currentActive);

    return (
      <div ref={ref} className={cn('preone-tabs', className)} style={{ ...style }} {...props}>
        <div style={tabListStyle} role="tablist" aria-orientation="horizontal" id={tabListId}>
          {items.map((item) => (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={currentActive === item.id}
              aria-controls={`panel-${item.id}`}
              aria-disabled={item.disabled}
              tabIndex={currentActive === item.id ? 0 : -1}
              style={getTabStyle(currentActive === item.id, item.disabled)}
              onClick={() => !item.disabled && handleTabClick(item.id)}
              onMouseEnter={(e) => {
                if (!item.disabled && currentActive !== item.id) {
                  e.currentTarget.style.color = colors.neutral[700];
                }
              }}
              onMouseLeave={(e) => {
                if (currentActive !== item.id) {
                  e.currentTarget.style.color = colors.neutral[500];
                }
              }}
              onKeyDown={(e) => {
                const enabledItems = items.filter((i) => !i.disabled);
                const currentIndex = enabledItems.findIndex((i) => i.id === currentActive);
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const nextItem = enabledItems[(currentIndex + 1) % enabledItems.length];
                  if (nextItem) handleTabClick(nextItem.id);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const prevItem = enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
                  if (prevItem) handleTabClick(prevItem.id);
                }
              }}
            >
              {item.icon && <span style={{ display: 'inline-flex' }} aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
        {activeItem && (
          <div
            role="tabpanel"
            id={`panel-${activeItem.id}`}
            aria-labelledby={`tab-${activeItem.id}`}
            style={panelStyle}
          >
            {activeItem.content}
          </div>
        )}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
