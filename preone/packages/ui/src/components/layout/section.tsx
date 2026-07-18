/**
 * @preone/ui — Section Component
 *
 * Section with title, description, and content area.
 * Optionally collapsible with smooth animation.
 *
 * @example
 * ```tsx
 * <Section title="Attendance" description="Daily attendance records" collapsible>
 *   <AttendanceTable />
 * </Section>
 * ```
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

/** Props for the {@link Section} component. */
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Section title. */
  title?: React.ReactNode;
  /** Section description rendered below the title. */
  description?: React.ReactNode;
  /** Whether the section is collapsible. */
  collapsible?: boolean;
  /** Controlled open state (only used when `collapsible` is true). */
  open?: boolean;
  /** Default open state for uncontrolled collapsible sections. */
  defaultOpen?: boolean;
  /** Callback fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Section — a titled, optionally collapsible content region.
 *
 * Uses smooth height animation for collapse/expand transitions
 * and a rotating chevron indicator.
 */
const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      className,
      title,
      description,
      collapsible = false,
      open: controlledOpen,
      defaultOpen = true,
      onOpenChange,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

    const handleToggle = React.useCallback(() => {
      const next = !isOpen;
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    }, [isOpen, controlledOpen, onOpenChange]);

    return (
      <section
        ref={ref}
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn('flex flex-col gap-4', className)}
        {...props}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-start justify-between gap-4',
            collapsible && 'cursor-pointer select-none'
          )}
          onClick={collapsible ? handleToggle : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                  }
                }
              : undefined
          }
        >
          <div className="flex flex-col gap-1">
            {title && (
              <h2 className="text-lg font-semibold tracking-[var(--tracking-tight)] text-[var(--foreground)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {collapsible && (
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)] mt-0.5',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Collapsible content */}
        <div
          className={cn(
            'grid transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]',
            isOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">{children}</div>
        </div>
      </section>
    );
  }
);
Section.displayName = 'Section';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Section };
