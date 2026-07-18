'use client';

import React, { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { colors, radius, duration, easing } from '@preone/design-tokens';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  maxWidth?: string;
  scrollbarSize?: number;
  hideScrollbar?: boolean;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ maxHeight, maxWidth, scrollbarSize = 8, hideScrollbar = false, className, style, children, ...props }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const [thumbHeight, setThumbHeight] = useState(0);
    const [thumbTop, setThumbTop] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const updateThumb = useCallback(() => {
      const el = contentRef.current;
      if (!el) return;

      const { scrollHeight, clientHeight, scrollTop } = el;
      if (scrollHeight <= clientHeight) {
        setThumbHeight(0);
        return;
      }

      const ratio = clientHeight / scrollHeight;
      const newThumbHeight = Math.max(ratio * clientHeight, 32);
      const maxThumbTop = clientHeight - newThumbHeight;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      const newThumbTop = scrollRatio * maxThumbTop;

      setThumbHeight(newThumbHeight);
      setThumbTop(newThumbTop);
    }, []);

    useEffect(() => {
      updateThumb();
      const el = contentRef.current;
      if (!el) return;

      const observer = new ResizeObserver(updateThumb);
      observer.observe(el);
      return () => observer.disconnect();
    }, [updateThumb, children]);

    const handleScroll = () => {
      updateThumb();
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = contentRef.current;
      if (!el || !trackRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const scrollRatio = clickY / trackRect.height;
      el.scrollTop = scrollRatio * el.scrollHeight;
    };

    const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const startY = e.clientY;
      const startScrollTop = contentRef.current?.scrollTop || 0;
      const el = contentRef.current;
      if (!el) return;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const { scrollHeight, clientHeight } = el;
        const scrollRatio = deltaY / (clientHeight - thumbHeight);
        el.scrollTop = startScrollTop + scrollRatio * (scrollHeight - clientHeight);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      maxHeight: maxHeight || undefined,
      maxWidth: maxWidth || undefined,
      overflow: 'hidden',
      ...style,
    };

    const contentStyle: React.CSSProperties = {
      overflowY: 'auto',
      overflowX: 'auto',
      maxHeight: maxHeight || undefined,
      maxWidth: maxWidth || undefined,
      paddingRight: hideScrollbar ? '0' : `${scrollbarSize + 4}px`,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    };

    const trackStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      right: 0,
      width: `${scrollbarSize + 4}px`,
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      opacity: isHovering || isDragging ? 1 : 0,
      transition: `opacity ${duration.normal} ${easing.DEFAULT}`,
    };

    const thumbStyle: React.CSSProperties = {
      width: `${scrollbarSize}px`,
      height: `${thumbHeight}px`,
      marginTop: `${thumbTop}px`,
      borderRadius: radius.full,
      backgroundColor: isDragging ? colors.neutral[400] : colors.neutral[300],
      transition: `background-color ${duration.fast} ${easing.DEFAULT}`,
      cursor: 'grab',
    };

    return (
      <>
        <style>{`
          .preone-scroll-area-content::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div
          ref={(node) => {
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={cn('preone-scroll-area', className)}
          style={containerStyle}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...props}
        >
          <div
            ref={contentRef}
            className="preone-scroll-area-content"
            style={contentStyle}
            onScroll={handleScroll}
          >
            {children}
          </div>
          {!hideScrollbar && thumbHeight > 0 && (
            <div ref={trackRef} style={trackStyle} onClick={handleTrackClick}>
              <div
                ref={thumbRef}
                style={thumbStyle}
                onMouseDown={handleThumbMouseDown}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.neutral[400]; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDragging ? colors.neutral[400] : colors.neutral[300]; }}
              />
            </div>
          )}
        </div>
      </>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
