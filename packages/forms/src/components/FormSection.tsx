'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '@preone/ui';
import { spacing, colors, fontSize, fontFamily, fontWeight, radius, borderWidth } from '@preone/design-tokens';

export interface FormSectionProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  /** Section title */
  title: string;
  /** Optional description */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

export const FormSection = forwardRef<HTMLFieldSetElement, FormSectionProps>(
  ({ title, description, children, className, style, ...props }, ref) => {
    const autoId = useId();
    const headingId = `section-title-${autoId}`;
    const descId = description ? `section-desc-${autoId}` : undefined;

    const sectionStyle: React.CSSProperties = {
      border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      borderRadius: radius.xl,
      padding: spacing[6],
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[5],
      backgroundColor: colors.neutral[50],
      ...style,
    };

    const titleStyle: React.CSSProperties = {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.neutral[900],
      fontFamily: fontFamily.sans,
      margin: 0,
      lineHeight: 1.4,
    };

    const descStyle: React.CSSProperties = {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      color: colors.neutral[500],
      fontFamily: fontFamily.sans,
      margin: 0,
      lineHeight: 1.5,
      marginTop: spacing[1],
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: spacing[4],
      borderBottom: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    };

    const contentStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[5],
    };

    return (
      <fieldset
        ref={ref}
        className={cn('preone-form-section', className)}
        style={sectionStyle}
        aria-labelledby={headingId}
        aria-describedby={descId}
        {...props}
      >
        <div style={headerStyle}>
          <legend id={headingId} style={titleStyle}>
            {title}
          </legend>
          {description && (
            <p id={descId} style={descStyle}>
              {description}
            </p>
          )}
        </div>
        <div style={contentStyle}>{children}</div>
      </fieldset>
    );
  }
);

FormSection.displayName = 'FormSection';
