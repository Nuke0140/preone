'use client';

import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { spacing, duration, easing } from '@preone/design-tokens';
import type { MenuProps } from './Menu';
import { Menu } from './Menu';

export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface DropdownProps {
  trigger: React.ReactNode;
  items: MenuProps['items'];
  onSelect?: (id: string) => void;
  placement?: DropdownPlacement;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const placementStyles: Record<DropdownPlacement, React.CSSProperties> = {
  'bottom-start': { top: '100%', left: 0, marginTop: spacing[1] },
  'bottom-end': { top: '100%', right: 0, marginTop: spacing[1] },
  'top-start': { bottom: '100%', left: 0, marginBottom: spacing[1] },
  'top-end': { bottom: '100%', right: 0, marginBottom: spacing[1] },
};

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ trigger, items, onSelect, placement = 'bottom-start', size = 'md', disabled = false, className, style }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => setOpen(false), []);

    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          handleClose();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [open, handleClose]);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      ...style,
    };

    const dropdownStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      ...placementStyles[placement],
      opacity: open ? 1 : 0,
      transform: open ? 'scale(1)' : 'scale(0.95)',
      transition: `opacity ${duration.fast} ${easing.DEFAULT}, transform ${duration.fast} ${easing.DEFAULT}`,
      pointerEvents: open ? 'auto' : 'none',
    };

    return (
      <div ref={(node) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }} className={cn('preone-dropdown', className)} style={containerStyle}>
        <div
          onClick={() => !disabled && setOpen(!open)}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {trigger}
        </div>
        <div style={dropdownStyle}>
          <Menu
            items={items}
            size={size}
            onSelect={(id) => {
              onSelect?.(id);
              handleClose();
            }}
          />
        </div>
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';
