/**
 * @preone/ui — Header Component
 *
 * App header with: logo area, navigation area, action area.
 * Responsive — shows hamburger menu on mobile.
 *
 * @example
 * ```tsx
 * <Header
 *   logo={<Logo />}
 *   navigation={<nav>...</nav>}
 *   actions={<Button>Sign In</Button>}
 * />
 * ```
 */

import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/** Props for the {@link Header} component. */
export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo area rendered on the left. */
  logo?: React.ReactNode;
  /** Navigation links rendered in the center (hidden on mobile). */
  navigation?: React.ReactNode;
  /** Action buttons rendered on the right. */
  actions?: React.ReactNode;
  /** Whether the mobile menu is open (controlled). */
  mobileMenuOpen?: boolean;
  /** Default mobile menu state (uncontrolled). */
  defaultMobileMenuOpen?: boolean;
  /** Callback fired when the mobile menu state changes. */
  onMobileMenuOpenChange?: (open: boolean) => void;
}

/**
 * App header — responsive with logo, navigation, and action areas.
 *
 * On mobile, navigation collapses behind a hamburger menu toggle.
 * On desktop, navigation is displayed inline.
 */
const Header = React.forwardRef<HTMLElement, HeaderProps>(
  (
    {
      className,
      logo,
      navigation,
      actions,
      mobileMenuOpen: controlledOpen,
      defaultMobileMenuOpen = false,
      onMobileMenuOpenChange,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
      defaultMobileMenuOpen
    );
    const isOpen =
      controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

    const handleToggle = React.useCallback(() => {
      const next = !isOpen;
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onMobileMenuOpenChange?.(next);
    }, [isOpen, controlledOpen, onMobileMenuOpenChange]);

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-50 w-full',
          'bg-[var(--background)] border-b border-[var(--border)]',
          'backdrop-blur-sm bg-[var(--background)]/80',
          className
        )}
        {...props}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {logo}
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation}
          </nav>

          {/* Right area: actions + mobile toggle */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {actions}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className={cn(
                'md:hidden inline-flex items-center justify-center',
                'rounded-[var(--radius-default)] p-2',
                'text-[var(--foreground)] hover:bg-[var(--accent)]',
                'transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'
              )}
              onClick={handleToggle}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation dropdown */}
        {isOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <nav className="flex flex-col gap-1">
              {navigation}
            </nav>
            {actions && (
              <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
                {actions}
              </div>
            )}
          </div>
        )}

        {children}
      </header>
    );
  }
);
Header.displayName = 'Header';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Header };
