'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  placement?: DrawerPlacement;
  size?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CloseIcon: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const placementTransforms: Record<DrawerPlacement, { open: string; closed: string }> = {
  left: { open: 'translateX(0)', closed: 'translateX(-100%)' },
  right: { open: 'translateX(0)', closed: 'translateX(100%)' },
  top: { open: 'translateY(0)', closed: 'translateY(-100%)' },
  bottom: { open: 'translateY(0)', closed: 'translateY(100%)' },
};

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ open, onClose, title, description, children, placement = 'right', size, closeOnOverlayClick = true, closeOnEscape = true, showCloseButton = true, className, style }, ref) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      if (open) {
        requestAnimationFrame(() => setVisible(true));
        document.body.style.overflow = 'hidden';
      } else {
        setVisible(false);
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, onClose]);

    if (!open) return null;

    const isHorizontal = placement === 'left' || placement === 'right';
    const defaultSize = isHorizontal ? '380px' : '300px';

    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      zIndex: 9990,
      opacity: visible ? 1 : 0,
      transition: `opacity ${duration.normal} ${easing.DEFAULT}`,
    };

    const drawerStyle: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: '#fff',
      boxShadow: shadows['2xl'],
      zIndex: 9991,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...(isHorizontal
        ? {
            top: 0,
            bottom: 0,
            width: size || defaultSize,
            ...(placement === 'left' ? { left: 0, borderRight: `1px solid ${colors.neutral[200]}` } : { right: 0, borderLeft: `1px solid ${colors.neutral[200]}` }),
          }
        : {
            left: 0,
            right: 0,
            height: size || defaultSize,
            ...(placement === 'top' ? { top: 0, borderBottom: `1px solid ${colors.neutral[200]}` } : { bottom: 0, borderTop: `1px solid ${colors.neutral[200]}` }),
          }),
      transform: visible ? placementTransforms[placement].open : placementTransforms[placement].closed,
      transition: `transform ${duration.slow} ${easing.DEFAULT}`,
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: `${spacing[5]} ${spacing[6]}`,
      borderBottom: `1px solid ${colors.neutral[100]}`,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      fontFamily: fontFamily.sans,
      color: colors.neutral[900],
      margin: 0,
      lineHeight: 1.4,
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      color: colors.neutral[500],
      margin: 0,
      marginTop: spacing[1],
    };

    const bodyStyle: React.CSSProperties = {
      padding: spacing[6],
      overflowY: 'auto',
      flex: 1,
    };

    const closeBtnStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: radius.md,
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.neutral[400],
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      flexShrink: 0,
    };

    return (
      <>
        <div style={overlayStyle} onClick={closeOnOverlayClick ? onClose : undefined} aria-hidden="true" />
        <div
          ref={ref}
          className={cn('preone-drawer', className)}
          style={drawerStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'drawer-title' : undefined}
        >
          {(title || showCloseButton) && (
            <div style={headerStyle}>
              <div>
                {title && <h2 id="drawer-title" style={titleStyle}>{title}</h2>}
                {description && <p style={descStyle}>{description}</p>}
              </div>
              {showCloseButton && (
                <button
                  style={closeBtnStyle}
                  onClick={onClose}
                  aria-label="Close drawer"
                  type="button"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[100]; e.currentTarget.style.color = colors.neutral[600]; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.neutral[400]; }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}
          <div style={bodyStyle}>{children}</div>
        </div>
      </>
    );
  }
);

Drawer.displayName = 'Drawer';
