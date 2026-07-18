'use client';

import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface UnreadBadgeProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Number of unread notifications */
  count: number;
  /** Maximum number to display (e.g., 99 → shows "99+") */
  max?: number;
  /** Whether to show pulse animation for new notifications */
  pulse?: boolean;
  /** Callback when badge is clicked */
  onClick?: () => void;
  /** Accessible label for the button */
  ariaLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const UnreadBadge = forwardRef<HTMLButtonElement, UnreadBadgeProps>(
  ({ count, max = 99, pulse = false, onClick, ariaLabel, className, style, ...props }, ref) => {
    const [isPulsing, setIsPulsing] = useState(false);
    const prevCountRef = useRef(count);

    // Trigger pulse when count increases
    useEffect(() => {
      if (count > prevCountRef.current && count > 0) {
        setIsPulsing(true);
        const timer = setTimeout(() => setIsPulsing(false), 2000);
        return () => clearTimeout(timer);
      }
      prevCountRef.current = count;
    }, [count]);

    if (count === 0) return null;

    const displayCount = count > max ? `${max}+` : String(count);

    const buttonStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: spacing[2],
      borderRadius: radius.md,
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      ...style,
    };

    const badgeStyle: React.CSSProperties = {
      position: 'absolute',
      top: '2px',
      right: '2px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: count > 9 ? '20px' : '16px',
      height: count > 9 ? '20px' : '16px',
      padding: count > 9 ? `0 ${spacing[1]}` : '0',
      borderRadius: radius.full,
      backgroundColor: colors.red[500],
      color: '#fff',
      fontSize: count > 9 ? fontSize.xs : '10px',
      fontWeight: fontWeight.bold,
      fontFamily: fontFamily.sans,
      lineHeight: 1,
      zIndex: 1,
    };

    // Pulse ring
    const pulseRingStyle: React.CSSProperties = {
      position: 'absolute',
      top: '2px',
      right: '2px',
      minWidth: count > 9 ? '20px' : '16px',
      height: count > 9 ? '20px' : '16px',
      borderRadius: radius.full,
      backgroundColor: colors.red[400],
      opacity: isPulsing && pulse ? 0.6 : 0,
      transform: isPulsing && pulse ? 'scale(1.8)' : 'scale(1)',
      transition: isPulsing && pulse
        ? `transform 600ms ${easing.DEFAULT}, opacity 600ms ${easing.DEFAULT}`
        : `opacity ${duration.fast} ${easing.DEFAULT}`,
      pointerEvents: 'none',
    };

    // Bell icon
    const bellStyle: React.CSSProperties = {
      color: colors.neutral[600],
      transition: `color ${duration.fast} ${easing.DEFAULT}`,
    };

    return (
      <button
        ref={ref}
        className={cn('preone-unread-badge', className)}
        style={buttonStyle}
        onClick={onClick}
        aria-label={ariaLabel || `${count} unread notification${count !== 1 ? 's' : ''}`}
        type="button"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.neutral[100];
          e.currentTarget.querySelector('.preone-bell-icon')?.setAttribute('style', `color: ${colors.neutral[800]}`);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.querySelector('.preone-bell-icon')?.setAttribute('style', `color: ${colors.neutral[600]}`);
        }}
        {...props}
      >
        <svg
          className="preone-bell-icon"
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={bellStyle}
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span style={pulseRingStyle} aria-hidden="true" />
        <span style={badgeStyle} aria-hidden="true">
          {displayCount}
        </span>
      </button>
    );
  }
);

UnreadBadge.displayName = 'UnreadBadge';
