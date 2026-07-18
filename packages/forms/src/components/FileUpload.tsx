'use client';

import React, { forwardRef, useState, useRef, useCallback, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface FileUploadProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
> {
  /** Field name for react-hook-form */
  name: TName;
  /** Control from useForm */
  control: import('react-hook-form').Control<T>;
  /** Label for the upload field */
  label?: string;
  /** Helper text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Accepted file types */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
  /** Custom validation message for size */
  maxSizeMessage?: string;
}

const UploadIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FileIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileUploadInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    accept,
    multiple = false,
    maxSize,
    maxFiles,
    className,
    style,
    maxSizeMessage,
  }: FileUploadProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files);
      const errors: string[] = [];

      if (maxFiles && fileArray.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
      }

      if (maxSize) {
        const oversized = fileArray.filter((f) => f.size > maxSize);
        if (oversized.length > 0) {
          errors.push(maxSizeMessage || `File size must be less than ${formatFileSize(maxSize)}`);
        }
      }

      if (errors.length > 0) {
        setInternalError(errors[0] ?? null);
        return [];
      }

      setInternalError(null);
      return fileArray;
    },
    [maxFiles, maxSize, maxSizeMessage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, onChange: (value: File[]) => void, currentValue: File[]) => {
      e.preventDefault();
      setIsDragging(false);
      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onChange(multiple ? [...(currentValue || []), ...files] : files);
      }
    },
    [validateFiles, multiple]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: File[]) => void, currentValue: File[]) => {
      if (e.target.files) {
        const files = validateFiles(e.target.files);
        if (files.length > 0) {
          onChange(multiple ? [...(currentValue || []), ...files] : files);
        }
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateFiles, multiple]
  );

  const removeFile = useCallback(
    (index: number, onChange: (value: File[]) => void, currentValue: File[]) => {
      const updated = [...(currentValue || [])];
      updated.splice(index, 1);
      onChange(updated);
    },
    []
  );

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1.5],
    ...style,
  };

  const dropZoneStyle = (hasError: boolean, hasFiles: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[8],
    border: `${borderWidth.DEFAULT} ${isDragging ? 'solid' : 'dashed'} ${hasError ? colors.red[300] : isDragging ? colors.neutral[500] : colors.neutral[300]}`,
    borderRadius: radius.xl,
    backgroundColor: isDragging ? colors.neutral[50] : 'transparent',
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
    ...(hasFiles ? { padding: spacing[4] } : {}),
  });

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral[700],
    fontFamily: fontFamily.sans,
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.red[600],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  };

  const helperTextStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.sans,
    color: colors.neutral[500],
  };

  const fileListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
    width: '100%',
  };

  const fileItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[50],
    border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    color: colors.neutral[700],
  };

  const removeButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    width: '24px',
    height: '24px',
    borderRadius: radius.sm,
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral[400],
    cursor: 'pointer',
    transition: `all ${duration.fast} ${easing.DEFAULT}`,
    padding: 0,
  };

  return (
    <div ref={ref} className={cn('preone-file-upload', className)} style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required && (
            <span style={{ color: colors.red[500], fontWeight: fontWeight.bold, marginLeft: spacing[0.5] }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        rules={{
          ...(required ? { required: `${label || name} is required` } : {}),
        }}
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          const files: File[] = value || [];
          const hasError = !!error || !!internalError;

          return (
            <>
              <div
                style={dropZoneStyle(hasError, files.length > 0)}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => handleDrop(e, onChange, files)}
                role="button"
                tabIndex={0}
                aria-label="Upload file"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
              >
                <input
                  ref={inputRef}
                  id={inputId}
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  style={{ display: 'none' }}
                  onChange={(e) => handleChange(e, onChange, files)}
                  aria-invalid={hasError}
                  aria-describedby={cn(hasError ? errorId : '', description ? helperId : '') || undefined}
                />
                <UploadIcon />
                <span style={{ fontSize: fontSize.sm, color: colors.neutral[500], fontFamily: fontFamily.sans }}>
                  {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
                </span>
                {maxSize && (
                  <span style={{ fontSize: fontSize.xs, color: colors.neutral[400], fontFamily: fontFamily.sans }}>
                    Max file size: {formatFileSize(maxSize)}
                  </span>
                )}
              </div>

              {files.length > 0 && (
                <div style={fileListStyle}>
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} style={fileItemStyle}>
                      <FileIcon />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: fontSize.xs, color: colors.neutral[400] }}>
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        style={removeButtonStyle}
                        onClick={(e) => { e.stopPropagation(); removeFile(index, onChange, files); }}
                        aria-label={`Remove ${file.name}`}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.red[500]; e.currentTarget.style.backgroundColor = colors.red[50]; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors.neutral[400]; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(error || internalError) && (
                <span id={errorId} style={errorTextStyle} role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {internalError || error?.message}
                </span>
              )}
              {!error && !internalError && description && (
                <span id={helperId} style={helperTextStyle}>{description}</span>
              )}
            </>
          );
        }}
      />
    </div>
  );
}

export const FileUpload = forwardRef(FileUploadInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: FileUploadProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(FileUpload as any).displayName = 'FileUpload';
