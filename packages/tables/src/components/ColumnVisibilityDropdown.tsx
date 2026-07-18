/**
 * @preone/tables - ColumnVisibilityDropdown
 * Toggle column visibility with checkbox list
 */

'use client';

import React, { forwardRef } from 'react';
import { cn, Checkbox } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing, borderWidth } from '@preone/design-tokens';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface ColumnVisibilityDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: Array<{
    id: string;
    header: string;
    visible: boolean;
    toggle: () => void;
  }>;
  open: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ColumnVisibilityDropdown = forwardRef<HTMLDivElement, ColumnVisibilityDropdownProps>(
  ({ columns, open, onClose, className, style, ...props }, ref) => {
    if (!open) return null;

    const dropdownStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 50,
      backgroundColor: '#fff',
      border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      padding: spacing[2],
      minWidth: '220px',
      maxHeight: '320px',
      overflowY: 'auto',
      animation: 'preone-colvis-fade 150ms ease-out',
      ...style,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      padding: `${spacing[2]} ${spacing[3]}`,
    };

    const itemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      padding: `${spacing[1]} ${spacing[2]}`,
      borderRadius: radius.md,
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      cursor: 'pointer',
    };

    return (
      <>
        <style>{`
          @keyframes preone-colvis-fade {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          ref={ref}
          className={cn('preone-column-visibility-dropdown', className)}
          style={dropdownStyle}
          role="dialog"
          aria-label="Toggle column visibility"
          {...props}
        >
          <div style={titleStyle}>Columns</div>
          {columns.map((col) => (
            <div
              key={col.id}
              style={itemStyle}
              onClick={col.toggle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[50];
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Checkbox
                size="sm"
                checked={col.visible}
                onChange={(e) => {
                  e.stopPropagation();
                  col.toggle();
                }}
                label={col.header}
              />
            </div>
          ))}
        </div>
      </>
    );
  }
);

ColumnVisibilityDropdown.displayName = 'ColumnVisibilityDropdown';
