/**
 * @preone/ui — Footer Component
 *
 * App footer with sections for links, branding, and legal content.
 *
 * @example
 * ```tsx
 * <Footer>
 *   <FooterSection title="Product">
 *     <FooterLink href="#">Features</FooterLink>
 *     <FooterLink href="#">Pricing</FooterLink>
 *   </FooterSection>
 *   <FooterSection title="Company">
 *     <FooterLink href="#">About</FooterLink>
 *   </FooterSection>
 *   <FooterBottom>© 2025 PreOne</FooterBottom>
 * </Footer>
 * ```
 */

import * as React from 'react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

/** Props for the {@link Footer} component. */
export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

/**
 * App footer — provides a consistent footer with sections.
 */
const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, children, ...props }, ref) => (
    <footer
      ref={ref}
      className={cn(
        'w-full border-t border-[var(--border)] bg-[var(--background)]',
        className
      )}
      {...props}
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {children}
        </div>
      </div>
    </footer>
  )
);
Footer.displayName = 'Footer';

// ---------------------------------------------------------------------------
// FooterSection
// ---------------------------------------------------------------------------

/** Props for the {@link FooterSection} component. */
export interface FooterSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Section title. */
  title?: React.ReactNode;
}

/**
 * Footer section — a column in the footer with a title and links.
 */
const FooterSection = React.forwardRef<HTMLDivElement, FooterSectionProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
      {title && (
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
);
FooterSection.displayName = 'FooterSection';

// ---------------------------------------------------------------------------
// FooterLink
// ---------------------------------------------------------------------------

/** Props for the {@link FooterLink} component. */
export interface FooterLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

/**
 * Footer link — a styled link within a footer section.
 */
const FooterLink = React.forwardRef<HTMLAnchorElement, FooterLinkProps>(
  ({ className, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        'text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-[var(--radius-sm)]',
        className
      )}
      {...props}
    />
  )
);
FooterLink.displayName = 'FooterLink';

// ---------------------------------------------------------------------------
// FooterBottom
// ---------------------------------------------------------------------------

/** Props for the {@link FooterBottom} component. */
export interface FooterBottomProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Footer bottom bar — typically contains copyright and legal links.
 */
const FooterBottom = React.forwardRef<HTMLDivElement, FooterBottomProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-t border-[var(--border)] mt-8 pt-6',
        'text-sm text-[var(--muted-foreground)]',
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
      {...props}
    />
  )
);
FooterBottom.displayName = 'FooterBottom';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Footer, FooterSection, FooterLink, FooterBottom };
