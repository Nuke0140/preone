/**
 * @preone/ui — Popover Component
 *
 * Using @radix-ui/react-popover with custom PreOne styling.
 * Supports arrow, side/align options, and smooth animations.
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger asChild>
 *     <Button variant="outline">Open</Button>
 *   </PopoverTrigger>
 *   <PopoverContent side="bottom" align="start">
 *     <p>Popover content here</p>
 *   </PopoverContent>
 * </Popover>
 * ```
 */

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------

/** Props for the {@link Popover} component. */
export interface PopoverProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {}

/**
 * Popover root — wraps Radix UI Popover.
 */
const Popover = PopoverPrimitive.Root;

// ---------------------------------------------------------------------------
// PopoverTrigger
// ---------------------------------------------------------------------------

/** Props for the {@link PopoverTrigger} component. */
export interface PopoverTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {}

/**
 * Popover trigger — the element that opens the popover.
 */
const PopoverTrigger = PopoverPrimitive.Trigger;

// ---------------------------------------------------------------------------
// PopoverContent
// ---------------------------------------------------------------------------

/** Props for the {@link PopoverContent} component. */
export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /** Whether to show the arrow pointer. */
  showArrow?: boolean;
}

/**
 * Popover content — the floating panel with custom PreOne styling.
 *
 * Styled with soft shadows, rounded corners, and smooth enter/exit
 * animations following the Metro/Fluent design language.
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = 'center', sideOffset = 4, showArrow = false, children, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-[var(--radius-lg)]',
        'bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)] shadow-[var(--shadow-lg)]',
        'outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    >
      {children}
      {showArrow && (
        <PopoverPrimitive.Arrow
          className="fill-[var(--popover)] drop-shadow-sm"
          width={12}
          height={6}
          offset={4}
        />
      )}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

// ---------------------------------------------------------------------------
// PopoverClose
// ---------------------------------------------------------------------------

/** Props for the {@link PopoverClose} component. */
export interface PopoverCloseProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Close> {}

/**
 * Popover close — a button that closes the popover when clicked.
 */
const PopoverClose = PopoverPrimitive.Close;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
