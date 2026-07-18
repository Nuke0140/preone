/**
 * @preone/tables - ExportMenu
 * Export CSV and Excel (basic CSV with .xlsx extension)
 */

'use client';

import React, { forwardRef, useCallback } from 'react';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, shadows, duration, easing, borderWidth } from '@preone/design-tokens';

// ─── Props ───────────────────────────────────────────────────────────────────
export interface ExportMenuProps<T = unknown> extends React.HTMLAttributes<HTMLDivElement> {
  data: T[];
  columns: Array<{
    id: string;
    header: string;
  }>;
  open: boolean;
  onClose: () => void;
  fileName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeCSVValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV<T>(data: T[], columns: Array<{ id: string; header: string }>): string {
  const headers = columns.map((col) => escapeCSVValue(col.header)).join(',');
  const rows = data.map((row) => {
    const record = row as Record<string, unknown>;
    return columns
      .map((col) => escapeCSVValue(record[col.id]))
      .join(',');
  });
  return [headers, ...rows].join('\n');
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const FileTextIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FileSpreadsheetIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const ExportMenu = forwardRef<HTMLDivElement, ExportMenuProps<unknown>>(
  ({ data, columns, open, onClose, fileName = 'export', className, style, ...props }, ref) => {
    const handleExportCSV = useCallback(() => {
      const csv = generateCSV(data, columns);
      downloadFile(csv, `${fileName}.csv`, 'text/csv;charset=utf-8;');
      onClose();
    }, [data, columns, fileName, onClose]);

    const handleExportExcel = useCallback(() => {
      const csv = generateCSV(data, columns);
      downloadFile(csv, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      onClose();
    }, [data, columns, fileName, onClose]);

    if (!open) return null;

    const dropdownStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 50,
      backgroundColor: '#fff',
      border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      padding: spacing[1],
      minWidth: '180px',
      animation: 'preone-export-fade 150ms ease-out',
      ...style,
    };

    const menuItemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2.5]} ${spacing[3]}`,
      borderRadius: radius.md,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      width: '100%',
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.medium,
      color: colors.neutral[700],
      transition: `background-color ${duration.fast} ${easing.DEFAULT}, color ${duration.fast} ${easing.DEFAULT}`,
    };

    return (
      <>
        <style>{`
          @keyframes preone-export-fade {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          ref={ref}
          className={cn('preone-export-menu', className)}
          style={dropdownStyle}
          role="menu"
          aria-label="Export options"
          {...props}
        >
          <button
            style={menuItemStyle}
            onClick={handleExportCSV}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[50];
              (e.currentTarget as HTMLElement).style.color = colors.neutral[900];
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = colors.neutral[700];
            }}
            role="menuitem"
          >
            <FileTextIcon />
            Export CSV
          </button>
          <button
            style={menuItemStyle}
            onClick={handleExportExcel}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.neutral[50];
              (e.currentTarget as HTMLElement).style.color = colors.neutral[900];
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = colors.neutral[700];
            }}
            role="menuitem"
          >
            <FileSpreadsheetIcon />
            Export Excel
          </button>
        </div>
      </>
    );
  }
);

ExportMenu.displayName = 'ExportMenu';
