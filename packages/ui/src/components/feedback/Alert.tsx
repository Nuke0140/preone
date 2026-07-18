'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing } from '@preone/design-tokens';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; iconColor: string }> = {
  info: { bg: colors.sky[50], border: colors.sky[200], text: colors.sky[800], iconColor: colors.sky[500] },
  success: { bg: colors.green[50], border: colors.green[200], text: colors.green[800], iconColor: colors.green[500] },
  warning: { bg: colors.amber[50], border: colors.amber[200], text: colors.amber[800], iconColor: colors.amber[500] },
  danger: { bg: colors.red[50], border: colors.red[200], text: colors.red[800], iconColor: colors.red[500] },
};

const sizeConfig: Record<AlertSize, { padding: string; fontSize: string; gap: string }> = {
  sm: { padding: `${spacing[2]} ${spacing[3]}`, fontSize: fontSize.sm, gap: spacing[2] },
  md: { padding: `${spacing[3]} ${spacing[4]}`, fontSize: fontSize.sm, gap: spacing[3] },
  lg: { padding: `${spacing[4]} ${spacing[5]}`, fontSize: fontSize.base, gap: spacing[3] },
};

const InfoIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SuccessIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const WarningIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const DangerIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const defaultIcons: Record<AlertVariant, React.FC<{ size?: number }>> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: DangerIcon,
};

const CloseIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', size = 'md', title, icon, dismissible = false, onDismiss, className, style, children, ...props }, ref) => {
    const [dismissed, setDismissed] = useState(false);
    const config = variantConfig[variant];
    const sizeConf = sizeConfig[size];
    const DefaultIcon = defaultIcons[variant];

    if (dismissed) return null;

    const alertStyle: React.CSSProperties = {
      display: 'flex',
      gap: sizeConf.gap,
      padding: sizeConf.padding,
      backgroundColor: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: radius.lg,
      color: config.text,
      fontFamily: fontFamily.sans,
      fontSize: sizeConf.fontSize,
      lineHeight: 1.5,
      ...style,
    };

    const iconStyle: React.CSSProperties = {
      display: 'flex',
      flexShrink: 0,
      color: config.iconColor,
      marginTop: '2px',
    };

    const contentStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: sizeConf.fontSize,
      fontWeight: fontWeight.semibold,
      margin: 0,
      lineHeight: 1.4,
    };

    const dismissStyle: React.CSSProperties = {
      display: 'flex',
      flexShrink: 0,
      padding: spacing[1],
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: config.iconColor,
      borderRadius: radius.sm,
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
    };

    const handleDismiss = () => {
      setDismissed(true);
      onDismiss?.();
    };

    return (
      <div ref={ref} className={cn('preone-alert', className)} style={alertStyle} role="alert" {...props}>
        <span style={iconStyle}>{icon || <DefaultIcon size={size === 'lg' ? 22 : 18} />}</span>
        <div style={contentStyle}>
          {title && <p style={titleStyle}>{title}</p>}
          <div>{children}</div>
        </div>
        {dismissible && (
          <button style={dismissStyle} onClick={handleDismiss} aria-label="Dismiss alert" type="button">
            <CloseIcon size={size === 'lg' ? 18 : 14} />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
