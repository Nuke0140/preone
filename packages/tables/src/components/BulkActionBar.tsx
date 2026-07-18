/**
 * @preone/tables - BulkActionBar
 * Shows when rows are selected, displays count and bulk action buttons
 */

'use client';

import React, { forwardRef } from 'react';
import { cn, Button, Badge } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';
import type { BulkAction } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface BulkActionBarProps<T = unknown> extends React.HTMLAttributes<HTMLDivElement> {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction<T>[];
  selectedRows: T[];
  onClearSelection: () => void;
  onSelectAll: () => void;
}

// ─── Close Icon ──────────────────────────────────────────────────────────────
const CloseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const BulkActionBar = forwardRef<HTMLDivElement, BulkActionBarProps<unknown>>(
  (
    {
      selectedCount,
      totalCount,
      actions,
      selectedRows,
      onClearSelection,
      onSelectAll,
      className,
      style,
      ...props
    },
    ref
  ) => {
    if (selectedCount === 0) return null;

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[3]} ${spacing[4]}`,
      backgroundColor: colors.neutral[50],
      borderBottom: `1px solid ${colors.neutral[200]}`,
      borderTop: `1px solid ${colors.neutral[200]}`,
      animation: 'preone-bulk-slide-in 200ms ease-out',
      ...style,
    };

    const leftSectionStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
    };

    const selectAllButtonStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.medium,
      color: colors.neutral[500],
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: `${spacing[1]} ${spacing[2]}`,
      borderRadius: radius.md,
      transition: `color ${duration.fast} ${easing.DEFAULT}, background-color ${duration.fast} ${easing.DEFAULT}`,
    };

    const actionsStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
    };

    return (
      <>
        <style>{`
          @keyframes preone-bulk-slide-in {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          ref={ref}
          className={cn('preone-bulk-action-bar', className)}
          style={containerStyle}
          role="toolbar"
          aria-label={`${selectedCount} row${selectedCount !== 1 ? 's' : ''} selected`}
          {...props}
        >
          <div style={leftSectionStyle}>
            <Badge variant="primary" size="sm">
              {selectedCount} selected
            </Badge>
            {selectedCount < totalCount && (
              <button
                style={selectAllButtonStyle}
                onClick={onSelectAll}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = colors.neutral[900];
                  (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[100];
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = colors.neutral[500];
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                Select all {totalCount}
              </button>
            )}
            <button
              style={{
                ...selectAllButtonStyle,
                color: colors.neutral[400],
              }}
              onClick={onClearSelection}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = colors.neutral[700];
                (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[100];
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = colors.neutral[400];
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
              aria-label="Clear selection"
            >
              <CloseIcon size={14} />
            </button>
          </div>
          <div style={actionsStyle}>
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={() => action.onClick(selectedRows)}
                disabled={action.disabled}
                leftIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </>
    );
  }
);

BulkActionBar.displayName = 'BulkActionBar';
