'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { colors, radius, fontSize, fontWeight, fontFamily } from '@preone/design-tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const avatarSizes: Record<AvatarSize, { dimension: number; fontSize: string; statusDot: number }> = {
  xs: { dimension: 24, fontSize: fontSize.xs, statusDot: 6 },
  sm: { dimension: 32, fontSize: fontSize.xs, statusDot: 8 },
  md: { dimension: 40, fontSize: fontSize.sm, statusDot: 10 },
  lg: { dimension: 56, fontSize: fontSize.lg, statusDot: 12 },
  xl: { dimension: 72, fontSize: fontSize.xl, statusDot: 14 },
};

const statusColors: Record<string, string> = {
  online: colors.green[500],
  offline: colors.neutral[300],
  away: colors.amber[500],
  busy: colors.red[500],
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const colorPalette = [
  colors.pink[100],
  colors.sky[100],
  colors.emerald[100],
  colors.amber[100],
  colors.violet[100],
  colors.teal[100],
];

const textPalette = [
  colors.pink[700],
  colors.sky[700],
  colors.emerald[700],
  colors.amber[700],
  colors.violet[700],
  colors.teal[700],
];

function getColorFromName(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return { bg: colorPalette[index] ?? colors.neutral[100], text: textPalette[index] ?? colors.neutral[500] };
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = '', size = 'md', fallback, status, className, style, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const config = avatarSizes[size];
    const name = fallback || alt;
    const initials = name ? getInitials(name) : '?';
    const colorSet = name ? getColorFromName(name) : { bg: colors.neutral[100], text: colors.neutral[500] };
    const showImage = src && !imageError;

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-flex',
      width: `${config.dimension}px`,
      height: `${config.dimension}px`,
      ...style,
    };

    const avatarStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      borderRadius: radius.full,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fontFamily.sans,
      fontSize: config.fontSize,
      fontWeight: fontWeight.semibold,
      backgroundColor: showImage ? colors.neutral[100] : colorSet.bg,
      color: showImage ? colors.neutral[500] : colorSet.text,
      flexShrink: 0,
    };

    const statusStyle: React.CSSProperties = status
      ? {
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: `${config.statusDot}px`,
          height: `${config.statusDot}px`,
          borderRadius: radius.full,
          backgroundColor: statusColors[status],
          border: `2px solid #fff`,
        }
      : {};

    return (
      <div ref={ref} className={cn('preone-avatar', className)} style={containerStyle} {...props}>
        <div style={avatarStyle} role="img" aria-label={alt || fallback || 'Avatar'}>
          {showImage ? (
            <img
              src={src}
              alt={alt}
              onError={() => setImageError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        {status && <div style={statusStyle} aria-label={`Status: ${status}`} />}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
