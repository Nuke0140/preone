'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  open?: string[];
  onChange?: (openIds: string[]) => void;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: `transform ${duration.normal} ${easing.DEFAULT}`,
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  ({ items, allowMultiple = false, defaultOpen = [], open, onChange, className, style, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = useState<string[]>(defaultOpen);
    const isControlled = open !== undefined;
    const currentOpen = isControlled ? open : internalOpen;

    const toggleItem = (id: string) => {
      let newOpen: string[];
      if (currentOpen.includes(id)) {
        newOpen = currentOpen.filter((i) => i !== id);
      } else {
        newOpen = allowMultiple ? [...currentOpen, id] : [id];
      }
      if (!isControlled) setInternalOpen(newOpen);
      onChange?.(newOpen);
    };

    return (
      <div
        ref={ref}
        className={cn('preone-accordion', className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: radius.xl,
          border: `1px solid ${colors.neutral[200]}`,
          overflow: 'hidden',
          ...style,
        }}
        {...props}
      >
        {items.map((item, index) => {
          const isOpen = currentOpen.includes(item.id);

          return (
            <div
              key={item.id}
              style={{
                borderBottom: index < items.length - 1 ? `1px solid ${colors.neutral[100]}` : undefined,
              }}
            >
              <button
                id={`accordion-trigger-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`accordion-panel-${item.id}`}
                disabled={item.disabled}
                onClick={() => !item.disabled && toggleItem(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: `${spacing[4]} ${spacing[5]}`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  fontFamily: fontFamily.sans,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium,
                  color: item.disabled ? colors.neutral[400] : colors.neutral[800],
                  transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
                  textAlign: 'left',
                  opacity: item.disabled ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) e.currentTarget.style.backgroundColor = colors.neutral[50];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{item.title}</span>
                <ChevronIcon open={isOpen} />
              </button>
              <div
                id={`accordion-panel-${item.id}`}
                role="region"
                aria-labelledby={`accordion-trigger-${item.id}`}
                style={{
                  overflow: 'hidden',
                  maxHeight: isOpen ? '2000px' : '0',
                  transition: `max-height ${duration.slow} ${easing.DEFAULT}, padding ${duration.slow} ${easing.DEFAULT}`,
                  padding: isOpen ? `0 ${spacing[5]} ${spacing[5]}` : `0 ${spacing[5]}`,
                  fontSize: fontSize.sm,
                  color: colors.neutral[600],
                  lineHeight: 1.6,
                }}
              >
                {item.content}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

Accordion.displayName = 'Accordion';
