'use client';

import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@preone/ui';
import { colors, fontSize, fontFamily, fontWeight, spacing, duration, easing } from '@preone/design-tokens';

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Error message content */
  children: React.ReactNode;
  /** Unique id for aria-describedby */
  id?: string;
}

export const ErrorMessage = forwardRef<HTMLSpanElement, ErrorMessageProps>(
  ({ children, className, style, id, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const prevChildrenRef = useRef<React.ReactNode>(null);

    // Animate entrance when error first appears
    useEffect(() => {
      if (children && children !== prevChildrenRef.current) {
        // Use requestAnimationFrame to trigger the animation after mount
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }
      if (!children) {
        setIsVisible(false);
      }
      prevChildrenRef.current = children;
    }, [children]);

    const messageStyle: React.CSSProperties = {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.normal,
      color: colors.red[600],
      display: 'flex',
      alignItems: 'center',
      gap: spacing[1],
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-4px)',
      transition: `opacity ${duration.normal} ${easing.out}, transform ${duration.normal} ${easing.out}`,
      lineHeight: 1.4,
      ...style,
    };

    return (
      <span
        ref={ref}
        id={id}
        className={cn('preone-error-message', className)}
        style={messageStyle}
        role="alert"
        aria-live="polite"
        {...props}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {children}
      </span>
    );
  }
);

ErrorMessage.displayName = 'ErrorMessage';
