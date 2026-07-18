/**
 * @preone/ui — Sidebar Component
 *
 * Collapsible sidebar with header, content, footer, items, and groups.
 * When collapsed, only icons are visible.
 * Active item indicator with Metro/Fluent styling.
 *
 * Sub-components: Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
 * SidebarItem, SidebarGroup, SidebarGroupLabel.
 *
 * @example
 * ```tsx
 * <Sidebar collapsed={false} onCollapsedChange={setCollapsed}>
 *   <SidebarHeader>
 *     <Logo />
 *   </SidebarHeader>
 *   <SidebarContent>
 *     <SidebarGroup>
 *       <SidebarGroupLabel>Main</SidebarGroupLabel>
 *       <SidebarItem icon={<Home />} active>Dashboard</SidebarItem>
 *       <SidebarItem icon={<Users />}>Students</SidebarItem>
 *     </SidebarGroup>
 *   </SidebarContent>
 *   <SidebarFooter>
 *     <SidebarItem icon={<Settings />}>Settings</SidebarItem>
 *   </SidebarFooter>
 * </Sidebar>
 * ```
 */

import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

/** Hook to access sidebar state from child components. */
function useSidebar() {
  return React.useContext(SidebarContext);
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

/** Props for the {@link Sidebar} component. */
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Whether the sidebar is collapsed. */
  collapsed?: boolean;
  /** Default collapsed state for uncontrolled usage. */
  defaultCollapsed?: boolean;
  /** Callback fired when the collapsed state changes. */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Collapsible sidebar — supports expanded (full labels) and collapsed
 * (icons only) states with smooth width transition.
 */
const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      collapsed: controlledCollapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledCollapsed, setUncontrolledCollapsed] =
      React.useState(defaultCollapsed);
    const isCollapsed =
      controlledCollapsed !== undefined
        ? controlledCollapsed
        : uncontrolledCollapsed;

    const setCollapsed = React.useCallback(
      (next: React.SetStateAction<boolean>) => {
        const value =
          typeof next === 'function' ? next(isCollapsed) : next;
        if (controlledCollapsed === undefined) {
          setUncontrolledCollapsed(value);
        }
        onCollapsedChange?.(value);
      },
      [controlledCollapsed, isCollapsed, onCollapsedChange]
    );

    return (
      <SidebarContext.Provider value={{ collapsed: isCollapsed, setCollapsed }}>
        <aside
          ref={ref}
          role="navigation"
          aria-label="Sidebar navigation"
          className={cn(
            'flex flex-col h-full bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)]',
            'border-r border-[var(--sidebar-border)]',
            'transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-default)]',
            'overflow-hidden',
            isCollapsed ? 'w-16' : 'w-64',
            className
          )}
          {...props}
        >
          {children}
        </aside>
      </SidebarContext.Provider>
    );
  }
);
Sidebar.displayName = 'Sidebar';

// ---------------------------------------------------------------------------
// SidebarHeader
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarHeader} component. */
export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Sidebar header area — typically contains logo and collapse toggle.
 */
const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const { collapsed, setCollapsed } = useSidebar();

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-4 border-b border-[var(--sidebar-border)]',
          className
        )}
        {...props}
      >
        <div className={cn('flex items-center gap-3 overflow-hidden', collapsed && 'justify-center')}>
          {children}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'shrink-0 rounded-[var(--radius-default)] p-1.5',
            'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
SidebarHeader.displayName = 'SidebarHeader';

// ---------------------------------------------------------------------------
// SidebarContent
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarContent} component. */
export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Scrollable sidebar content area between header and footer.
 */
const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto py-2', className)}
      {...props}
    />
  )
);
SidebarContent.displayName = 'SidebarContent';

// ---------------------------------------------------------------------------
// SidebarFooter
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarFooter} component. */
export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Sidebar footer area — typically contains settings or user profile.
 */
const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-t border-[var(--sidebar-border)] p-2',
        className
      )}
      {...props}
    />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

// ---------------------------------------------------------------------------
// SidebarGroup
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarGroup} component. */
export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Group of sidebar items with an optional label.
 */
const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1', className)}
      {...props}
    />
  )
);
SidebarGroup.displayName = 'SidebarGroup';

// ---------------------------------------------------------------------------
// SidebarGroupLabel
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarGroupLabel} component. */
export interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Label for a group of sidebar items.
 * Hidden when the sidebar is collapsed.
 */
const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({ className, children, ...props }, ref) => {
    const { collapsed } = useSidebar();

    if (collapsed) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'px-2 py-1.5 text-xs font-medium uppercase tracking-[var(--tracking-wider)]',
          'text-[var(--muted-foreground)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

// ---------------------------------------------------------------------------
// SidebarItem
// ---------------------------------------------------------------------------

/** Props for the {@link SidebarItem} component. */
export interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional icon displayed before the label. */
  icon?: React.ReactNode;
  /** Whether this item is currently active. */
  active?: boolean;
  /** Whether the item is disabled. */
  disabled?: boolean;
}

/**
 * Sidebar navigation item — icon + label, with active indicator.
 * Label is hidden when sidebar is collapsed; only icon is shown.
 */
const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, icon, active = false, disabled = false, children, ...props }, ref) => {
    const { collapsed } = useSidebar();

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 w-full rounded-[var(--radius-default)] px-3 py-2',
          'text-sm font-medium transition-colors duration-[var(--duration-fast)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]',
          collapsed && 'justify-center px-0',
          active
            ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        {...props}
      >
        {/* Active indicator bar */}
        {active && !collapsed && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[var(--sidebar-primary)]"
            aria-hidden="true"
          />
        )}

        {icon && (
          <span
            className={cn(
              'shrink-0 h-5 w-5',
              active
                ? 'text-[var(--sidebar-primary)]'
                : 'text-[var(--muted-foreground)] group-hover:text-[var(--sidebar-accent-foreground)]'
            )}
          >
            {icon}
          </span>
        )}

        {!collapsed && (
          <span className="truncate">{children}</span>
        )}

        {/* Tooltip-like title when collapsed */}
        {collapsed && (
          <span className="sr-only">{children}</span>
        )}
      </button>
    );
  }
);
SidebarItem.displayName = 'SidebarItem';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
};
