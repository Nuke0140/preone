/**
 * @preone/ui — Command Palette Component
 *
 * Command palette (⌘K) with search, keyboard navigation.
 * Inspired by Linear, Stripe, and Vercel command palettes.
 *
 * Sub-components: CommandPalette, CommandInput, CommandList,
 * CommandItem, CommandGroup, CommandEmpty.
 *
 * @example
 * ```tsx
 * <CommandPalette open={isOpen} onOpenChange={setIsOpen}>
 *   <CommandInput placeholder="Type a command or search..." />
 *   <CommandList>
 *     <CommandEmpty>No results found.</CommandEmpty>
 *     <CommandGroup heading="Suggestions">
 *       <CommandItem onSelect={() => navigate('/dashboard')}>
 *         <Home className="mr-2 h-4 w-4" />
 *         Dashboard
 *       </CommandItem>
 *       <CommandItem onSelect={() => navigate('/students')}>
 *         <Users className="mr-2 h-4 w-4" />
 *         Students
 *       </CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandPalette>
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

/** Props for the {@link CommandPalette} component. */
export interface CommandPaletteProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {}

/**
 * Command palette root — wraps Radix UI Dialog with keyboard shortcut support.
 *
 * Should be controlled via `open` / `onOpenChange` props, typically
 * triggered by ⌘K / Ctrl+K.
 */
const CommandPalette = DialogPrimitive.Root;

// ---------------------------------------------------------------------------
// CommandPaletteTrigger (hidden — typically triggered by keyboard shortcut)
// ---------------------------------------------------------------------------

/** Props for the {@link CommandPaletteTrigger} component. */
export interface CommandPaletteTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

/**
 * Command palette trigger — typically hidden; the palette is opened
 * via keyboard shortcut (⌘K) instead.
 */
const CommandPaletteTrigger = DialogPrimitive.Trigger;

// ---------------------------------------------------------------------------
// CommandPaletteContent (overlay + dialog)
// ---------------------------------------------------------------------------

/** Props for the {@link CommandPaletteContent} component. */
export interface CommandPaletteContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

/**
 * Command palette content — the overlay and dialog container.
 *
 * Renders a centered dialog with backdrop blur following
 * the Metro/Fluent design language.
 */
const CommandPaletteContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  CommandPaletteContentProps
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50',
        'bg-[var(--foreground)]/40 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-[20%] z-50 w-full max-w-lg',
        '-translate-x-1/2',
        'overflow-hidden rounded-[var(--radius-xl)]',
        'bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)] shadow-[var(--shadow-2xl)]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
CommandPaletteContent.displayName = 'CommandPaletteContent';

// ---------------------------------------------------------------------------
// CommandInput
// ---------------------------------------------------------------------------

/** Props for the {@link CommandInput} component. */
export interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Command palette search input — appears at the top of the palette
 * with a search icon and filters results as the user types.
 */
const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <div
      className="flex items-center border-b border-[var(--border)] px-4"
      cmdk-input-wrapper=""
    >
      <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      <input
        ref={ref}
        type="text"
        role="searchbox"
        aria-label="Search commands"
        className={cn(
          'flex h-12 w-full bg-transparent py-3 text-sm outline-none',
          'placeholder:text-[var(--muted-foreground)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
);
CommandInput.displayName = 'CommandInput';

// ---------------------------------------------------------------------------
// CommandList
// ---------------------------------------------------------------------------

/** Props for the {@link CommandList} component. */
export interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Command list — scrollable container for command groups and items.
 * Limits height with overflow scrolling.
 */
const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('max-h-[300px] overflow-y-auto p-2', className)}
      {...props}
    />
  )
);
CommandList.displayName = 'CommandList';

// ---------------------------------------------------------------------------
// CommandGroup
// ---------------------------------------------------------------------------

/** Props for the {@link CommandGroup} component. */
export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group heading label. */
  heading?: React.ReactNode;
}

/**
 * Command group — a labelled section within the command list.
 */
const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      aria-label={typeof heading === 'string' ? heading : undefined}
      className={cn('py-1', className)}
      {...props}
    >
      {heading && (
        <div className="px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
);
CommandGroup.displayName = 'CommandGroup';

// ---------------------------------------------------------------------------
// CommandItem
// ---------------------------------------------------------------------------

/** Props for the {@link CommandItem} component. */
export interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether this item is disabled. */
  disabled?: boolean;
}

/**
 * Command item — a selectable action within the command palette.
 * Supports keyboard navigation and visual feedback on hover/focus.
 */
const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, disabled = false, ...props }, ref) => (
    <div
      ref={ref}
      role="option"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2',
        'rounded-[var(--radius-default)] px-2 py-2 text-sm',
        'outline-none transition-colors duration-[var(--duration-fast)]',
        'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
        'focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)]',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    />
  )
);
CommandItem.displayName = 'CommandItem';

// ---------------------------------------------------------------------------
// CommandEmpty
// ---------------------------------------------------------------------------

/** Props for the {@link CommandEmpty} component. */
export interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Command empty — shown when no results match the search query.
 */
const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        'py-6 text-center text-sm text-[var(--muted-foreground)]',
        className
      )}
      {...props}
    />
  )
);
CommandEmpty.displayName = 'CommandEmpty';

// ---------------------------------------------------------------------------
// CommandSeparator
// ---------------------------------------------------------------------------

/** Props for the {@link CommandSeparator} component. */
export interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Command separator — a horizontal divider between command groups.
 */
const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-[var(--border)]', className)}
      {...props}
    />
  )
);
CommandSeparator.displayName = 'CommandSeparator';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  CommandPalette,
  CommandPaletteTrigger,
  CommandPaletteContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
};
