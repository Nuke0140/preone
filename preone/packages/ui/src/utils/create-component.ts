/**
 * @preone/ui — createComponent Factory
 *
 * A type-safe factory for creating React components with:
 * - `forwardRef` support (ref forwarding)
 * - `displayName` for DevTools
 * - Default className merging with `cn()`
 * - Variant support via `class-variance-authority` (cva)
 *
 * This factory reduces boilerplate when defining UI components that follow
 * the PreOne design system conventions.
 *
 * @example
 * ```tsx
 * import { createComponent } from '@preone/ui';
 * import { cva } from 'class-variance-authority';
 *
 * const cardVariants = cva('rounded-lg p-6', {
 *   variants: {
 *     variant: {
 *       elevated: 'shadow-md',
 *       outlined: 'border border-[var(--border)]',
 *     },
 *   },
 *   defaultVariants: { variant: 'elevated' },
 * });
 *
 * const Card = createComponent<'div', { variant?: 'elevated' | 'outlined' }>({
 *   name: 'Card',
 *   variants: cardVariants,
 *   render: (props, ref, className) => (
 *     <div ref={ref} className={className} {...props} />
 *   ),
 * });
 * ```
 */

import React, { forwardRef, type ComponentPropsWithRef, type ElementType, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from './cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A mapping of HTML element tag names to their intrinsic props.
 * Used to infer the correct prop type for polymorphic components.
 */
type IntrinsicElementProps<T extends ElementType> = ComponentPropsWithRef<T>;

/**
 * Options for the `createComponent` factory.
 *
 * @typeParam TElement - The HTML element type (e.g., `'div'`, `'button'`).
 * @typeParam TVariants - The variant function returned by `cva()`.
 * @typeParam TAdditionalProps - Additional props beyond the intrinsic element props.
 */
export interface CreateComponentOptions<
  TElement extends ElementType,
  TVariants extends ReturnType<typeof import('class-variance-authority').cva> | undefined = undefined,
  TAdditionalProps extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Display name for React DevTools. Must be a valid component name. */
  name: string;

  /**
   * The variant function produced by `cva()`.
   * When provided, the component automatically supports `variant` and `size`
   * props, and the resolved class string is merged into the className.
   */
  variants?: TVariants;

  /**
   * Default HTML element to render.
   * Used for `displayName` and type inference.
   */
  element?: TElement;

  /**
   * Custom render function.
   *
   * Receives the full props (with variant props resolved and className merged),
   * the forwarded ref, and the final merged className string.
   *
   * @param props - All component props with variant values resolved.
   * @param ref - The forwarded ref.
   * @param className - The fully merged className (base + variants + user className).
   * @returns The rendered React element.
   */
  render: (
    props: (TElement extends ElementType
      ? IntrinsicElementProps<TElement>
      : Record<string, unknown>) &
      (TVariants extends undefined ? {} : VariantProps<NonNullable<TVariants>>) &
      TAdditionalProps & { className?: string },
    ref: React.ForwardedRef<any>,
    className: string,
  ) => React.ReactNode;
}

/**
 * The component type returned by `createComponent`.
 *
 * Extends `ForwardRefExoticComponent` with variant props support.
 */
export type PreOneComponent<
  TElement extends ElementType,
  TVariants extends ReturnType<typeof import('class-variance-authority').cva> | undefined = undefined,
  TAdditionalProps extends Record<string, unknown> = Record<string, unknown>,
> = ForwardRefExoticComponent<
  (TElement extends ElementType
    ? IntrinsicElementProps<TElement>
    : Record<string, unknown>) &
    (TVariants extends undefined ? {} : VariantProps<NonNullable<TVariants>>) &
    TAdditionalProps &
    RefAttributes<any>
> & {
  displayName?: string;
};

// ---------------------------------------------------------------------------
// createComponent
// ---------------------------------------------------------------------------

/**
 * Creates a type-safe React component with forwardRef, displayName,
 * and variant support.
 *
 * The factory handles:
 * 1. Resolving variant class names via the `cva` function.
 * 2. Merging the resolved classes with any user-provided `className`.
 * 3. Forwarding the ref to the underlying element.
 * 4. Setting `displayName` for React DevTools.
 *
 * @typeParam TElement - The underlying HTML element type.
 * @typeParam TVariants - The `cva` variant function type (or `undefined`).
 * @typeParam TAdditionalProps - Additional props beyond intrinsic + variant props.
 * @param options - The component configuration options.
 * @returns A forwardRef component with displayName and variant support.
 *
 * @example
 * ```tsx
 * const Button = createComponent<'button', typeof buttonVariants>({
 *   name: 'Button',
 *   variants: buttonVariants,
 *   render: (props, ref, className) => (
 *     <button ref={ref} className={className} {...props} />
 *   ),
 * });
 * ```
 */
export function createComponent<
  TElement extends ElementType = 'div',
  TVariants extends ReturnType<typeof import('class-variance-authority').cva> | undefined = undefined,
  TAdditionalProps extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateComponentOptions<TElement, TVariants, TAdditionalProps>,
): PreOneComponent<TElement, TVariants, TAdditionalProps> {
  const { name, variants, render } = options;

  const Component = forwardRef<any, any>((props, ref) => {
    // Extract className from props
    const { className: userClassName, ...restProps } = props;

    // Resolve variant classes if a cva function is provided
    let variantClassName = '';
    if (variants) {
      variantClassName = variants(restProps) as string;
    }

    // Merge all class sources: variant classes + user className
    const mergedClassName = cn(variantClassName, userClassName);

    return render(restProps as any, ref, mergedClassName);
  });

  Component.displayName = name;

  return Component as PreOneComponent<TElement, TVariants, TAdditionalProps>;
}
