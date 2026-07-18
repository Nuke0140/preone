import * as React from 'react';
import { cn } from './cn.js';

/**
 * Variants for ImageUpload styling.
 */
export type ImageUploadVariant = 'default' | 'avatar' | 'gallery';

/**
 * Sizes for ImageUpload.
 */
export type ImageUploadSize = 'sm' | 'md' | 'lg';

/**
 * Image preview item.
 */
export interface ImageItem {
  /** Unique identifier */
  id: string;
  /** Object URL or URL for the image preview */
  url: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** Upload progress 0-100 */
  progress?: number;
  /** Error message */
  error?: string;
  /** File object reference */
  file?: File;
}

/**
 * Props for the ImageUpload component.
 */
export interface ImageUploadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Accepted image types */
  accept?: string;
  /** Allow multiple image selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of images */
  maxImages?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Current image list */
  images?: ImageItem[];
  /** Callback when images change */
  onImagesChange?: (images: ImageItem[]) => void;
  /** Callback when an image is removed */
  onImageRemove?: (imageId: string) => void;
  /** Visual variant */
  variant?: ImageUploadVariant;
  /** Size */
  size?: ImageUploadSize;
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
  /** Placeholder text in upload area */
  placeholder?: string;
  /** Crop hint text */
  cropHint?: string;
}

const avatarSizes: Record<ImageUploadSize, string> = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

const gallerySizes: Record<ImageUploadSize, string> = {
  sm: 'h-20 w-20',
  md: 'h-28 w-28',
  lg: 'h-36 w-36',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * PreOne ImageUpload component with preview, crop hint, and size limits.
 * Supports avatar, gallery, and default variants, disabled/loading/dark modes,
 * and ARIA accessibility.
 *
 * @example
 * ```tsx
 * <ImageUpload
 *   variant="avatar"
 *   size="md"
 *   maxSize={5 * 1024 * 1024}
 *   images={imageList}
 *   onImagesChange={setImageList}
 *   cropHint="Recommended: square, at least 200x200px"
 * />
 * ```
 */
export const ImageUpload = React.forwardRef<HTMLDivElement, ImageUploadProps>(
  (
    {
      accept = 'image/*',
      multiple = false,
      maxSize,
      maxImages,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      images = [],
      onImagesChange,
      onImageRemove,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      dark = false,
      label,
      helperText,
      placeholder = 'Click or drag to upload image',
      cropHint,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const imageIdCounter = React.useRef(0);

    const validateImageDimensions = React.useCallback(
      (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
          if (!minWidth && !minHeight && !maxWidth && !maxHeight) {
            resolve(true);
            return;
          }
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            const valid =
              (!minWidth || img.width >= minWidth) &&
              (!minHeight || img.height >= minHeight) &&
              (!maxWidth || img.width <= maxWidth) &&
              (!maxHeight || img.height <= maxHeight);
            resolve(valid);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(false);
          };
          img.src = url;
        });
      },
      [minWidth, minHeight, maxWidth, maxHeight],
    );

    const processFiles = React.useCallback(
      async (newFiles: File[]) => {
        let filtered = newFiles.filter((f) => f.type.startsWith('image/'));
        if (maxSize) {
          filtered = filtered.filter((f) => f.size <= maxSize);
        }

        const dimensionChecked = await Promise.all(
          filtered.map(async (file) => {
            const valid = await validateImageDimensions(file);
            return { file, valid };
          }),
        );

        const validFiles = dimensionChecked
          .filter((r) => r.valid)
          .map((r) => r.file);

        if (maxImages) {
          const remaining = maxImages - images.length;
          validFiles.splice(remaining);
        }

        const newItems: ImageItem[] = validFiles.map((file) => ({
          id: `img-${++imageIdCounter.current}`,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          progress: -1,
          file,
        }));

        onImagesChange?.([...images, ...newItems]);
      },
      [maxSize, maxImages, images, onImagesChange, validateImageDimensions],
    );

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
      [disabled, processFiles],
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        processFiles(selectedFiles);
        if (inputRef.current) inputRef.current.value = '';
      },
      [processFiles],
    );

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
              dark && 'text-[var(--preone-text-primary-dark)]',
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative overflow-hidden',
            variant === 'avatar' && [
              avatarSizes[size],
              'rounded-full border-2 border-dashed border-[var(--preone-border)]',
              'flex items-center justify-center',
            ],
            variant === 'gallery' && [
              'flex flex-wrap gap-2',
            ],
            variant === 'default' && [
              'rounded-lg border-2 border-dashed border-[var(--preone-border)] p-6',
            ],
            isDragging && 'border-[var(--preone-color-primary)] bg-[var(--preone-color-primary-soft)]',
            loading && 'animate-pulse',
            'cursor-pointer transition-colors',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={placeholder}
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

          {variant === 'avatar' ? (
            images.length > 0 ? (
              <img
                src={images[0].url}
                alt={images[0].name}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-[var(--preone-text-secondary)]"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            )
          ) : variant === 'gallery' ? (
            <>
              {images.map((img) => (
                <div
                  key={img.id}
                  className={cn(
                    'relative group rounded-md overflow-hidden border border-[var(--preone-border)]',
                    gallerySizes[size],
                  )}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                  {img.progress !== undefined && img.progress >= 0 && img.progress < 100 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {img.progress}%
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageRemove?.(img.id);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${img.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </div>
              ))}
              {(!maxImages || images.length < maxImages) && (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-md border-2 border-dashed border-[var(--preone-border)]',
                    gallerySizes[size],
                    isDragging && 'border-[var(--preone-color-primary)]',
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-4 w-4 text-[var(--preone-text-secondary)]"
                    aria-hidden="true"
                  >
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-8 w-8 text-[var(--preone-text-secondary)]"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
              <span className="text-sm text-[var(--preone-text-secondary)]">
                {placeholder}
              </span>
            </div>
          )}
        </div>

        {variant === 'default' && images.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="Uploaded images">
            {images.map((img) => (
              <li
                key={img.id}
                className="flex items-center gap-2 rounded-md border border-[var(--preone-border)] px-3 py-2 bg-[var(--preone-surface)]"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="h-10 w-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm">{img.name}</span>
                  <span className="text-xs text-[var(--preone-text-secondary)] block">
                    {formatFileSize(img.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onImageRemove?.(img.id)}
                  className="p-1 rounded hover:bg-[var(--preone-border)] transition-colors"
                  aria-label={`Remove ${img.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {cropHint && (
          <span className="text-xs text-[var(--preone-text-secondary)] italic">
            {cropHint}
          </span>
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

ImageUpload.displayName = 'ImageUpload';
