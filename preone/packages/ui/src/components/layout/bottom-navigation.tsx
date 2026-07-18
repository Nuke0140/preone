/**
 * @preone/ui — BottomNavigation Component
 *
 * Mobile bottom navigation bar with items (icon + label) and active state.
 *
 * @example
 * ```tsx
 * <BottomNavigation>
 *   <BottomNavItem icon={<Home />} active>Home</BottomNavItem>
 *   <BottomNavItem icon={<Search />}>Explore</BottomNavItem>
 *   <BottomNavItem icon={<Bell />}>Alerts</BottomNavItem>
 *   <BottomNavItem icon={<User />}>Profile</BottomNavItem>
 * </BottomNavigation>
 * ```
 */

import * as React from 'react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// BottomNavigation
// ---------------------------------------------------------------------------

/** Props for the {@link BottomNavigation} component. */
export interface BottomNavigationProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * Mobile bottom navigation bar — fixed at the bottom of the viewport.
 *
 * Renders a row of navigation items with icon + label and active indicator.
 */
const BottomNavigation = React.forwardRef<HTMLElement, BottomNavigationProps>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Bottom navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-[var(--background)] border-t border-[var(--border)]',
        'safe-area-inset-bottom',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {children}
      </div>
    </nav>
  )
);
BottomNavigation.displayName = 'BottomNavigation';

// ---------------------------------------------------------------------------
// BottomNavItem
// ---------------------------------------------------------------------------

/** Props for the {@link BottomNavItem} component. */
export interface BottomNavItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon displayed above the label. */
  icon?: React.ReactNode;
  /** Whether this item is currently active. */
  active?: boolean;
}

/**
 * Bottom navigation item — icon + label with active indicator.
 */
const BottomNavItem = React.forwardRef<HTMLButtonElement, BottomNavItemProps>(
  ({ className, icon, active = false, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1 flex-1',
        'py-2 px-3 rounded-[var(--radius-default)]',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        active
          ? 'text-[var(--primary)]'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            'h-5 w-5 transition-transform duration-[var(--duration-fast)]',
            active && 'scale-110'
          )}
        >
          {icon}
        </span>
      )}
      <span className="text-xs font-medium leading-none truncate max-w-full">
        {children}
      </span>

      {/* Active indicator dot */}
      {active && (
        <span
          className="h-1 w-4 rounded-full bg-[var(--primary)] -mt-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  )
);
BottomNavItem.displayName = 'BottomNavItem';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BottomNavigation, BottomNavItem };
