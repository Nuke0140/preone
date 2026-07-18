'use client';

import React, { forwardRef, useCallback, useState, useEffect } from 'react';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius } from '@preone/design-tokens';
import { Dialog, type DialogProps } from './Dialog';

export interface ConfirmDialogProps extends Omit<DialogProps, 'children'> {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      title = 'Are you sure?',
      description = 'This action cannot be undone.',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      variant = 'default',
      onConfirm,
      onCancel,
      loading = false,
      open,
      onClose,
      ...props
    },
    ref
  ) => {
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
      if (!open) setConfirming(false);
    }, [open]);

    const handleConfirm = useCallback(() => {
      setConfirming(true);
      onConfirm();
    }, [onConfirm]);

    const isDanger = variant === 'danger';

    const footerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: spacing[2],
      paddingTop: spacing[4],
    };

    const cancelBtnStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '36px',
      padding: `0 ${spacing[4]}`,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      color: colors.neutral[700],
      backgroundColor: colors.neutral[100],
      border: 'none',
      borderRadius: radius.md,
      cursor: 'pointer',
      transition: 'background-color 150ms ease',
    };

    const confirmBtnStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '36px',
      padding: `0 ${spacing[4]}`,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.sans,
      color: '#fff',
      backgroundColor: isDanger ? colors.red[600] : colors.neutral[900],
      border: 'none',
      borderRadius: radius.md,
      cursor: loading || confirming ? 'wait' : 'pointer',
      opacity: loading || confirming ? 0.7 : 1,
      transition: 'all 150ms ease',
    };

    return (
      <Dialog
        ref={ref}
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        size="sm"
        showCloseButton={false}
        {...props}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <div style={footerStyle}>
            <button
              style={cancelBtnStyle}
              onClick={() => {
                onCancel?.();
                onClose();
              }}
              type="button"
              disabled={loading || confirming}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[200]; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[100]; }}
            >
              {cancelLabel}
            </button>
            <button
              style={confirmBtnStyle}
              onClick={handleConfirm}
              type="button"
              disabled={loading || confirming}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDanger ? colors.red[700] : colors.neutral[800]; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDanger ? colors.red[600] : colors.neutral[900]; }}
            >
              {loading || confirming ? '…' : confirmLabel}
            </button>
          </div>
        </div>
      </Dialog>
    );
  }
);

ConfirmDialog.displayName = 'ConfirmDialog';
