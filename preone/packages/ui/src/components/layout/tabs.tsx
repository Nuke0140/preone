/**
 * @preone/ui — Tabs Component
 *
 * Using @radix-ui/react-tabs with custom styling.
 * Variants: default, pills, underline.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview" variant="pills">
 *   <TabList>
 *     <TabTrigger value="overview">Overview</TabTrigger>
 *     <TabTrigger value="analytics">Analytics</TabTrigger>
 *   </TabList>
 *   <TabContent value="overview">Overview content</TabContent>
 *   <TabContent value="analytics">Analytics content</TabContent>
 * </Tabs>
 * ```
 */

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Tabs Context
// ---------------------------------------------------------------------------

interface TabsContextValue {
  variant: 'default' | 'pills' | 'underline';
}

const TabsContext = React.createContext<TabsContextValue>({ variant: 'default' });

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

/** Props for the {@link Tabs} component. */
export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  /** Visual variant of the tabs. */
  variant?: 'default' | 'pills' | 'underline';
}

/**
 * Tabs root — wraps Radix UI Tabs with PreOne styling and variant support.
 */
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ variant = 'default', ...props }, ref) => (
  <TabsContext.Provider value={{ variant }}>
    <TabsPrimitive.Root ref={ref} {...props} />
  </TabsContext.Provider>
));
Tabs.displayName = 'Tabs';

// ---------------------------------------------------------------------------
// TabList
// ---------------------------------------------------------------------------

const tabListVariants = cva(
  'inline-flex items-center gap-1',
  {
    variants: {
      variant: {
        default: 'bg-[var(--muted)] rounded-[var(--radius-lg)] p-1',
        pills: 'gap-2',
        underline: 'gap-0 border-b border-[var(--border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/** Props for the {@link TabList} component. */
export interface TabListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {}

/**
 * Tab list — container for tab triggers.
 */
const TabList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabListProps
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabListVariants({ variant }), className)}
      {...props}
    />
  );
});
TabList.displayName = 'TabList';

// ---------------------------------------------------------------------------
// TabTrigger
// ---------------------------------------------------------------------------

const tabTriggerVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'text-sm font-medium transition-all duration-[var(--duration-fast)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'rounded-[var(--radius-default)] px-3 py-1.5',
          'text-[var(--muted-foreground)]',
          'data-[state=active]:bg-[var(--background)] data-[state=active]:text-[var(--foreground)]',
          'data-[state=active]:shadow-[var(--shadow-sm)]',
          'hover:text-[var(--foreground)]',
        ].join(' '),
        pills: [
          'rounded-full px-4 py-1.5',
          'text-[var(--muted-foreground)]',
          'data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)]',
          'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
        ].join(' '),
        underline: [
          'border-b-2 border-transparent px-4 pb-3 pt-2 -mb-px',
          'text-[var(--muted-foreground)]',
          'data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--foreground)]',
          'hover:text-[var(--foreground)] hover:border-[var(--border)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/** Props for the {@link TabTrigger} component. */
export interface TabTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {}

/**
 * Tab trigger — a clickable tab header button.
 * Styled according to the parent Tabs variant.
 */
const TabTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabTriggerProps
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabTriggerVariants({ variant }), className)}
      {...props}
    />
  );
});
TabTrigger.displayName = 'TabTrigger';

// ---------------------------------------------------------------------------
// TabContent
// ---------------------------------------------------------------------------

/** Props for the {@link TabContent} component. */
export interface TabContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}

/**
 * Tab content — the panel associated with a tab trigger.
 */
const TabContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
      className
    )}
    {...props}
  />
));
TabContent.displayName = 'TabContent';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Tabs, TabList, TabTrigger, TabContent, tabListVariants, tabTriggerVariants };
