# Task: @preone/tables - Enterprise DataTable Package

## Summary
Created the complete `@preone/tables` package — an enterprise DataTable for the PreOne Design System built on @tanstack/react-table and @tanstack/react-virtual.

## Files Created

### Core Types
- `packages/tables/src/types.ts` — All TypeScript interfaces and types: DataTableProps, Density, BulkAction, ServerPagination, DataTableColumnMeta, sub-component props

### Hook
- `packages/tables/src/hooks/useDataTable.ts` — Custom hook wrapping useReactTable from TanStack; manages sorting, filtering, pagination, selection, column visibility state; returns table instance + all handlers + computed values

### Components
- `packages/tables/src/components/DataTable.tsx` — Main enterprise DataTable with ALL features: sorting, filtering, global search, pagination (client/server), row selection, bulk actions, column visibility, density modes (compact/normal/comfortable), sticky header, virtualization, loading skeletons, empty state, responsive card view on mobile, CSV/Excel export, permission-based column visibility
- `packages/tables/src/components/DataTableHeader.tsx` — Sortable column headers with select-all checkbox, sort indicators (asc/desc/neutral), column resize handles, keyboard navigation
- `packages/tables/src/components/DataTableBody.tsx` — Row rendering with selection checkboxes, virtualized scrolling via @tanstack/react-virtual, skeleton loading rows, empty state
- `packages/tables/src/components/DataTablePagination.tsx` — Page navigation with First/Prev/Next/Last buttons, page size selector via Select component, "Showing X-Y of Z" text
- `packages/tables/src/components/DataTableToolbar.tsx` — Search input, filter dropdown, density toggle (3 options), column visibility dropdown, export buttons
- `packages/tables/src/components/BulkActionBar.tsx` — Appears when rows selected; displays count badge, "Select all N" link, clear selection, bulk action buttons
- `packages/tables/src/components/FilterPanel.tsx` — Column filter inputs (text/select/date/number), Apply/Clear buttons, animated panel
- `packages/tables/src/components/ColumnVisibilityDropdown.tsx` — Toggle column visibility with checkbox list
- `packages/tables/src/components/ExportMenu.tsx` — Export CSV and Export Excel (CSV with .xlsx extension)

### Barrel Export
- `packages/tables/src/index.ts` — Exports all components, hooks, and types

## Design Decisions
- Uses inline styles with @preone/design-tokens (consistent with @preone/ui pattern)
- Uses React.forwardRef for all visual components
- Uses ARIA attributes for accessibility throughout
- Uses @preone/ui components: Button, IconButton, Input, Select, Checkbox, Badge, EmptyState, Skeleton, cn
- Server-side pagination: manualPagination mode with external page/pageSize/totalCount control
- Responsive mode: renders card view below configurable breakpoint (default 768px)
- Virtualization: uses @tanstack/react-virtual with overscan and estimated row sizes per density
