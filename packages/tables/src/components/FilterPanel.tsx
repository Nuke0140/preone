/**
 * @preone/tables - FilterPanel
 * Column filter inputs with Apply/Clear buttons
 */

'use client';

import React, { forwardRef, useState, useCallback } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { cn, Input, Select, Button } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing, borderWidth } from '@preone/design-tokens';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface FilterPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  filterableColumns: Array<{
    id: string;
    header: string;
    filterType?: 'text' | 'select' | 'date' | 'number';
    filterOptions?: Array<{ label: string; value: string }>;
  }>;
  open: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const FilterPanel = forwardRef<HTMLDivElement, FilterPanelProps>(
  (
    {
      columnFilters,
      onColumnFiltersChange,
      filterableColumns,
      open,
      onClose,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [localFilters, setLocalFilters] = useState<Record<string, string>>(() => {
      const map: Record<string, string> = {};
      for (const f of columnFilters) {
        map[f.id] = String(f.value);
      }
      return map;
    });

    const handleFilterChange = useCallback((columnId: string, value: string) => {
      setLocalFilters((prev) => ({ ...prev, [columnId]: value }));
    }, []);

    const handleApply = useCallback(() => {
      const filters: ColumnFiltersState = Object.entries(localFilters)
        .filter(([, value]) => value !== '')
        .map(([id, value]) => ({ id, value }));
      onColumnFiltersChange(filters);
    }, [localFilters, onColumnFiltersChange]);

    const handleClear = useCallback(() => {
      setLocalFilters({});
      onColumnFiltersChange([]);
    }, [onColumnFiltersChange]);

    if (!open) return null;

    const panelStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.md,
      padding: spacing[4],
      animation: 'preone-filter-slide 200ms ease-out',
      ...style,
    };

    const sectionTitleStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.neutral[700],
      fontFamily: fontFamily.sans,
      marginBottom: spacing[3],
    };

    const filterGroupStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[1.5],
    };

    const labelStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.neutral[500],
      fontFamily: fontFamily.sans,
    };

    return (
      <>
        <style>{`
          @keyframes preone-filter-slide {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          ref={ref}
          className={cn('preone-filter-panel', className)}
          style={panelStyle}
          role="dialog"
          aria-label="Filter columns"
          {...props}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
            <span style={sectionTitleStyle}>Filter Columns</span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.neutral[400],
                padding: spacing[1],
                borderRadius: radius.md,
                transition: `color ${duration.fast} ${easing.DEFAULT}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = colors.neutral[700]; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = colors.neutral[400]; }}
              aria-label="Close filter panel"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4], maxHeight: '400px', overflowY: 'auto' }}>
            {filterableColumns.map((col) => {
              const value = localFilters[col.id] || '';

              return (
                <div key={col.id} style={filterGroupStyle}>
                  <label style={labelStyle}>{col.header}</label>
                  {col.filterType === 'select' && col.filterOptions ? (
                    <Select
                      size="sm"
                      options={[{ label: 'All', value: '' }, ...col.filterOptions]}
                      value={value}
                      onChange={(e) => handleFilterChange(col.id, e.target.value)}
                      fullWidth
                    />
                  ) : (
                    <Input
                      size="sm"
                      type={col.filterType === 'number' ? 'number' : col.filterType === 'date' ? 'date' : 'text'}
                      value={value}
                      onChange={(e) => handleFilterChange(col.id, e.target.value)}
                      placeholder={`Filter by ${col.header.toLowerCase()}...`}
                      fullWidth
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[2], marginTop: spacing[5], paddingTop: spacing[4], borderTop: `1px solid ${colors.neutral[100]}` }}>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear all
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply filters
            </Button>
          </div>
        </div>
      </>
    );
  }
);

FilterPanel.displayName = 'FilterPanel';
