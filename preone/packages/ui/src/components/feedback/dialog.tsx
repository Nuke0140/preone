/**
 * @preone/ui — Dialog Component
 *
 * A composable dialog/modal system using @radix-ui/react-dialog.
 * Accessible, animated, and fully composable with sub-components.
 *
 * Features:
 * - **@radix-ui/react-dialog**: Full accessibility with focus trapping and scroll lock
 * - **Sub-components**: Dialog, DialogTrigger, DialogContent, DialogHeader,
 *   DialogTitle, DialogDescription, DialogFooter, DialogClose
 * - **Sizes**: sm, default, lg, xl, full
 * - **Overlay animation**: Smooth fade and scale
 * - **forwardRef**: Full ref forwarding on all sub-components
 * - **ARIA**: Complete accessibility via Radix primitives
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import {
 *   Dialog, DialogTrigger, DialogContent,
 *   DialogHeader, DialogTitle, DialogDescription,
 *   DialogFooter, DialogClose,
 * } from '@preone/ui/feedback';
 *
 * <Dialog>
 *   <DialogTrigger asChild>
 *     <Button>Open Dialog</Button>
 *   </DialogTrigger>
 *   <DialogContent size="default">
 *     <DialogHeader>
 *       <DialogTitle>Confirm Action</DialogTitle>
 *       <DialogDescription>Are you sure you want to proceed?</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <DialogClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DialogClose>
 *       <Button>Confirm</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Size Variants
// ---------------------------------------------------------------------------

/** Size variant for the DialogContent component. */
export type DialogSize = 'sm' | 'default' | 'lg' | 'xl' | 'full';

/**
 * DialogContent size definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-card` / `--color-card-foreground` — dialog surface
 * - `--color-border` — border colour
 * - `--radius-lg` — dialog radius
 * - `--shadow-lg` — elevation shadow
 */
export const dialogContentVariants = cva(
  [
    'fixed left-1/2 top-1/2 z-50',
    'grid w-full',
    'translate-x-[-50%] translate-y-[-50%]',
    'border border-[var(--color-border)]',
    'bg-[var(--color-card)] text-[var(--color-card-foreground)]',
    'rounded-[var(--radius-lg)]',
    'shadow-[var(--shadow-lg)]',
    'duration-[var(--duration-normal,300ms)]',
    // Open state
    'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
    // Closed state
    'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95',
  ].join(' '),
  {
    variants: {
      size: {
        /** Small — 400px max width. */
        sm: 'max-w-[400px] p-6 gap-4',
        /** Default — 480px max width. */
        default: 'max-w-[480px] p-6 gap-4',
        /** Large — 600px max width. */
        lg: 'max-w-[600px] p-8 gap-6',
        /** Extra-large — 800px max width. */
        xl: 'max-w-[800px] p-8 gap-6',
        /** Full — nearly full viewport. */
        full: 'max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)] p-8 gap-6',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Dialog} component.
 *
 * Extends Radix Dialog root props.
 */
export interface DialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {}

/**
 * PreOne Dialog — the root container that manages open/close state.
 *
 * @param props - Radix Dialog root props.
 */
export const Dialog = DialogPrimitive.Root;

// ---------------------------------------------------------------------------
// DialogTrigger
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogTrigger} component.
 */
export interface DialogTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

/**
 * PreOne DialogTrigger — the element that opens the dialog.
 *
 * @param props - Radix DialogTrigger props.
 */
export const DialogTrigger = DialogPrimitive.Trigger;

// ---------------------------------------------------------------------------
// DialogPortal
// ---------------------------------------------------------------------------

/** Internal portal — renders dialog content in the document body. */
const DialogPortal = DialogPrimitive.Portal;

// ---------------------------------------------------------------------------
// DialogOverlay
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogOverlay} component.
 */
export interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

/**
 * PreOne DialogOverlay — the semi-transparent backdrop behind the dialog.
 *
 * @param props - Radix DialogOverlay props.
 * @param ref - Forwarded ref.
 */
export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      'bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ---------------------------------------------------------------------------
// DialogContent
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogContent} component.
 */
export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

/**
 * PreOne DialogContent — the main content area of the dialog.
 *
 * Includes the overlay, close button, and focus trap.
 *
 * @param props - All DialogContentProps plus Radix DialogContent props.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 */
export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
      {/* Close button */}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4',
          'inline-flex items-center justify-center',
          'h-7 w-7 rounded-[var(--radius-md)]',
          'text-[var(--color-muted-foreground)]',
          'hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
        )}
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// ---------------------------------------------------------------------------
// DialogHeader
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogHeader} component.
 */
export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PreOne DialogHeader — stacks title and description vertically.
 *
 * @param props - Standard `<div>` HTML attributes.
 * @param ref - Forwarded ref.
 */
export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  ),
);
DialogHeader.displayName = 'DialogHeader';

// ---------------------------------------------------------------------------
// DialogTitle
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogTitle} component.
 */
export interface DialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

/**
 * PreOne DialogTitle — the dialog heading.
 *
 * @param props - Radix DialogTitle props.
 * @param ref - Forwarded ref.
 */
export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-[var(--tracking-tight,-0.01em)]',
      'text-[var(--color-foreground)]',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ---------------------------------------------------------------------------
// DialogDescription
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogDescription} component.
 */
export interface DialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}

/**
 * PreOne DialogDescription — muted description below the title.
 *
 * @param props - Radix DialogDescription props.
 * @param ref - Forwarded ref.
 */
export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-muted-foreground)]', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ---------------------------------------------------------------------------
// DialogFooter
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogFooter} component.
 */
export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PreOne DialogFooter — right-aligned action area at the bottom of the dialog.
 *
 * @param props - Standard `<div>` HTML attributes.
 * @param ref - Forwarded ref.
 */
export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3',
        className,
      )}
      {...props}
    />
  ),
);
DialogFooter.displayName = 'DialogFooter';

// ---------------------------------------------------------------------------
// DialogClose
// ---------------------------------------------------------------------------

/**
 * Props for the {@link DialogClose} component.
 */
export interface DialogCloseProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {}

/**
 * PreOne DialogClose — a button that closes the dialog.
 *
 * @param props - Radix DialogClose props.
 */
export const DialogClose = DialogPrimitive.Close;
