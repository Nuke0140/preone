/**
 * @preone/ui — Menu Component
 *
 * Using @radix-ui/react-dropdown-menu with custom PreOne styling.
 * Full-featured menu system with keyboard navigation support.
 *
 * Sub-components: Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator,
 * MenuLabel, MenuGroup, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem.
 *
 * @example
 * ```tsx
 * <Menu>
 *   <MenuTrigger asChild>
 *     <Button>Open Menu</Button>
 *   </MenuTrigger>
 *   <MenuContent>
 *     <MenuLabel>Actions</MenuLabel>
 *     <MenuGroup>
 *       <MenuItem>Edit</MenuItem>
 *       <MenuItem>Duplicate</MenuItem>
 *     </MenuGroup>
 *     <MenuSeparator />
 *     <MenuCheckboxItem checked>Show Grid</MenuCheckboxItem>
 *     <MenuSeparator />
 *     <MenuRadioGroup value="light">
 *       <MenuRadioItem value="light">Light</MenuRadioItem>
 *       <MenuRadioItem value="dark">Dark</MenuRadioItem>
 *     </MenuRadioGroup>
 *   </MenuContent>
 * </Menu>
 * ```
 */

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

/** Props for the {@link Menu} component. */
export interface MenuProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> {}

/**
 * Menu root — wraps Radix UI DropdownMenu.
 */
const Menu = DropdownMenuPrimitive.Root;

// ---------------------------------------------------------------------------
// MenuTrigger
// ---------------------------------------------------------------------------

/** Props for the {@link MenuTrigger} component. */
export interface MenuTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {}

/**
 * Menu trigger — the element that opens the menu.
 */
const MenuTrigger = DropdownMenuPrimitive.Trigger;

// ---------------------------------------------------------------------------
// MenuContent
// ---------------------------------------------------------------------------

/** Props for the {@link MenuContent} component. */
export interface MenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {}

/**
 * Menu content — the dropdown panel containing menu items.
 *
 * Styled with soft shadows, generous padding, and rounded corners
 * following the PreOne Metro/Fluent design language.
 */
const MenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  MenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden',
        'rounded-[var(--radius-lg)] bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)] shadow-[var(--shadow-lg)]',
        'p-1',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
MenuContent.displayName = 'MenuContent';

// ---------------------------------------------------------------------------
// MenuItem
// ---------------------------------------------------------------------------

/** Props for the {@link MenuItem} component. */
export interface MenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  /** Whether the item is disabled. */
  disabled?: boolean;
  inset?: boolean;
}

/**
 * Menu item — a clickable option within a menu.
 */
const MenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  MenuItemProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2',
      'rounded-[var(--radius-default)] px-2 py-1.5 text-sm',
      'outline-none transition-colors duration-[var(--duration-fast)]',
      'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
MenuItem.displayName = 'MenuItem';

// ---------------------------------------------------------------------------
// MenuCheckboxItem
// ---------------------------------------------------------------------------

/** Props for the {@link MenuCheckboxItem} component. */
export interface MenuCheckboxItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {}

/**
 * Menu checkbox item — a toggleable option with a check indicator.
 */
const MenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  MenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2',
      'rounded-[var(--radius-default)] py-1.5 pl-8 pr-2 text-sm',
      'outline-none transition-colors duration-[var(--duration-fast)]',
      'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
MenuCheckboxItem.displayName = 'MenuCheckboxItem';

// ---------------------------------------------------------------------------
// MenuRadioGroup
// ---------------------------------------------------------------------------

/** Props for the {@link MenuRadioGroup} component. */
export interface MenuRadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup> {}

/**
 * Menu radio group — a group of mutually exclusive radio items.
 */
const MenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// ---------------------------------------------------------------------------
// MenuRadioItem
// ---------------------------------------------------------------------------

/** Props for the {@link MenuRadioItem} component. */
export interface MenuRadioItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> {}

/**
 * Menu radio item — a single-select option within a radio group.
 */
const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  MenuRadioItemProps
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2',
      'rounded-[var(--radius-default)] py-1.5 pl-8 pr-2 text-sm',
      'outline-none transition-colors duration-[var(--duration-fast)]',
      'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
MenuRadioItem.displayName = 'MenuRadioItem';

// ---------------------------------------------------------------------------
// MenuLabel
// ---------------------------------------------------------------------------

/** Props for the {@link MenuLabel} component. */
export interface MenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
}

/**
 * Menu label — non-interactive heading within a menu.
 */
const MenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  MenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
MenuLabel.displayName = 'MenuLabel';

// ---------------------------------------------------------------------------
// MenuSeparator
// ---------------------------------------------------------------------------

/** Props for the {@link MenuSeparator} component. */
export interface MenuSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}

/**
 * Menu separator — a horizontal divider between menu sections.
 */
const MenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  MenuSeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--border)]', className)}
    {...props}
  />
));
MenuSeparator.displayName = 'MenuSeparator';

// ---------------------------------------------------------------------------
// MenuGroup
// ---------------------------------------------------------------------------

/** Props for the {@link MenuGroup} component. */
export interface MenuGroupProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group> {}

/**
 * Menu group — a logical grouping of menu items.
 */
const MenuGroup = DropdownMenuPrimitive.Group;

// ---------------------------------------------------------------------------
// MenuSub
// ---------------------------------------------------------------------------

/** Props for the {@link MenuSub} component. */
export interface MenuSubProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub> {}

/**
 * Menu sub-menu root.
 */
const MenuSub = DropdownMenuPrimitive.Sub;

// ---------------------------------------------------------------------------
// MenuSubTrigger
// ---------------------------------------------------------------------------

/** Props for the {@link MenuSubTrigger} component. */
export interface MenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  inset?: boolean;
}

/**
 * Menu sub-trigger — opens a nested sub-menu.
 */
const MenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  MenuSubTriggerProps
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2',
      'rounded-[var(--radius-default)] px-2 py-1.5 text-sm',
      'outline-none transition-colors duration-[var(--duration-fast)]',
      'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
      'data-[state=open]:bg-[var(--accent)] data-[state=open]:text-[var(--accent-foreground)]',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
MenuSubTrigger.displayName = 'MenuSubTrigger';

// ---------------------------------------------------------------------------
// MenuSubContent
// ---------------------------------------------------------------------------

/** Props for the {@link MenuSubContent} component. */
export interface MenuSubContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {}

/**
 * Menu sub-content — the nested dropdown panel.
 */
const MenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  MenuSubContentProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden',
        'rounded-[var(--radius-lg)] bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)] shadow-[var(--shadow-lg)]',
        'p-1',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
MenuSubContent.displayName = 'MenuSubContent';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuLabel,
  MenuSeparator,
  MenuGroup,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
};
