/**
 * @preone/ui — Accordion Component
 *
 * Using @radix-ui/react-accordion with custom styling and ChevronDown animation.
 *
 * @example
 * ```tsx
 * <Accordion type="single" collapsible>
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Section 1</AccordionTrigger>
 *     <AccordionContent>Content for section 1</AccordionContent>
 *   </AccordionItem>
 *   <AccordionItem value="item-2">
 *     <AccordionTrigger>Section 2</AccordionTrigger>
 *     <AccordionContent>Content for section 2</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 */

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

/** Props for the {@link Accordion} component. */
export type AccordionProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>;

/**
 * Accordion root — wraps Radix UI Accordion with PreOne styling.
 *
 * Supports `type="single"` (one item open at a time) and
 * `type="multiple"` (multiple items open simultaneously).
 */
const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  AccordionProps
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={cn('divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]', className)}
    {...props}
  />
)) as React.ForwardRefExoticComponent<AccordionProps & React.RefAttributes<HTMLDivElement>>;
Accordion.displayName = 'Accordion';

// ---------------------------------------------------------------------------
// AccordionItem
// ---------------------------------------------------------------------------

/** Props for the {@link AccordionItem} component. */
export interface AccordionItemProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {}

/**
 * Accordion item — a single collapsible section within the accordion.
 */
const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  AccordionItemProps
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b-0 first:rounded-t-[var(--radius-lg)] last:rounded-b-[var(--radius-lg)]', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

// ---------------------------------------------------------------------------
// AccordionTrigger
// ---------------------------------------------------------------------------

/** Props for the {@link AccordionTrigger} component. */
export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {}

/**
 * Accordion trigger — clickable header that toggles the content panel.
 * Includes a rotating chevron icon indicating open/closed state.
 */
const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between gap-4',
        'px-6 py-4',
        'text-sm font-semibold text-[var(--foreground)]',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset',
        'group',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)] group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';

// ---------------------------------------------------------------------------
// AccordionContent
// ---------------------------------------------------------------------------

/** Props for the {@link AccordionContent} component. */
export interface AccordionContentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {}

/**
 * Accordion content — the collapsible panel content.
 * Uses Radix UI's data-state for smooth height animation.
 */
const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'overflow-hidden text-sm text-[var(--muted-foreground)]',
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className
    )}
    {...props}
  >
    <div className="px-6 pb-4 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = 'AccordionContent';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
