/**
 * @preone/tables - DataTableToolbar
 * Search input, filter dropdown, density toggle, column visibility, export buttons
 */

'use client';

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import type { VisibilityState, ColumnFiltersState } from '@tanstack/react-table';
import { cn, Input, Button, IconButton } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing, borderWidth } from '@preone/design-tokens';
import type { Density } from '../types';
import { FilterPanel } from './FilterPanel';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { ExportMenu } from './ExportMenu';

// ─── Icons ───────────────────────────────────────────────────────────────────
const SearchIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FilterIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const ColumnsIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const DownloadIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const DensityCompactIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const DensityNormalIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="5" x2="21" y2="5" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="19" x2="21" y2="19" />
  </svg>
);

const DensityComfortableIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="4" x2="21" y2="4" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="20" x2="21" y2="20" />
  </svg>
);

const densityIcons: Record<Density, React.FC<{ size?: number }>> = {
  compact: DensityCompactIcon,
  normal: DensityNormalIcon,
  comfortable: DensityComfortableIcon,
};

// ─── Props ───────────────────────────────────────────────────────────────────
export interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  enableGlobalFilter: boolean;
  enableFiltering: boolean;
  enableColumnVisibility: boolean;
  enableExport: boolean;
  density: Density;
  onDensityChange: (density: Density) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  filterableColumns: Array<{
    id: string;
    header: string;
    filterType?: 'text' | 'select' | 'date' | 'number';
    filterOptions?: Array<{ label: string; value: string }>;
  }>;
  visibilityColumns: Array<{
    id: string;
    header: string;
    visible: boolean;
    toggle: () => void;
  }>;
  exportColumns: Array<{
    id: string;
    header: string;
  }>;
  exportData: unknown[];
  exportFileName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DataTableToolbar = forwardRef<HTMLDivElement, DataTableToolbarProps>(
  (
    {
      globalFilter,
      onGlobalFilterChange,
      enableGlobalFilter,
      enableFiltering,
      enableColumnVisibility,
      enableExport,
      density,
      onDensityChange,
      columnFilters,
      onColumnFiltersChange,
      columnVisibility,
      onColumnVisibilityChange,
      filterableColumns,
      visibilityColumns,
      exportColumns,
      exportData,
      exportFileName,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [filterOpen, setFilterOpen] = useState(false);
    const [colVisOpen, setColVisOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [densityOpen, setDensityOpen] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
      if (!colVisOpen && !exportOpen && !densityOpen) return;
      const handleClick = (e: MouseEvent) => {
        if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
          setColVisOpen(false);
          setExportOpen(false);
          setDensityOpen(false);
        }
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setColVisOpen(false);
          setExportOpen(false);
          setDensityOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [colVisOpen, exportOpen, densityOpen]);

    const DensityIcon = densityIcons[density];

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[3]} ${spacing[4]}`,
      gap: spacing[3],
      flexWrap: 'wrap',
      ...style,
    };

    const searchSectionStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      flex: '1 1 auto',
      minWidth: '200px',
    };

    const actionsSectionStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[1],
      position: 'relative',
    };

    const densityMenuStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 50,
      backgroundColor: '#fff',
      border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      padding: spacing[1],
      minWidth: '160px',
      animation: 'preone-toolbar-fade 150ms ease-out',
    };

    const densityItemStyle = (isActive: boolean): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2.5]} ${spacing[3]}`,
      borderRadius: radius.md,
      border: 'none',
      background: isActive ? colors.neutral[50] : 'none',
      cursor: 'pointer',
      width: '100%',
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
      color: isActive ? colors.neutral[900] : colors.neutral[600],
      transition: `background-color ${duration.fast} ${easing.DEFAULT}, color ${duration.fast} ${easing.DEFAULT}`,
    });

    const hasActiveFilters = columnFilters.length > 0;

    return (
      <div ref={ref} className={cn('preone-datatable-toolbar', className)} style={containerStyle} role="toolbar" aria-label="Table toolbar" {...props}>
        {/* Left: Search + Filter */}
        <div style={searchSectionStyle}>
          {enableGlobalFilter && (
            <Input
              size="sm"
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              placeholder="Search..."
              leftAddon={<SearchIcon />}
              fullWidth
              style={{ maxWidth: '320px' }}
            />
          )}
          {enableFiltering && filterableColumns.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Button
                variant={hasActiveFilters ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
                leftIcon={<FilterIcon />}
              >
                Filters
                {hasActiveFilters && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: radius.full,
                    backgroundColor: colors.neutral[900],
                    color: colors.neutral[50],
                    fontSize: '10px',
                    fontWeight: fontWeight.bold,
                    marginLeft: spacing[1],
                  }}>
                    {columnFilters.length}
                  </span>
                )}
              </Button>
              <div style={{ position: 'relative' }}>
                <FilterPanel
                  columnFilters={columnFilters}
                  onColumnFiltersChange={(filters) => {
                    onColumnFiltersChange(filters);
                    setFilterOpen(false);
                  }}
                  filterableColumns={filterableColumns}
                  open={filterOpen}
                  onClose={() => setFilterOpen(false)}
                  style={{ position: 'absolute', top: spacing[2], left: 0, zIndex: 60 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div ref={toolbarRef} style={actionsSectionStyle}>
          {/* Density toggle */}
          <div style={{ position: 'relative' }}>
            <IconButton
              variant="ghost"
              size="sm"
              label={`Density: ${density}`}
              onClick={() => {
                setDensityOpen(!densityOpen);
                setColVisOpen(false);
                setExportOpen(false);
              }}
            >
              <DensityIcon />
            </IconButton>
            {densityOpen && (
              <div style={densityMenuStyle} role="menu" aria-label="Density options">
                {(['compact', 'normal', 'comfortable'] as Density[]).map((d) => {
                  const DIcon = densityIcons[d];
                  return (
                    <button
                      key={d}
                      style={densityItemStyle(density === d)}
                      onClick={() => {
                        onDensityChange(d);
                        setDensityOpen(false);
                      }}
                      onMouseEnter={(e) => {
                        if (density !== d) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[50];
                          (e.currentTarget as HTMLElement).style.color = colors.neutral[900];
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (density !== d) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = colors.neutral[600];
                        }
                      }}
                      role="menuitem"
                    >
                      <DIcon size={14} />
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column visibility */}
          {enableColumnVisibility && (
            <div style={{ position: 'relative' }}>
              <IconButton
                variant="ghost"
                size="sm"
                label="Toggle columns"
                onClick={() => {
                  setColVisOpen(!colVisOpen);
                  setDensityOpen(false);
                  setExportOpen(false);
                }}
              >
                <ColumnsIcon />
              </IconButton>
              <ColumnVisibilityDropdown
                columns={visibilityColumns}
                open={colVisOpen}
                onClose={() => setColVisOpen(false)}
              />
            </div>
          )}

          {/* Export */}
          {enableExport && (
            <div style={{ position: 'relative' }}>
              <IconButton
                variant="ghost"
                size="sm"
                label="Export data"
                onClick={() => {
                  setExportOpen(!exportOpen);
                  setDensityOpen(false);
                  setColVisOpen(false);
                }}
              >
                <DownloadIcon />
              </IconButton>
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                open={exportOpen}
                onClose={() => setExportOpen(false)}
                fileName={exportFileName}
              />
            </div>
          )}
        </div>

        <style>{`
          @keyframes preone-toolbar-fade {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }
);

DataTableToolbar.displayName = 'DataTableToolbar';
