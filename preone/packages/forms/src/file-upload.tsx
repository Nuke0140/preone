import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for FileUpload styling.
 */
export type FileUploadVariant = 'default' | 'compact' | 'dropzone';

/**
 * Sizes for FileUpload.
 */
export type FileUploadSize = 'sm' | 'md' | 'lg';

/**
 * File item with upload progress.
 */
export interface FileItem {
  /** Unique identifier */
  id: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Upload progress 0-100, -1 if not started */
  progress: number;
  /** Upload error message if any */
  error?: string;
  /** File object reference */
  file?: File;
}

/**
 * Props for the FileUpload component.
 */
export interface FileUploadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Accepted file types (MIME) */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Current file list */
  files?: FileItem[];
  /** Callback when files are selected */
  onFilesChange?: (files: FileItem[]) => void;
  /** Callback when a file is removed */
  onFileRemove?: (fileId: string) => void;
  /** Callback to trigger upload */
  onUpload?: (files: File[]) => void | Promise<void>;
  /** Visual variant */
  variant?: FileUploadVariant;
  /** Size */
  size?: FileUploadSize;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether the component is loading */
  loading?: boolean;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Upload button label */
  uploadLabel?: string;
  /** Drop zone text */
  dropzoneText?: string;
}

const variantStyles: Record<FileUploadVariant, string> = {
  default:
    'rounded-lg border-2 border-dashed border-[var(--preone-border)] p-6',
  compact:
    'rounded-md border border-[var(--preone-border)] p-3',
  dropzone:
    'rounded-xl border-2 border-dashed border-[var(--preone-color-primary)] p-8 transition-colors hover:border-[var(--preone-color-primary-hover)] hover:bg-[var(--preone-color-primary-soft)]',
};

const sizeStyles: Record<FileUploadSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * PreOne FileUpload component with drag-and-drop, file list,
 * and upload progress tracking. Supports variants, sizes,
 * disabled/loading/dark modes, and ARIA accessibility.
 *
 * @example
 * ```tsx
 * <FileUpload
 *   accept="image/*,.pdf"
 *   multiple
 *   maxSize={10 * 1024 * 1024}
 *   files={fileList}
 *   onFilesChange={setFileList}
 *   onUpload={handleUpload}
 *   variant="dropzone"
 * />
 * ```
 */
export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept,
      multiple = false,
      maxSize,
      maxFiles,
      files = [],
      onFilesChange,
      onFileRemove,
      onUpload,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      label,
      helperText,
      uploadLabel = 'Upload',
      dropzoneText = 'Drag and drop files here, or click to browse',
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileIdCounter = React.useRef(0);

    const handleDragOver = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      },
      [disabled],
    );

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
      },
      [disabled, onFilesChange, files],
    );

    const processFiles = React.useCallback(
      (newFiles: File[]) => {
        let filtered = newFiles;
        if (accept) {
          const acceptTypes = accept.split(',').map((t) => t.trim());
          filtered = filtered.filter((file) =>
            acceptTypes.some((type) => {
              if (type.startsWith('.')) return file.name.endsWith(type);
              if (type.endsWith('/*'))
                return file.type.startsWith(type.replace('/*', '/'));
              return file.type === type;
            }),
          );
        }
        if (maxSize) {
          filtered = filtered.filter((file) => file.size <= maxSize);
        }
        if (maxFiles) {
          const remaining = maxFiles - files.length;
          filtered = filtered.slice(0, remaining);
        }

        const newItems: FileItem[] = filtered.map((file) => ({
          id: `file-${++fileIdCounter.current}`,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: -1,
          file,
        }));

        onFilesChange?.([...files, ...newItems]);
      },
      [accept, maxSize, maxFiles, files, onFilesChange],
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        processFiles(selectedFiles);
        if (inputRef.current) inputRef.current.value = '';
      },
      [processFiles],
    );

    const handleUploadClick = React.useCallback(() => {
      const filesToUpload = files.filter((f) => f.file).map((f) => f.file!);
      if (filesToUpload.length > 0) {
        onUpload?.(filesToUpload);
      }
    }, [files, onUpload]);

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2',
          disabled && 'opacity-60 pointer-events-none',
          dark && 'dark',
          className,
        )}
        data-dark={dark || undefined}
        {...props}
      >
        {label && (
          <label
            className={cn(
              'font-medium text-[var(--preone-text-primary)]',
              sizeStyles[size],
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            variantStyles[variant],
            sizeStyles[size],
            isDragging && 'border-[var(--preone-color-primary)] bg-[var(--preone-color-primary-soft)]',
            loading && 'animate-pulse',
            'cursor-pointer text-center transition-colors',
            dark && 'border-[var(--preone-border-dark)]',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={dropzoneText}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          <div className="flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className={cn(
                'text-[var(--preone-text-secondary)]',
                size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8',
              )}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-[var(--preone-text-secondary)]">
              {dropzoneText}
            </span>
          </div>
        </div>

        {files.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="Selected files">
            {files.map((file) => (
              <li
                key={file.id}
                className={cn(
                  'flex items-center justify-between rounded-md border border-[var(--preone-border)] px-3 py-2',
                  'bg-[var(--preone-surface)]',
                  file.error && 'border-[var(--preone-color-error)]',
                  dark && 'bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
                )}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate text-sm text-[var(--preone-text-primary)]">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--preone-text-secondary)]">
                    {formatFileSize(file.size)}
                  </span>
                  {file.progress >= 0 && file.progress < 100 && (
                    <div
                      className="mt-1 h-1 w-full rounded-full bg-[var(--preone-border)]"
                      role="progressbar"
                      aria-valuenow={file.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${file.name} upload progress`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--preone-color-primary)] transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.error && (
                    <span className="text-xs text-[var(--preone-color-error)]">
                      {file.error}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove?.(file.id);
                  }}
                  className="ml-2 p-1 rounded hover:bg-[var(--preone-border)] transition-colors"
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-4 w-4 text-[var(--preone-text-secondary)]"
                    aria-hidden="true"
                  >
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {files.length > 0 && onUpload && (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled || loading}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'bg-[var(--preone-color-primary)] text-white hover:opacity-90',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--preone-color-primary)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading ? 'Uploading...' : uploadLabel}
          </button>
        )}

        {helperText && (
          <span className="text-xs text-[var(--preone-text-secondary)]">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

FileUpload.displayName = 'FileUpload';
