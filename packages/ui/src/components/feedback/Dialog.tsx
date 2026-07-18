'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing } from '@preone/design-tokens';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeConfig: Record<string, string> = {
  sm: '400px',
  md: '520px',
  lg: '640px',
  xl: '800px',
  full: '95vw',
};

const CloseIcon: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onClose, title, description, children, size = 'md', closeOnOverlayClick = true, closeOnEscape = true, showCloseButton = true, className, style }, ref) => {
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

    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 9990,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[4],
      opacity: visible ? 1 : 0,
      transition: `opacity ${duration.normal} ${easing.DEFAULT}`,
    };

    const dialogStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      borderRadius: radius['2xl'],
      boxShadow: shadows['2xl'],
      maxWidth: sizeConfig[size],
      width: '100%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.95)',
      transition: `all ${duration.normal} ${easing.DEFAULT}`,
      ...style,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: `${spacing[5]} ${spacing[6]} 0`,
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
      lineHeight: 1.5,
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
      <div
        style={overlayStyle}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      >
        <div
          ref={ref}
          className={cn('preone-dialog', className)}
          style={dialogStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
          aria-describedby={description ? 'dialog-description' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div style={headerStyle}>
              <div>
                {title && <h2 id="dialog-title" style={titleStyle}>{title}</h2>}
                {description && <p id="dialog-description" style={descStyle}>{description}</p>}
              </div>
              {showCloseButton && (
                <button
                  style={closeBtnStyle}
                  onClick={onClose}
                  aria-label="Close dialog"
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
      </div>
    );
  }
);

Dialog.displayName = 'Dialog';
