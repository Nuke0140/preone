'use client';

import React, { forwardRef, useState, useRef, useCallback, useId } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@preone/ui';
import { colors, spacing, fontSize, fontWeight, fontFamily, radius, duration, easing, borderWidth } from '@preone/design-tokens';

export interface ImageUploadProps<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
> {
  /** Field name for react-hook-form */
  name: TName;
  /** Control from useForm */
  control: import('react-hook-form').Control<T>;
  /** Label */
  label?: string;
  /** Helper text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of images */
  maxImages?: number;
  /** Additional class name */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
}

const CameraIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface ImagePreview {
  file: File;
  url: string;
}

function ImageUploadInner<
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  {
    name,
    control,
    label,
    description,
    required = false,
    maxSize,
    maxImages,
    className,
    style,
  }: ImageUploadProps<T, TName>,
  ref: React.Ref<HTMLDivElement>
) {
  const autoId = useId();
  const inputId = `${name}-${autoId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);

  const createPreviews = useCallback((files: File[]): ImagePreview[] => {
    return files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, []);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const errors: string[] = [];

      if (fileArray.length === 0 && Array.from(files).length > 0) {
        errors.push('Only image files are allowed');
      }

      if (maxImages && fileArray.length > maxImages) {
        errors.push(`Maximum ${maxImages} images allowed`);
      }

      if (maxSize) {
        const oversized = fileArray.filter((f) => f.size > maxSize);
        if (oversized.length > 0) {
          errors.push(`Image size must be less than ${formatFileSize(maxSize)}`);
        }
      }

      if (errors.length > 0) {
        setInternalError(errors[0] ?? null);
        return [];
      }

      setInternalError(null);
      return fileArray;
    },
    [maxImages, maxSize]
  );

  const updatePreviews = useCallback(
    (newFiles: File[], existingPreviews: ImagePreview[]) => {
      existingPreviews.forEach((p) => URL.revokeObjectURL(p.url));
      const newPreviews = createPreviews(newFiles);
      setPreviews(newPreviews);
    },
    [createPreviews]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, onChange: (value: File[]) => void, currentValue: File[]) => {
      e.preventDefault();
      setIsDragging(false);
      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        const allFiles = [...(currentValue || []), ...files];
        updatePreviews(allFiles, previews);
        onChange(allFiles);
      }
    },
    [validateFiles, updatePreviews, previews]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: File[]) => void, currentValue: File[]) => {
      if (e.target.files) {
        const files = validateFiles(e.target.files);
        if (files.length > 0) {
          const allFiles = [...(currentValue || []), ...files];
          updatePreviews(allFiles, previews);
          onChange(allFiles);
        }
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateFiles, updatePreviews, previews]
  );

  const removeImage = useCallback(
    (index: number, onChange: (value: File[]) => void, currentValue: File[]) => {
      const updated = [...(currentValue || [])];
      updated.splice(index, 1);

      const updatedPreviews = [...previews];
      URL.revokeObjectURL(updatedPreviews[index]!.url);
      updatedPreviews.splice(index, 1);
      setPreviews(updatedPreviews);

      onChange(updated);
    },
    [previews]
  );

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1.5],
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral[700],
    fontFamily: fontFamily.sans,
  };

  const dropZoneStyle = (hasError: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[6],
    border: `${borderWidth.DEFAULT} ${isDragging ? 'solid' : 'dashed'} ${hasError ? colors.red[300] : isDragging ? colors.neutral[500] : colors.neutral[300]}`,
    borderRadius: radius.xl,
    backgroundColor: isDragging ? colors.neutral[50] : 'transparent',
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  });

  const previewGridStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
  };

  const previewItemStyle: React.CSSProperties = {
    position: 'relative',
    width: '96px',
    height: '96px',
    borderRadius: radius.lg,
    overflow: 'hidden',
    border: `${borderWidth.DEFAULT} solid ${colors.neutral[200]}`,
  };

  const removeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: radius.full,
    border: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    cursor: 'pointer',
    padding: 0,
    transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
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

  return (
    <div ref={ref} className={cn('preone-image-upload', className)} style={wrapperStyle}>
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
                style={dropZoneStyle(hasError)}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => handleDrop(e, onChange, files)}
                role="button"
                tabIndex={0}
                aria-label="Upload image"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
              >
                <input
                  ref={inputRef}
                  id={inputId}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleChange(e, onChange, files)}
                  aria-invalid={hasError}
                  aria-describedby={cn(hasError ? errorId : '', description ? helperId : '') || undefined}
                />
                <CameraIcon />
                <span style={{ fontSize: fontSize.sm, color: colors.neutral[500], fontFamily: fontFamily.sans }}>
                  {isDragging ? 'Drop images here' : 'Drag & drop images, or click to browse'}
                </span>
                {maxSize && (
                  <span style={{ fontSize: fontSize.xs, color: colors.neutral[400], fontFamily: fontFamily.sans }}>
                    Max size: {formatFileSize(maxSize)}
                  </span>
                )}
              </div>

              {previews.length > 0 && (
                <div style={previewGridStyle}>
                  {previews.map((preview, index) => (
                    <div key={`preview-${index}`} style={previewItemStyle}>
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        style={removeButtonStyle}
                        onClick={(e) => { e.stopPropagation(); removeImage(index, onChange, files); }}
                        aria-label={`Remove ${preview.file.name}`}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.8)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; }}
                      >
                        <XIcon size={10} />
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

export const ImageUpload = forwardRef(ImageUploadInner) as <
  T extends FieldValues = FieldValues,
  TName extends FieldPath<T> = FieldPath<T>
>(
  props: ImageUploadProps<T, TName> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ImageUpload as any).displayName = 'ImageUpload';
