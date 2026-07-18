'use client';

import React, { forwardRef, useCallback } from 'react';
import { useFieldArray, type FieldValues, type ArrayPath, type UseFieldArrayProps, type UseFieldArrayReturn } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface FieldArrayProps<
  T extends FieldValues = FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>
> extends Omit<UseFieldArrayProps<T, TName>, 'name'> {
  /** Field array name in the form */
  name: TName;
  /** Render function for each item in the array */
  renderField: (
    index: number,
    methods: UseFieldArrayReturn<T, TName>,
    item: Record<string, unknown>
  ) => React.ReactNode;
  /** Default values for new items */
  defaultItem: Record<string, unknown>;
  /** Label for the add button */
  addLabel?: string;
  /** Maximum number of items */
  maxItems?: number;
  /** Minimum number of items */
  minItems?: number;
  /** Section label */
  label?: string;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ChevronUpIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function FieldArrayInner<
  T extends FieldValues = FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>
>(
  {
    name,
    renderField,
    defaultItem,
    addLabel = 'Add Item',
    maxItems,
    minItems = 0,
    label,
    className,
    style,
    ...arrayProps
  }: FieldArrayProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const { control } = useFormContext<T>();
  const fieldArray = useFieldArray<T, TName>({ control, name, ...arrayProps });
  const { fields, append, remove, move } = fieldArray;

  const canAdd = maxItems === undefined || fields.length < maxItems;
  const canRemove = fields.length > minItems;

  const handleAdd = useCallback(() => {
    if (canAdd) {
      append(defaultItem as never);
    }
  }, [append, canAdd, defaultItem]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.neutral[700],
    fontFamily: fontFamily.sans,
  };

  const itemContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
    border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    borderRadius: radius.lg,
    padding: spacing[4],
    backgroundColor: colors.neutral[50],
    position: 'relative' as const,
  };

  const itemHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[1],
  };

  const actionButtonStyle = (isDisabled: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: radius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: isDisabled ? colors.neutral[300] : colors.neutral[500],
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: `all ${duration.fast} ${easing.DEFAULT}`,
    padding: 0,
  });

  const addButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: '36px',
    padding: `0 ${spacing[3]}`,
    borderRadius: radius.md,
    border: `${borderWidth.DEFAULT} dashed ${canAdd ? colors.neutral[300] : colors.neutral[200]}`,
    backgroundColor: 'transparent',
    color: canAdd ? colors.neutral[600] : colors.neutral[300],
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    cursor: canAdd ? 'pointer' : 'not-allowed',
    transition: `all ${duration.fast} ${easing.DEFAULT}`,
  };

  return (
    <div
      ref={ref}
      className={cn('preone-field-array', className)}
      style={containerStyle}
      role="group"
      aria-label={label || name}
    >
      {label && <span style={labelStyle}>{label}</span>}

      {fields.map((field, index) => (
        <div key={field.id} style={itemContainerStyle}>
          <div style={itemHeaderStyle}>
            {index > 0 && (
              <button
                type="button"
                style={actionButtonStyle(false)}
                onClick={() => move(index, index - 1)}
                aria-label="Move up"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[100]; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <ChevronUpIcon />
              </button>
            )}
            {index < fields.length - 1 && (
              <button
                type="button"
                style={actionButtonStyle(false)}
                onClick={() => move(index, index + 1)}
                aria-label="Move down"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[100]; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <ChevronDownIcon />
              </button>
            )}
            <button
              type="button"
              style={actionButtonStyle(!canRemove)}
              onClick={() => canRemove && remove(index)}
              disabled={!canRemove}
              aria-label="Remove item"
              onMouseEnter={(e) => {
                if (canRemove) e.currentTarget.style.backgroundColor = colors.red[50];
                if (canRemove) e.currentTarget.style.color = colors.red[500];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = canRemove ? colors.neutral[500] : colors.neutral[300];
              }}
            >
              <TrashIcon />
            </button>
          </div>
          {renderField(index, fieldArray, field as Record<string, unknown>)}
        </div>
      ))}

      <button
        type="button"
        style={addButtonStyle}
        onClick={handleAdd}
        disabled={!canAdd}
        onMouseEnter={(e) => {
          if (canAdd) e.currentTarget.style.borderColor = colors.neutral[400];
          if (canAdd) e.currentTarget.style.backgroundColor = colors.neutral[50];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = canAdd ? colors.neutral[300] : colors.neutral[200];
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <PlusIcon size={14} />
        {addLabel}
      </button>
    </div>
  );
}

export const FieldArray = forwardRef(FieldArrayInner) as <
  T extends FieldValues = FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>
>(
  props: FieldArrayProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(FieldArray as any).displayName = 'FieldArray';
