/**
 * @preone/ui — Resizable Panel Components
 *
 * A lightweight, CSS-driven resizable panel system with draggable handles.
 * Built from scratch without external dependencies — uses pointer events
 * for drag handling and CSS flexbox for layout.
 *
 * Features:
 * - **ResizablePanelGroup**: Flex container that manages panel layout
 * - **ResizablePanel**: Individual panel with min/max size constraints
 * - **ResizableHandle**: Draggable divider between panels
 * - **Direction**: horizontal, vertical
 * - **forwardRef**: All sub-components forward refs
 * - **ARIA**: Role attributes and keyboard-accessible handles
 * - **Design tokens**: All styling via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * Design Rules:
 * - Very large whitespace
 * - Rounded corners (var(--radius-lg))
 * - Soft shadows only
 * - NO heavy borders, NO glossy, NO gradients
 * - Premium minimal handle design
 *
 * @example
 * ```tsx
 * import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@preone/ui';
 *
 * <ResizablePanelGroup direction="horizontal">
 *   <ResizablePanel defaultSize={30} minSize={20}>
 *     <Sidebar />
 *   </ResizablePanel>
 *   <ResizableHandle />
 *   <ResizablePanel defaultSize={70} minSize={30}>
 *     <MainContent />
 *   </ResizablePanel>
 * </ResizablePanelGroup>
 *
 * <ResizablePanelGroup direction="vertical" className="h-96">
 *   <ResizablePanel defaultSize={60}>Top</ResizablePanel>
 *   <ResizableHandle withHandle />
 *   <ResizablePanel defaultSize={40}>Bottom</ResizablePanel>
 * </ResizablePanelGroup>
 * ```
 *
 * @module resizable-panel
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { GripHorizontal, GripVertical } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Direction of the resizable panel group. */
export type ResizableDirection = 'horizontal' | 'vertical';

interface PanelGroupContextValue {
  /** Layout direction. */
  direction: ResizableDirection;
  /** Register a panel with its size constraints. */
  registerPanel: (id: string, config: PanelConfig) => void;
  /** Unregister a panel. */
  unregisterPanel: (id: string) => void;
  /** Request a resize from a handle. */
  onHandleDrag: (handleId: string, delta: number) => void;
  /** Get the current size of a panel. */
  getPanelSize: (id: string) => number;
  /** Total number of panels. */
  panelCount: number;
  /** All panel IDs in order. */
  panelIds: string[];
}

const PanelGroupContext = React.createContext<PanelGroupContextValue | null>(null);

/** Hook to access the panel group context. */
function usePanelGroup(): PanelGroupContextValue {
  const ctx = React.useContext(PanelGroupContext);
  if (!ctx) {
    throw new Error(
      'ResizablePanel components must be used within a <ResizablePanelGroup>.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Panel configuration
// ---------------------------------------------------------------------------

interface PanelConfig {
  /** Minimum size as a percentage (0-100). @default 10 */
  minSize: number;
  /** Maximum size as a percentage (0-100). @default 100 */
  maxSize: number;
  /** Default size as a percentage (0-100). @default equal share */
  defaultSize?: number;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/**
 * ResizablePanelGroup variant definitions.
 */
export const resizablePanelGroupVariants = cva(
  [
    'flex',
    'w-full',
    'h-full',
    'overflow-hidden',
    'rounded-[var(--radius-lg,0.75rem)]',
  ].join(' '),
  {
    variants: {
      direction: {
        horizontal: 'flex-row',
        vertical: 'flex-col',
      },
    },
    defaultVariants: {
      direction: 'horizontal',
    },
  },
);

/**
 * ResizableHandle variant definitions.
 */
export const resizableHandleVariants = cva(
  [
    'relative',
    'flex',
    'shrink-0',
    'items-center',
    'justify-center',
    'transition-colors',
    'duration-[var(--duration-fast,150ms)]',
    'ease-[var(--ease-default,cubic-bezier(0.4,0,0.2,1))]',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-[var(--ring)]',
    'z-10',
  ].join(' '),
  {
    variants: {
      direction: {
        horizontal: [
          'w-px',
          'cursor-col-resize',
          'bg-[var(--border)]',
          'hover:bg-[var(--primary)]/30',
          'active:bg-[var(--primary)]/50',
          'data-[active=true]:bg-[var(--primary)]/50',
        ].join(' '),
        vertical: [
          'h-px',
          'cursor-row-resize',
          'bg-[var(--border)]',
          'hover:bg-[var(--primary)]/30',
          'active:bg-[var(--primary)]/50',
          'data-[active=true]:bg-[var(--primary)]/50',
        ].join(' '),
      },
      withHandle: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        direction: 'horizontal',
        withHandle: true,
        class: 'w-2.5 -mx-1 rounded-[var(--radius-lg,0.75rem)] bg-[var(--border)] hover:bg-[var(--muted-foreground)]/20',
      },
      {
        direction: 'vertical',
        withHandle: true,
        class: 'h-2.5 -my-1 rounded-[var(--radius-lg,0.75rem)] bg-[var(--border)] hover:bg-[var(--muted-foreground)]/20',
      },
    ],
    defaultVariants: {
      direction: 'horizontal',
      withHandle: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ResizablePanelGroup component. */
export interface ResizablePanelGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof resizablePanelGroupVariants> {
  /** Layout direction. @default 'horizontal' */
  direction?: ResizableDirection;
  /** Panels and handles rendered as children. */
  children?: React.ReactNode;
}

/** Props for the ResizablePanel component. */
export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default size as a percentage (0–100). If omitted, panels share space equally. */
  defaultSize?: number;
  /** Minimum size as a percentage. @default 10 */
  minSize?: number;
  /** Maximum size as a percentage. @default 100 */
  maxSize?: number;
  /** Whether the panel is collapsible. @default false */
  collapsible?: boolean;
  /** Whether the panel is collapsed. @default false */
  collapsed?: boolean;
  /** Callback when the panel is collapsed. */
  onCollapse?: () => void;
  /** Callback when the panel is expanded. */
  onExpand?: () => void;
  /** Callback when the panel is resized. */
  onResize?: (size: number) => void;
  /** Panel content. */
  children?: React.ReactNode;
}

/** Props for the ResizableHandle component. */
export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show a grip icon in the handle. @default false */
  withHandle?: boolean;
  /** Whether the handle is disabled. @default false */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// ResizablePanelGroup
// ---------------------------------------------------------------------------

/**
 * ResizablePanelGroup — A flex container that manages resizable panels.
 *
 * Maintains panel sizes in state, distributes space according to
 * default/min/max constraints, and handles pointer-based resizing
 * through embedded ResizableHandle components.
 *
 * **Accessibility:**
 * - Handles have `role="separator"` and `aria-orientation`
 * - Keyboard interaction via arrow keys on focused handles
 *
 * @param props - {@link ResizablePanelGroupProps}
 * @param ref - Forwarded ref to the container div.
 * @returns The rendered panel group.
 */
export const ResizablePanelGroup = React.forwardRef<
  HTMLDivElement,
  ResizablePanelGroupProps
>(
  (
    {
      className,
      direction = 'horizontal',
      children,
      ...props
    },
    ref,
  ) => {
    const [panelIds, setPanelIds] = React.useState<string[]>([]);
    const [panelConfigs, setPanelConfigs] = React.useState<Map<string, PanelConfig>>(new Map());
    const [panelSizes, setPanelSizes] = React.useState<Map<string, number>>(new Map());

    // Stable ID counter for generating panel IDs
    const idCounterRef = React.useRef(0);

    const registerPanel = React.useCallback(
      (id: string, config: PanelConfig) => {
        setPanelConfigs((prev) => {
          const next = new Map(prev);
          next.set(id, config);
          return next;
        });
        setPanelIds((prev) => {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        });
        setPanelSizes((prev) => {
          if (prev.has(id)) return prev;
          return new Map(prev).set(id, config.defaultSize ?? 0);
        });
      },
      [],
    );

    const unregisterPanel = React.useCallback((id: string) => {
      setPanelIds((prev) => prev.filter((pid) => pid !== id));
      setPanelConfigs((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setPanelSizes((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, []);

    // Distribute sizes evenly when panels don't have explicit defaults
    React.useEffect(() => {
      const count = panelIds.length;
      if (count === 0) return;

      setPanelSizes((prev) => {
        const next = new Map(prev);
        const unsetIds = panelIds.filter((id) => next.get(id) === 0);
        if (unsetIds.length === 0) return prev;

        // Calculate remaining space after fixed defaults
        let usedSize = 0;
        let fixedCount = 0;
        for (const id of panelIds) {
          const size = next.get(id) ?? 0;
          if (size > 0) {
            usedSize += size;
            fixedCount++;
          }
        }

        const remaining = Math.max(0, 100 - usedSize);
        const perPanel = unsetIds.length > 0 ? remaining / unsetIds.length : 0;

        for (const id of unsetIds) {
          next.set(id, perPanel);
        }

        return next;
      });
    }, [panelIds]);

    const onHandleDrag = React.useCallback(
      (handleId: string, delta: number) => {
        // Find the two panels adjacent to this handle
        // Handle IDs are formatted as `handle-{beforeId}-{afterId}`
        const parts = handleId.split('-');
        const beforeId = parts[1];
        const afterId = parts[2];
        if (!beforeId || !afterId) return;

        setPanelSizes((prev) => {
          const beforeSize = prev.get(beforeId) ?? 0;
          const afterSize = prev.get(afterId) ?? 0;
          const beforeConfig = panelConfigs.get(beforeId);
          const afterConfig = panelConfigs.get(afterId);

          const beforeMin = beforeConfig?.minSize ?? 10;
          const beforeMax = beforeConfig?.maxSize ?? 100;
          const afterMin = afterConfig?.minSize ?? 10;
          const afterMax = afterConfig?.maxSize ?? 100;

          let newBefore = beforeSize + delta;
          let newAfter = afterSize - delta;

          // Clamp to min/max
          if (newBefore < beforeMin) {
            newAfter += beforeMin - newBefore;
            newBefore = beforeMin;
          }
          if (newBefore > beforeMax) {
            newAfter -= newBefore - beforeMax;
            newBefore = beforeMax;
          }
          if (newAfter < afterMin) {
            newBefore += afterMin - newAfter;
            newAfter = afterMin;
          }
          if (newAfter > afterMax) {
            newBefore -= newAfter - afterMax;
            newAfter = afterMax;
          }

          // Final safety clamp
          newBefore = Math.max(beforeMin, Math.min(beforeMax, newBefore));
          newAfter = Math.max(afterMin, Math.min(afterMax, newAfter));

          const next = new Map(prev);
          next.set(beforeId, newBefore);
          next.set(afterId, newAfter);
          return next;
        });
      },
      [panelConfigs],
    );

    const getPanelSize = React.useCallback(
      (id: string) => panelSizes.get(id) ?? 0,
      [panelSizes],
    );

    const contextValue = React.useMemo<PanelGroupContextValue>(
      () => ({
        direction,
        registerPanel,
        unregisterPanel,
        onHandleDrag,
        getPanelSize,
        panelCount: panelIds.length,
        panelIds,
      }),
      [direction, registerPanel, unregisterPanel, onHandleDrag, getPanelSize, panelIds],
    );

    return (
      <PanelGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            resizablePanelGroupVariants({ direction }),
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </PanelGroupContext.Provider>
    );
  },
);

ResizablePanelGroup.displayName = 'ResizablePanelGroup';

// ---------------------------------------------------------------------------
// ResizablePanel
// ---------------------------------------------------------------------------

/**
 * ResizablePanel — An individual panel within a ResizablePanelGroup.
 *
 * Supports min/max size constraints and controlled/uncontrolled sizing.
 * Sizes are expressed as percentages of the total group width/height.
 *
 * @param props - {@link ResizablePanelProps}
 * @param ref - Forwarded ref to the panel div.
 * @returns The rendered panel.
 */
export const ResizablePanel = React.forwardRef<
  HTMLDivElement,
  ResizablePanelProps
>(
  (
    {
      className,
      defaultSize,
      minSize = 10,
      maxSize = 100,
      collapsible = false,
      collapsed = false,
      onCollapse,
      onExpand,
      onResize,
      children,
      ...props
    },
    ref,
  ) => {
    const { registerPanel, unregisterPanel, getPanelSize, direction } = usePanelGroup();

    const idRef = React.useRef(`panel-${React.useId()}`);
    const panelId = idRef.current;

    React.useEffect(() => {
      registerPanel(panelId, {
        minSize,
        maxSize,
        defaultSize,
      });
      return () => unregisterPanel(panelId);
    }, [panelId, minSize, maxSize, defaultSize, registerPanel, unregisterPanel]);

    const size = getPanelSize(panelId);

    React.useEffect(() => {
      if (onResize && size > 0) {
        onResize(size);
      }
    }, [size, onResize]);

    const style = React.useMemo<React.CSSProperties>(
      () => ({
        flex: `${size} 0 0%`,
        overflow: 'hidden',
      }),
      [size],
    );

    return (
      <div
        ref={ref}
        id={panelId}
        className={cn(
          'relative',
          'min-h-0',
          'min-w-0',
          collapsed && (direction === 'horizontal' ? 'w-0! flex-none! overflow-hidden!' : 'h-0! flex-none! overflow-hidden!'),
          className,
        )}
        style={style}
        role="region"
        aria-label="Resizable panel"
        {...props}
      >
        {children}
      </div>
    );
  },
);

ResizablePanel.displayName = 'ResizablePanel';

// ---------------------------------------------------------------------------
// ResizableHandle
// ---------------------------------------------------------------------------

/**
 * ResizableHandle — A draggable divider between two ResizablePanels.
 *
 * Supports pointer-based drag resizing with visual grip indicator.
 * Implements keyboard resizing via arrow keys for accessibility.
 *
 * **Accessibility:**
 * - `role="separator"` with `aria-orientation`
 * - `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
 * - Keyboard: Arrow keys resize in 2% increments
 * - `aria-label` for screen readers
 *
 * @param props - {@link ResizableHandleProps}
 * @param ref - Forwarded ref to the handle div.
 * @returns The rendered handle.
 */
export const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  ResizableHandleProps
>(
  (
    {
      className,
      withHandle = false,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const { direction, onHandleDrag, panelIds } = usePanelGroup();
    const [isActive, setIsActive] = React.useState(false);
    const startPointerRef = React.useRef(0);
    const handleIdRef = React.useRef('');

    // Determine the panels before and after this handle.
    // We find our index among siblings by counting preceding panels.
    const indexRef = React.useRef(-1);

    // We use a layout effect to determine our position among siblings
    const internalRef = React.useRef<HTMLDivElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    // Determine sibling panel indices
    React.useLayoutEffect(() => {
      if (!internalRef.current) return;
      const parent = internalRef.current.parentElement;
      if (!parent) return;

      const siblings = Array.from(parent.children);
      const handleIndex = siblings.indexOf(internalRef.current);

      // Find the panels immediately before and after this handle
      let beforePanelIdx = -1;
      let afterPanelIdx = -1;

      for (let i = handleIndex - 1; i >= 0; i--) {
        if (siblings[i].role === 'region') {
          beforePanelIdx = i;
          break;
        }
      }
      for (let i = handleIndex + 1; i < siblings.length; i++) {
        if (siblings[i].role === 'region') {
          afterPanelIdx = i;
          break;
        }
      }

      // Map DOM indices to panel IDs
      const panelElements = siblings.filter((s) => s.role === 'region');
      const beforeId = beforePanelIdx >= 0
        ? (panelElements.filter((_, i) => {
            const idx = siblings.indexOf(panelElements[i]);
            return idx < handleIndex;
          }).pop()?.id ?? '')
        : '';
      const afterId = afterPanelIdx >= 0
        ? (panelElements.filter((s) => {
            const idx = siblings.indexOf(s);
            return idx > handleIndex;
          })[0]?.id ?? '')
        : '';

      handleIdRef.current = `handle-${beforeId}-${afterId}`;
    });

    // Pointer event handlers
    const handlePointerDown = React.useCallback(
      (e: React.PointerEvent) => {
        if (disabled) return;
        e.preventDefault();
        setIsActive(true);
        startPointerRef.current =
          direction === 'horizontal' ? e.clientX : e.clientY;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      },
      [direction, disabled],
    );

    const handlePointerMove = React.useCallback(
      (e: React.PointerEvent) => {
        if (!isActive || disabled) return;
        const current = direction === 'horizontal' ? e.clientX : e.clientY;
        const deltaPx = current - startPointerRef.current;
        startPointerRef.current = current;

        // Convert pixel delta to percentage of the group container
        const groupEl = internalRef.current?.parentElement;
        if (!groupEl) return;
        const groupSize =
          direction === 'horizontal'
            ? groupEl.offsetWidth
            : groupEl.offsetHeight;
        if (groupSize === 0) return;

        const deltaPercent = (deltaPx / groupSize) * 100;
        onHandleDrag(handleIdRef.current, deltaPercent);
      },
      [isActive, direction, disabled, onHandleDrag],
    );

    const handlePointerUp = React.useCallback(() => {
      setIsActive(false);
    }, []);

    // Keyboard handler
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;
        const step = 2; // 2% per key press

        const isForward =
          (direction === 'horizontal' && e.key === 'ArrowRight') ||
          (direction === 'vertical' && e.key === 'ArrowDown');
        const isBackward =
          (direction === 'horizontal' && e.key === 'ArrowLeft') ||
          (direction === 'vertical' && e.key === 'ArrowUp');

        if (isForward) {
          e.preventDefault();
          onHandleDrag(handleIdRef.current, step);
        } else if (isBackward) {
          e.preventDefault();
          onHandleDrag(handleIdRef.current, -step);
        }
      },
      [direction, disabled, onHandleDrag],
    );

    return (
      <div
        ref={setRefs}
        role="separator"
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-label="Resize handle"
        aria-valuenow={undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={disabled ? -1 : 0}
        data-active={isActive}
        className={cn(
          resizableHandleVariants({ direction, withHandle }),
          disabled && 'pointer-events-none opacity-30',
          className,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {withHandle && (
          <div
            className={cn(
              'flex items-center justify-center',
              'rounded-[var(--radius-lg,0.75rem)]',
              'bg-[var(--muted-foreground)]/15',
              'transition-colors',
              'duration-[var(--duration-fast,150ms)]',
              'hover:bg-[var(--muted-foreground)]/30',
              direction === 'horizontal'
                ? 'h-6 w-1'
                : 'w-6 h-1',
            )}
          >
            {direction === 'horizontal' ? (
              <GripVertical
                className="h-3 w-3 text-[var(--muted-foreground)]/60"
                aria-hidden="true"
              />
            ) : (
              <GripHorizontal
                className="h-3 w-3 text-[var(--muted-foreground)]/60"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

ResizableHandle.displayName = 'ResizableHandle';
