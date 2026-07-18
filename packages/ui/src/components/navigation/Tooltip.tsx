'use client';

import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const placementConfig: Record<TooltipPlacement, React.CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: spacing[2] },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: spacing[2] },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: spacing[2] },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: spacing[2] },
};

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, placement = 'top', delay = 200, disabled = false, className, style }, ref) => {
    const [visible, setVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const show = useCallback(() => {
      if (disabled) return;
      timeoutRef.current = setTimeout(() => setVisible(true), delay);
    }, [delay, disabled]);

    const hide = useCallback(() => {
      clearTimeout(timeoutRef.current);
      setVisible(false);
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
      };
    }, []);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      ...style,
    };

    const tooltipStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
      backgroundColor: colors.neutral[900],
      color: colors.neutral[50],
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.medium,
      padding: `${spacing[1.5]} ${spacing[2.5]}`,
      borderRadius: radius.md,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      ...placementConfig[placement],
      opacity: visible ? 1 : 0,
      transition: `opacity ${duration.fast} ${easing.DEFAULT}`,
    };

    return (
      <div
        ref={ref}
        className={cn('preone-tooltip', className)}
        style={containerStyle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
        {visible && (
          <div style={tooltipStyle} role="tooltip">
            {content}
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';
