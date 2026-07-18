import * as React from 'react';
import {
  useFieldArray,
  type UseFieldArrayReturn,
  type UseFieldArrayProps,
  type FieldValues,
  type FieldArrayPath,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from './cn.js';

/**
 * Props for the FieldArray component.
 */
export interface FieldArrayProps<
  T extends FieldValues,
  TName extends FieldArrayPath<T>,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The form instance from useForm */
  form: UseFormReturn<T>;
  /** Field array name */
  name: TName;
  /** react-hook-form useFieldArray configuration */
  fieldArrayConfig?: Omit<
    UseFieldArrayProps<T, TName>,
    'name' | 'control'
  >;
  /** Render function receiving field array methods and items */
  children: (
    fields: UseFieldArrayReturn<T, TName>,
  ) => React.ReactNode;
  /** Label for the field array section */
  label?: string;
  /** Whether the field array is disabled */
  disabled?: boolean;
  /** Whether the field array is loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Maximum number of items allowed */
  maxItems?: number;
  /** Whether to show add button */
  showAddButton?: boolean;
  /** Whether to show remove button per item */
  showRemoveButton?: boolean;
  /** Add button label */
  addLabel?: string;
  /** Remove button label */
  removeLabel?: string;
}

/**
 * PreOne FieldArray component wrapping react-hook-form's useFieldArray
 * for dynamic field lists with add/remove controls.
 *
 * @example
 * ```tsx
 * <FieldArray form={methods} name="items" label="Items">
 *   {({ fields, append, remove }) => (
 *     <>
 *       {fields.map((field, i) => (
 *         <div key={field.id}>
 *           <input {...register(`items.${i}.name`)} />
 *           <button onClick={() => remove(i)}>Remove</button>
 *         </div>
 *       ))}
 *     </>
 *   )}
 * </FieldArray>
 * ```
 */
export const FieldArray = React.forwardRef<
  HTMLDivElement,
  FieldArrayProps<any, any>
>(
  <T extends FieldValues, TName extends FieldArrayPath<T>>(
    {
      form,
      name,
      fieldArrayConfig,
      children,
      label,
      disabled = false,
      loading = false,
      dark = false,
      maxItems,
      showAddButton = true,
      showRemoveButton = true,
      addLabel = 'Add Item',
      removeLabel = 'Remove',
      className,
      ...props
    }: FieldArrayProps<T, TName>,
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const fieldArray = useFieldArray<T, TName>({
      ...fieldArrayConfig,
      name,
      control: form.control,
    });

    const canAdd = !maxItems || fieldArray.fields.length < maxItems;

    const handleAdd = () => {
      if (canAdd && !disabled) {
        fieldArray.append({} as any);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        role="group"
        aria-label={label || `Field array: ${String(name)}`}
        aria-disabled={disabled}
        aria-busy={loading}
        data-dark={dark || undefined}
        {...props}
      >
        {label && (
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'font-medium text-sm text-[var(--preone-text-primary)]',
                dark && 'text-[var(--preone-text-primary-dark)]',
              )}
            >
              {label}
            </span>
            {maxItems && (
              <span className="text-xs text-[var(--preone-text-secondary)]">
                {fieldArray.fields.length}/{maxItems}
              </span>
            )}
          </div>
        )}

        <div className={cn(loading && 'animate-pulse')}>
          {children(fieldArray)}
        </div>

        {showAddButton && canAdd && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !canAdd}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
              'bg-[var(--preone-color-primary)] text-white hover:opacity-90',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)] focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              dark && 'ring-offset-[var(--preone-surface-dark)]',
            )}
            aria-label={addLabel}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            {addLabel}
          </button>
        )}
      </div>
    );
  },
) as <T extends FieldValues, TName extends FieldArrayPath<T>>(
  props: FieldArrayProps<T, TName> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

(FieldArray as any).displayName = 'FieldArray';
