'use client';

import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, shadows, radius, duration, easing } from '@preone/design-tokens';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface PopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: PopoverPlacement;
  trigger?: 'click' | 'hover';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const placementConfig: Record<PopoverPlacement, { position: React.CSSProperties; arrow: React.CSSProperties }> = {
  top: {
    position: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: spacing[2] },
    arrow: { bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
  },
  bottom: {
    position: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: spacing[2] },
    arrow: { top: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
  },
  left: {
    position: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: spacing[2] },
    arrow: { right: '-5px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  },
  right: {
    position: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: spacing[2] },
    arrow: { left: '-5px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  },
};

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  ({ content, children, placement = 'bottom', trigger = 'click', disabled = false, className, style, open: controlledOpen, onOpenChange }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;
    const containerRef = useRef<HTMLDivElement>(null);

    const setOpen = useCallback(
      (value: boolean) => {
        if (!isControlled) setInternalOpen(value);
        onOpenChange?.(value);
      },
      [isControlled, onOpenChange]
    );

    useEffect(() => {
      if (!isOpen || trigger === 'hover') return;

      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, trigger, setOpen]);

    const config = placementConfig[placement];

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      ...style,
    };

    const popoverStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      padding: spacing[3],
      ...config.position,
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? `${config.position.transform} scale(1)` : `${config.position.transform} scale(0.95)`,
      transition: `opacity ${duration.fast} ${easing.DEFAULT}, transform ${duration.fast} ${easing.DEFAULT}`,
      pointerEvents: isOpen ? 'auto' : 'none',
    };

    const arrowStyle: React.CSSProperties = {
      position: 'absolute',
      width: '8px',
      height: '8px',
      backgroundColor: '#fff',
      border: `1px solid ${colors.neutral[200]}`,
      ...config.arrow,
    };

    const handleTriggerClick = () => {
      if (!disabled && trigger === 'click') setOpen(!isOpen);
    };

    const handleMouseEnter = () => {
      if (!disabled && trigger === 'hover') setOpen(true);
    };

    const handleMouseLeave = () => {
      if (trigger === 'hover') setOpen(false);
    };

    return (
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn('preone-popover', className)}
        style={containerStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div onClick={handleTriggerClick} aria-expanded={isOpen} aria-haspopup="dialog">
          {children}
        </div>
        <div style={popoverStyle} role="dialog">
          <div style={arrowStyle} aria-hidden="true" />
          {content}
        </div>
      </div>
    );
  }
);

Popover.displayName = 'Popover';
