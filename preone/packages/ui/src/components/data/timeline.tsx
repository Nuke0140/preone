/**
 * @preone/ui — Timeline Component
 *
 * A composable timeline system for displaying chronological events,
 * activity logs, and step progressions.
 *
 * Features:
 * - **Variants**: default, compact
 * - **Sub-components**: Timeline, TimelineItem, TimelineDot, TimelineContent
 * - **Dot colour variants**: default, primary, success, warning, destructive, info
 * - **forwardRef**: Full ref forwarding on all sub-components
 * - **ARIA**: Ordered list semantics for chronological items
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Timeline, TimelineItem, TimelineDot, TimelineContent } from '@preone/ui/data';
 *
 * <Timeline variant="default">
 *   <TimelineItem>
 *     <TimelineDot variant="success" />
 *     <TimelineContent>
 *       <h4>Order placed</h4>
 *       <p>Your order has been confirmed.</p>
 *     </TimelineContent>
 *   </TimelineItem>
 *   <TimelineItem>
 *     <TimelineDot variant="primary" />
 *     <TimelineContent>
 *       <h4>Processing</h4>
 *       <p>We're preparing your order.</p>
 *     </TimelineContent>
 *   </TimelineItem>
 * </Timeline>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Timeline Variants
// ---------------------------------------------------------------------------

/** Layout variant for the Timeline component. */
export type TimelineVariant = 'default' | 'compact';

/**
 * Timeline variant definitions using `class-variance-authority`.
 */
export const timelineVariants = cva('flex flex-col', {
  variants: {
    variant: {
      /** Default — generous spacing between items. */
      default: 'gap-6',
      /** Compact — tighter spacing for dense activity logs. */
      compact: 'gap-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

// ---------------------------------------------------------------------------
// TimelineDot Variants
// ---------------------------------------------------------------------------

/** Colour variant for the TimelineDot component. */
export type TimelineDotVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

/** Maps dot variant to colour classes. */
const dotColorMap: Record<TimelineDotVariant, string> = {
  default: 'bg-[var(--color-muted-foreground)]',
  primary: 'bg-[var(--color-primary)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  destructive: 'bg-[var(--color-destructive)]',
  info: 'bg-[var(--color-info)]',
};

/**
 * TimelineDot variant definitions using `class-variance-authority`.
 */
export const timelineDotVariants = cva(
  [
    'shrink-0 rounded-[var(--radius-full)]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: dotColorMap.default,
        primary: dotColorMap.primary,
        success: dotColorMap.success,
        warning: dotColorMap.warning,
        destructive: dotColorMap.destructive,
        info: dotColorMap.info,
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Timeline} component.
 *
 * Extends standard `<ol>` attributes with PreOne timeline variants.
 */
export interface TimelineProps
  extends React.OlHTMLAttributes<HTMLOListElement>,
    VariantProps<typeof timelineVariants> {}

/**
 * PreOne Timeline — an ordered list of chronological events.
 *
 * **Accessibility:**
 * - Uses `<ol>` for ordered list semantics (items have chronological order)
 *
 * @param props - All TimelineProps plus standard `<ol>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<ol>` element.
 */
export const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, variant, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(timelineVariants({ variant }), className)}
      {...props}
    />
  ),
);
Timeline.displayName = 'Timeline';

// ---------------------------------------------------------------------------
// TimelineItem
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TimelineItem} component.
 *
 * Extends standard `<li>` attributes.
 */
export interface TimelineItemProps extends React.LiHTMLAttributes<HTMLLIElement> {}

/**
 * PreOne TimelineItem — a single event in the timeline.
 *
 * Lays out the dot, connector line, and content horizontally.
 *
 * @param props - Standard `<li>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<li>` element.
 */
export const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={cn('relative flex gap-4', className)}
      {...props}
    />
  ),
);
TimelineItem.displayName = 'TimelineItem';

// ---------------------------------------------------------------------------
// TimelineDot
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TimelineDot} component.
 *
 * Extends standard `<span>` attributes with PreOne dot colour variants.
 */
export interface TimelineDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof timelineDotVariants> {}

/**
 * PreOne TimelineDot — the visual indicator on the timeline.
 *
 * Also renders the vertical connector line to the next item.
 * The connector is rendered as a pseudo-element via the parent `TimelineItem`.
 *
 * @param props - All TimelineDotProps plus standard span HTML attributes.
 * @param ref - Forwarded ref to the underlying `<span>` element.
 */
export const TimelineDot = React.forwardRef<HTMLSpanElement, TimelineDotProps>(
  ({ className, variant, ...props }, ref) => (
    <div className="flex flex-col items-center">
      <span
        ref={ref}
        className={cn(
          timelineDotVariants({ variant }),
          'h-3 w-3 mt-1',
          className,
        )}
        aria-hidden="true"
        {...props}
      />
      {/* Connector line */}
      <div
        className="w-px flex-1 bg-[var(--color-border)] mt-2"
        aria-hidden="true"
      />
    </div>
  ),
);
TimelineDot.displayName = 'TimelineDot';

// ---------------------------------------------------------------------------
// TimelineContent
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TimelineContent} component.
 *
 * Extends standard `<div>` attributes.
 */
export interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PreOne TimelineContent — the text area beside a timeline dot.
 *
 * Contains the event title, description, timestamp, etc.
 *
 * @param props - Standard `<div>` HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 */
export const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex-1 pb-6',
        className,
      )}
      {...props}
    />
  ),
);
TimelineContent.displayName = 'TimelineContent';
