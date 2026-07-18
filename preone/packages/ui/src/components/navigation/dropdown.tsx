/**
 * @preone/ui — Dropdown Component
 *
 * Convenience wrapper over Menu for simple dropdowns.
 * Provides a streamlined API for the most common dropdown pattern:
 * a trigger button that opens a list of items.
 *
 * @example
 * ```tsx
 * <Dropdown trigger={<Button>Options</Button>}>
 *   <DropdownItem onClick={() => console.log('edit')}>Edit</DropdownItem>
 *   <DropdownItem onClick={() => console.log('delete')}>Delete</DropdownItem>
 *   <DropdownSeparator />
 *   <DropdownItem onClick={() => console.log('cancel')}>Cancel</DropdownItem>
 * </Dropdown>
 * ```
 */

import * as React from 'react';
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuLabel,
  MenuGroup,
} from './menu.js';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

/** Props for the {@link Dropdown} component. */
export interface DropdownProps {
  /** The trigger element — typically a button. */
  trigger: React.ReactNode;
  /** Dropdown content — DropdownItem, DropdownSeparator, etc. */
  children: React.ReactNode;
  /** Alignment of the dropdown content relative to the trigger. */
  align?: 'start' | 'center' | 'end';
  /** Side of the trigger where the dropdown appears. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional className for the dropdown content. */
  className?: string;
}

/**
 * Dropdown — a convenience wrapper for simple dropdown menus.
 *
 * Wraps the full Menu component with a simplified API for the most
 * common dropdown pattern: trigger button → list of items.
 */
function Dropdown({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  className,
}: DropdownProps) {
  return (
    <Menu>
      <MenuTrigger asChild>{trigger}</MenuTrigger>
      <MenuContent align={align} side={side} className={className}>
        {children}
      </MenuContent>
    </Menu>
  );
}
Dropdown.displayName = 'Dropdown';

// ---------------------------------------------------------------------------
// DropdownItem
// ---------------------------------------------------------------------------

/** Props for the {@link DropdownItem} component. */
export interface DropdownItemProps extends React.ComponentPropsWithoutRef<typeof MenuItem> {}

/**
 * Dropdown item — a clickable option within a dropdown.
 * Re-exports MenuItem for convenience.
 */
const DropdownItem = React.forwardRef<
  React.ElementRef<typeof MenuItem>,
  DropdownItemProps
>(({ className, ...props }, ref) => (
  <MenuItem ref={ref} className={cn(className)} {...props} />
));
DropdownItem.displayName = 'DropdownItem';

// ---------------------------------------------------------------------------
// DropdownSeparator
// ---------------------------------------------------------------------------

/** Props for the {@link DropdownSeparator} component. */
export interface DropdownSeparatorProps extends React.ComponentPropsWithoutRef<typeof MenuSeparator> {}

/**
 * Dropdown separator — a horizontal divider within a dropdown.
 */
const DropdownSeparator = React.forwardRef<
  React.ElementRef<typeof MenuSeparator>,
  DropdownSeparatorProps
>(({ className, ...props }, ref) => (
  <MenuSeparator ref={ref} className={cn(className)} {...props} />
));
DropdownSeparator.displayName = 'DropdownSeparator';

// ---------------------------------------------------------------------------
// DropdownLabel
// ---------------------------------------------------------------------------

/** Props for the {@link DropdownLabel} component. */
export interface DropdownLabelProps extends React.ComponentPropsWithoutRef<typeof MenuLabel> {}

/**
 * Dropdown label — a non-interactive heading within a dropdown.
 */
const DropdownLabel = React.forwardRef<
  React.ElementRef<typeof MenuLabel>,
  DropdownLabelProps
>(({ className, ...props }, ref) => (
  <MenuLabel ref={ref} className={cn(className)} {...props} />
));
DropdownLabel.displayName = 'DropdownLabel';

// ---------------------------------------------------------------------------
// DropdownGroup
// ---------------------------------------------------------------------------

/** Props for the {@link DropdownGroup} component. */
export interface DropdownGroupProps extends React.ComponentPropsWithoutRef<typeof MenuGroup> {}

/**
 * Dropdown group — a logical grouping of dropdown items.
 */
const DropdownGroup = React.forwardRef<
  React.ElementRef<typeof MenuGroup>,
  DropdownGroupProps
>(({ className, ...props }, ref) => (
  <MenuGroup ref={ref} className={cn(className)} {...props} />
));
DropdownGroup.displayName = 'DropdownGroup';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel, DropdownGroup };
