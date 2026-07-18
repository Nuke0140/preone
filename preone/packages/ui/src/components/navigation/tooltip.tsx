/**
 * @preone/ui — Tooltip Component
 *
 * Using @radix-ui/react-tooltip with custom PreOne styling.
 * Simple tooltip with configurable delay.
 *
 * @example
 * ```tsx
 * <TooltipProvider delayDuration={300}>
 *   <Tooltip>
 *     <TooltipTrigger asChild>
 *       <Button variant="ghost">Hover me</Button>
 *     </TooltipTrigger>
 *     <TooltipContent>Helpful information</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 * ```
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// TooltipProvider
// ---------------------------------------------------------------------------

/** Props for the {@link TooltipProvider} component. */
export interface TooltipProviderProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {}

/**
 * Tooltip provider — must wrap any tooltip usage.
 * Configures delay duration and other tooltip behaviours.
 */
const TooltipProvider = TooltipPrimitive.Provider;

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/** Props for the {@link Tooltip} component. */
export interface TooltipProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {}

/**
 * Tooltip root — wraps Radix UI Tooltip.
 */
const Tooltip = TooltipPrimitive.Root;

// ---------------------------------------------------------------------------
// TooltipTrigger
// ---------------------------------------------------------------------------

/** Props for the {@link TooltipTrigger} component. */
export interface TooltipTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {}

/**
 * Tooltip trigger — the element that activates the tooltip on hover/focus.
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

// ---------------------------------------------------------------------------
// TooltipContent
// ---------------------------------------------------------------------------

/** Props for the {@link TooltipContent} component. */
export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {}

/**
 * Tooltip content — the floating label that appears on hover/focus.
 *
 * Styled with subtle shadow, rounded corners, and smooth animations.
 * Uses `var(--popover)` background for consistency.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-[var(--radius-default)]',
      'bg-[var(--popover)] text-[var(--popover-foreground)]',
      'border border-[var(--border)] shadow-[var(--shadow-md)]',
      'px-3 py-1.5 text-xs',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  >
    {children}
    <TooltipPrimitive.Arrow
      className="fill-[var(--popover)]"
      width={8}
      height={4}
    />
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = 'TooltipContent';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
