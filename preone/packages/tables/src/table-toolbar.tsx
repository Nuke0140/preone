import * as React from 'react';
import { cn } from './cn.js';

/**
 * Bulk action definition.
 */
export interface BulkAction {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Whether the action is destructive */
  destructive?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: (selectedIds: string[]) => void;
}

/**
 * Column filter definition.
 */
export interface ColumnFilter {
  /** Column ID */
  id: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: 'text' | 'select' | 'date-range' | 'boolean';
  /** Options for select type */
  options?: { label: string; value: string }[];
}

/**
 * Props for the TableToolbar component.
 */
export interface TableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Global search value */
  searchValue?: string;
  /** Global search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Selected row IDs for bulk actions */
  selectedIds?: string[];
  /** Bulk action definitions */
  bulkActions?: BulkAction[];
  /** Column filters */
  filters?: ColumnFilter[];
  /** Active filter values */
  filterValues?: Record<string, any>;
  /** Filter change handler */
  onFilterChange?: (columnId: string, value: any) => void;
  /** Column visibility toggle */
  columnVisibility?: Record<string, boolean>;
  /** Column visibility change handler */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  /** Available columns for visibility toggle */
  availableColumns?: { id: string; label: string }[];
  /** Export CSV handler */
  onExportCSV?: () => void;
  /** Export Excel handler */
  onExportExcel?: () => void;
  /** Density control */
  density?: 'compact' | 'default' | 'comfortable';
  /** Density change handler */
  onDensityChange?: (density: 'compact' | 'default' | 'comfortable') => void;
  /** Whether the toolbar is disabled */
  disabled?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Title of the table */
  title?: string;
}

/**
 * PreOne TableToolbar component providing search, filters, bulk actions,
 * column visibility toggles, density control, and export buttons.
 *
 * @example
 * ```tsx
 * <TableToolbar
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   selectedIds={selectedIds}
 *   bulkActions={[
 *     { key: 'delete', label: 'Delete', destructive: true, onClick: handleBulkDelete },
 *   ]}
 *   onExportCSV={handleExportCSV}
 *   density={density}
 *   onDensityChange={setDensity}
 * />
 * ```
 */
export const TableToolbar = React.forwardRef<HTMLDivElement, TableToolbarProps>(
  (
    {
      searchValue = '',
      onSearchChange,
      searchPlaceholder = 'Search...',
      selectedIds = [],
      bulkActions = [],
      filters = [],
      filterValues = {},
      onFilterChange,
      columnVisibility,
      onColumnVisibilityChange,
      availableColumns = [],
      onExportCSV,
      onExportExcel,
      density = 'default',
      onDensityChange,
      disabled = false,
      dark = false,
      loading = false,
      title,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const [showFilters, setShowFilters] = React.useState(false);
    const [showColumns, setShowColumns] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        data-dark={dark || undefined}
        {...props}
      >
        {/* Main toolbar row */}
        <div className="flex items-center gap-3 flex-wrap">
          {title && (
            <h3 className={cn(
              'font-semibold text-base text-[var(--preone-text-primary)] mr-auto',
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}>
              {title}
            </h3>
          )}

          {/* Search */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--preone-text-tertiary)]"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                disabled={disabled}
                className={cn(
                  'w-full rounded-md border border-[var(--preone-border)] bg-[var(--preone-surface)] pl-9 pr-3 py-2 text-sm',
                  'placeholder:text-[var(--preone-text-tertiary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--preone-color-primary)] focus:border-[var(--preone-color-primary)]',
                  dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)] text-[var(--preone-text-primary-dark)]',
                )}
                aria-label="Search table"
              />
            </div>
          )}

          {/* Filter toggle */}
          {filters.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border border-[var(--preone-border)] px-3 py-2 text-sm',
                'hover:bg-[var(--preone-surface-secondary)] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                showFilters && 'bg-[var(--preone-color-primary-soft)] border-[var(--preone-color-primary)]',
                dark && 'border-[var(--preone-border-dark)]',
              )}
              aria-label="Toggle filters"
              aria-expanded={showFilters}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M1 3.5A.5.5 0 0 1 1.5 3h13a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.146.354L10 9.707V13.5a.5.5 0 0 1-.757.429l-3-1.5A.5.5 0 0 1 6 12V9.707L1.146 4.854A.5.5 0 0 1 1 4.5v-1Z" clipRule="evenodd" />
              </svg>
              Filters
            </button>
          )}

          {/* Column visibility toggle */}
          {onColumnVisibilityChange && availableColumns.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumns(!showColumns)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-[var(--preone-border)] px-3 py-2 text-sm',
                  'hover:bg-[var(--preone-surface-secondary)] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                  showColumns && 'bg-[var(--preone-color-primary-soft)] border-[var(--preone-color-primary)]',
                  dark && 'border-[var(--preone-border-dark)]',
                )}
                aria-label="Toggle column visibility"
                aria-expanded={showColumns}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9ZM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11Z" />
                  <path d="M2 5.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Z" />
                </svg>
                Columns
              </button>

              {showColumns && (
                <div
                  className={cn(
                    'absolute right-0 top-full mt-1 z-50 w-48 rounded-md border border-[var(--preone-border)]',
                    'bg-[var(--preone-surface)] shadow-lg p-2',
                    dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
                  )}
                  role="menu"
                >
                  {availableColumns.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--preone-surface-secondary)] cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility?.[col.id] ?? true}
                        onChange={(e) => onColumnVisibilityChange(col.id, e.target.checked)}
                        className="rounded border-[var(--preone-border)]"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Density control */}
          {onDensityChange && (
            <div className="flex items-center border border-[var(--preone-border)] rounded-md overflow-hidden">
              {(['compact', 'default', 'comfortable'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDensityChange(d)}
                  className={cn(
                    'px-2 py-1.5 text-xs transition-colors',
                    density === d
                      ? 'bg-[var(--preone-color-primary)] text-white'
                      : 'hover:bg-[var(--preone-surface-secondary)] text-[var(--preone-text-secondary)]',
                  )}
                  aria-label={`${d} density`}
                  aria-pressed={density === d}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Export buttons */}
          {(onExportCSV || onExportExcel) && (
            <div className="flex items-center gap-1">
              {onExportCSV && (
                <button
                  type="button"
                  onClick={onExportCSV}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border border-[var(--preone-border)] px-3 py-2 text-sm',
                    'hover:bg-[var(--preone-surface-secondary)] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                    dark && 'border-[var(--preone-border-dark)]',
                  )}
                  aria-label="Export CSV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L10.44 2.44A1.5 1.5 0 0 0 9.378 2H3.5Zm6.75 9.25a.75.75 0 0 1-1.5 0v-2.69L7.05 10.28a.75.75 0 0 1-1.06-1.06L8.94 6.25H7.75a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-1.19l-2.22 2.22 2.22 2.22v-1.19a.75.75 0 0 1 .75-.75h.25Z" />
                  </svg>
                  CSV
                </button>
              )}
              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border border-[var(--preone-border)] px-3 py-2 text-sm',
                    'hover:bg-[var(--preone-surface-secondary)] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                    dark && 'border-[var(--preone-border-dark)]',
                  )}
                  aria-label="Export Excel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L10.44 2.44A1.5 1.5 0 0 0 9.378 2H3.5Zm6.75 9.25a.75.75 0 0 1-1.5 0v-2.69L7.05 10.28a.75.75 0 0 1-1.06-1.06L8.94 6.25H7.75a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-1.19l-2.22 2.22 2.22 2.22v-1.19a.75.75 0 0 1 .75-.75h.25Z" />
                  </svg>
                  Excel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bulk actions bar */}
        {selectedIds.length > 0 && bulkActions.length > 0 && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md bg-[var(--preone-color-primary-soft)] px-3 py-2',
              dark && 'bg-[var(--preone-color-primary-soft-dark)]',
            )}
            role="toolbar"
            aria-label={`Bulk actions for ${selectedIds.length} selected items`}
          >
            <span className="text-sm font-medium text-[var(--preone-color-primary)]">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-1 ml-auto">
              {bulkActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => action.onClick(selectedIds)}
                  disabled={action.disabled || disabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
                    action.destructive
                      ? 'bg-[var(--preone-color-error)] text-white hover:opacity-90'
                      : 'bg-[var(--preone-surface)] border border-[var(--preone-border)] hover:bg-[var(--preone-surface-secondary)]',
                    action.disabled && 'opacity-50 cursor-not-allowed',
                    dark && !action.destructive && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters panel */}
        {showFilters && filters.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap items-end gap-3 rounded-md border border-[var(--preone-border)] p-3',
              'bg-[var(--preone-surface)]',
              dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
            )}
            role="group"
            aria-label="Table filters"
          >
            {filters.map((filter) => (
              <div key={filter.id} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--preone-text-secondary)]">
                  {filter.label}
                </label>
                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={filterValues[filter.id] ?? ''}
                    onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                    placeholder={`Filter ${filter.label.toLowerCase()}`}
                    className={cn(
                      'rounded-md border border-[var(--preone-border)] bg-[var(--preone-surface)] px-2 py-1.5 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--preone-color-primary)]',
                      dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
                    )}
                  />
                )}
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.id] ?? ''}
                    onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                    className={cn(
                      'rounded-md border border-[var(--preone-border)] bg-[var(--preone-surface)] px-2 py-1.5 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--preone-color-primary)]',
                      dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
                    )}
                  >
                    <option value="">All</option>
                    {filter.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filterValues[filter.id] ?? false}
                      onChange={(e) => onFilterChange?.(filter.id, e.target.checked)}
                      className="rounded border-[var(--preone-border)]"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

TableToolbar.displayName = 'TableToolbar';
