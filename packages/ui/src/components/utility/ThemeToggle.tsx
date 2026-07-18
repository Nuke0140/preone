'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, radius, duration, easing } from '@preone/design-tokens';
import { useTheme } from '../../hooks/useTheme';

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SunIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const sizeConfig = {
  sm: { button: 32, icon: 14, fontSize: '0.75rem', padding: `${spacing[1]} ${spacing[2]}` },
  md: { button: 40, icon: 18, fontSize: '0.875rem', padding: `${spacing[1.5]} ${spacing[3]}` },
  lg: { button: 48, icon: 22, fontSize: '1rem', padding: `${spacing[2]} ${spacing[4]}` },
};

export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ size = 'md', showLabel = false, className, style, ...props }, ref) => {
    const { resolvedTheme, toggleTheme } = useTheme();
    const config = sizeConfig[size];
    const isDark = resolvedTheme === 'dark';

    const buttonStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      width: showLabel ? 'auto' : `${config.button}px`,
      height: `${config.button}px`,
      padding: showLabel ? config.padding : '0',
      backgroundColor: 'transparent',
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: radius.md,
      cursor: 'pointer',
      color: colors.neutral[600],
      transition: `all ${duration.fast} ${easing.DEFAULT}`,
      outline: 'none',
      ...style,
    };

    return (
      <button
        ref={ref}
        className={cn('preone-theme-toggle', className)}
        style={buttonStyle}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        type="button"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.neutral[50];
          e.currentTarget.style.color = colors.neutral[800];
          e.currentTarget.style.borderColor = colors.neutral[300];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = colors.neutral[600];
          e.currentTarget.style.borderColor = colors.neutral[200];
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.neutral[50]}, 0 0 0 4px ${colors.neutral[400]}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      >
        {isDark ? <SunIcon size={config.icon} /> : <MoonIcon size={config.icon} />}
        {showLabel && (
          <span style={{ fontSize: config.fontSize, fontWeight: 500, letterSpacing: '0.01em' }}>
            {isDark ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    );
  }
);

ThemeToggle.displayName = 'ThemeToggle';
