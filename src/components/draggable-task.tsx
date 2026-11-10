'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { placeTask } from '@/app/actions/task';
import { formatClock } from '@/lib/format';
import { movedStart, startOnDay } from '@/lib/planning/move';

// Dragging a planned task to a new time (Today timeline) or day (Week board).
// Dropping it places the task there, and the plan is redrawn around it.
//
// With a mouse or pen, a drag starts once the pointer moves a few pixels. On
// a touch screen a drag would fight with scrolling, so it starts with a press
// and hold: a finger that moves before then is scrolling the page. A press
// that never becomes a drag is an ordinary click or tap, so the task's menu
// still opens. From the keyboard, the edit dialog's "Start at" field does
// the same job.
//
// Near the top or bottom of the window the page scrolls, so a task can be
// dragged to a day that's off screen (the Week board is a long list on a
// phone). The edges are where the page shows: below the sticky header, and
// above the phone's tab bar.

const DRAG_THRESHOLD_PX = 5;
const LONG_PRESS_MS = 400;
const TOUCH_SLOP_PX = 8; // A finger moving more than this before the hold is scrolling
const EDGE_PX = 64; // How close to the window's edge auto-scrolling starts
const MAX_SCROLL_PX = 14; // Per frame, right at the edge

/** The part of the window the page shows, between the header and the tab bar. */
function visibleBand() {
  const bar = document.querySelector('[data-tab-bar]');
  const barRect = bar?.getBoundingClientRect();
  return {
    top:
      document.querySelector('[data-app-header]')?.getBoundingClientRect()
        .bottom ?? 0,
    bottom: barRect && barRect.height > 0 ? barRect.top : window.innerHeight,
  };
}

type Offset = { x: number; y: number };
/** Where the pointer is, in the window. */
export type Point = { clientX: number; clientY: number };

interface DragOptions {
  axis: 'y' | 'both';
  /** Called as the pointer moves, with how far the task has moved. */
  onMove?: (offset: Offset, point: Point) => void;
  /** Called on release: the new start to place the task at, or null to cancel. */
  onDrop: (offset: Offset, point: Point) => Date | null;
  onEnd?: () => void;
  taskId: string;
  /** The task's wrapper element. */
  ref: React.RefObject<HTMLDivElement | null>;
}

function useDragToPlace({
  axis,
  onMove,
  onDrop,
  onEnd,
  taskId,
  ref,
}: DragOptions) {
  const [offset, setOffset] = useState<Offset | null>(null);
  const [isLifted, setIsLifted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});

  // Keep the block where it was dropped until the new plan arrives, then let
  // the redrawn plan position it. A layout effect, so the two never both show.
  const wasPending = useRef(false);
  useLayoutEffect(() => {
    if (wasPending.current && !isPending) setOffset(null);
    wasPending.current = isPending;
  }, [isPending]);

  // While a touch drag is on, the page mustn't scroll under the finger. React
  // registers touch listeners as passive, which can't prevent that, so this
  // one is added by hand.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const holdStill = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault();
    };
    element.addEventListener('touchmove', holdStill, { passive: false });
    return () => element.removeEventListener('touchmove', holdStill);
  }, [ref]);

  useEffect(() => () => cleanup.current(), []);

  const onPointerDown = (down: React.PointerEvent) => {
    if (isPending) return;
    const isTouch = down.pointerType === 'touch';
    if (!isTouch && down.button !== 0) return;

    const origin = {
      x: down.clientX,
      y: down.clientY,
      scrollY: window.scrollY,
    };
    let point: Point = { clientX: down.clientX, clientY: down.clientY };
    let held = !isTouch; // A mouse can drag straight away; a finger after holding
    let frame = 0;
    let band = { top: 0, bottom: window.innerHeight };

    const offsetOf = (): Offset => ({
      x: axis === 'y' ? 0 : point.clientX - origin.x,
      // Scrolling moves the page under the pointer, so it counts too.
      y: point.clientY - origin.y + window.scrollY - origin.scrollY,
    });
    const update = () => {
      const next = offsetOf();
      setOffset(next);
      onMove?.(next, point);
    };

    const autoScroll = () => {
      const fromTop = point.clientY - band.top;
      const fromBottom = band.bottom - point.clientY;
      // Past the edge (over the header or tab bar) is full speed.
      const speed = (distance: number) =>
        Math.ceil(
          ((EDGE_PX - Math.max(distance, 0)) / EDGE_PX) * MAX_SCROLL_PX
        );
      const dy =
        fromTop < EDGE_PX
          ? -speed(fromTop)
          : fromBottom < EDGE_PX
            ? speed(fromBottom)
            : 0;
      if (dy !== 0) {
        window.scrollBy(0, dy);
        update();
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const startDrag = () => {
      dragging.current = true;
      setIsLifted(true);
      document.body.style.userSelect = 'none';
      band = visibleBand();
      update();
      frame = requestAnimationFrame(autoScroll);
    };

    // A finger that stays put for a moment picks the task up.
    const holdTimer = isTouch
      ? setTimeout(() => {
          held = true;
          navigator.vibrate?.(10);
          startDrag();
        }, LONG_PRESS_MS)
      : undefined;

    const move = (event: PointerEvent) => {
      if (event.pointerId !== down.pointerId) return;
      point = { clientX: event.clientX, clientY: event.clientY };
      if (dragging.current) {
        update();
        return;
      }
      const distance = Math.hypot(
        point.clientX - origin.x,
        point.clientY - origin.y
      );
      if (!held) {
        // Moved before the hold: the finger is scrolling, not dragging.
        if (distance > TOUCH_SLOP_PX) stop();
        return;
      }
      if (distance >= DRAG_THRESHOLD_PX) startDrag();
    };

    const finish = (event: PointerEvent | null) => {
      if (event && event.pointerId !== down.pointerId) return;
      const wasDragging = dragging.current;
      stop();
      if (!wasDragging) return;
      // The click that follows the release isn't a click on the task.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      onEnd?.();

      const start = event ? onDrop(offsetOf(), point) : null;
      if (!start) {
        setOffset(null);
        return;
      }
      startTransition(async () => {
        const formData = new FormData();
        formData.set('taskId', taskId);
        formData.set('plannedStart', start.toISOString());
        await placeTask(formData);
      });
    };

    const up = (event: PointerEvent) => finish(event);
    const cancel = () => finish(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null);
    };
    // A long press would otherwise open the browser's own menu.
    const contextMenu = (event: Event) => {
      if (isTouch) event.preventDefault();
    };
    function stop() {
      clearTimeout(holdTimer);
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('contextmenu', contextMenu);
      document.body.style.userSelect = '';
      dragging.current = false;
      setIsLifted(false);
      cleanup.current = () => {};
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('contextmenu', contextMenu);
    cleanup.current = stop;
  };

  const onClickCapture = (event: React.MouseEvent) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const isDragging = isLifted && !isPending;
  const style: React.CSSProperties | undefined = offset
    ? {
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: 40,
        // Let the pointer find what's underneath, such as a day column.
        pointerEvents: isDragging ? 'none' : undefined,
      }
    : undefined;

  return { onPointerDown, onClickCapture, style, isDragging, isPending };
}

// No text selection or the iOS callout on a long press.
const touchClasses = 'select-none [-webkit-touch-callout:none]';

const dragClasses = (isDragging: boolean, isPending: boolean) =>
  `${touchClasses} ${isDragging ? 'cursor-grabbing opacity-90 shadow-lg' : ''} ${isPending ? 'opacity-70' : ''}`;

interface TimelineDragProps {
  taskId: string;
  start: Date; // This block's start
  earliest: Date; // Planning can't start before this (now, or the start of the day)
  latest: Date; // The end of the timeline
  pxPerMinute: number;
  timeZone: string;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}

/** A task block on the Today timeline that can be dragged up or down. */
export function TimelineDraggable({
  taskId,
  start,
  earliest,
  latest,
  pxPerMinute,
  timeZone,
  className,
  style,
  children,
}: TimelineDragProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const target = (offset: Offset) =>
    movedStart(start, offset.y / pxPerMinute, earliest, latest);

  const ref = useRef<HTMLDivElement>(null);
  const drag = useDragToPlace({
    axis: 'y',
    taskId,
    ref,
    onMove: (offset) => setPreview(formatClock(target(offset), timeZone)),
    onDrop: (offset) => {
      const next = target(offset);
      return next.getTime() === start.getTime() ? null : next;
    },
    onEnd: () => setPreview(null),
  });

  return (
    <div
      className={`${className} ${dragClasses(drag.isDragging, drag.isPending)}`}
      style={{ ...style, ...drag.style }}
      ref={ref}
      onPointerDown={drag.onPointerDown}
      onClickCapture={drag.onClickCapture}
    >
      {children}
      {preview && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 right-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-canvas tabular-nums"
        >
          Start at {preview}
        </span>
      )}
    </div>
  );
}

interface WeekDragProps {
  taskId: string;
  start: Date;
  dayIndex: number; // The day this block is on
  days: { date: Date; start: Date; end: Date; isDayOff: boolean }[];
  timeZone: string;
  children: React.ReactNode;
}

const DAY_SELECTOR = '[data-day-index]';
const TARGET_ATTRIBUTE = 'data-drop-target';

/** The day column under the pointer on the Week board, if any. */
function dayUnder(point: Point): HTMLElement | null {
  return (
    document
      .elementFromPoint(point.clientX, point.clientY)
      ?.closest<HTMLElement>(DAY_SELECTOR) ?? null
  );
}

function clearTargets() {
  document
    .querySelectorAll(`[${TARGET_ATTRIBUTE}]`)
    .forEach((el) => el.removeAttribute(TARGET_ATTRIBUTE));
}

/** A task on the Week board that can be dragged to another day. */
export function WeekDraggable({
  taskId,
  start,
  dayIndex,
  days,
  timeZone,
  children,
}: WeekDragProps) {
  // The day a drop over `column` would move the task to, if it can go there.
  const dayFor = (column: HTMLElement | null) => {
    if (!column) return null;
    const index = Number(column.dataset.dayIndex);
    const day = days[index];
    if (index === dayIndex || !day || day.isDayOff || day.start >= day.end) {
      return null;
    }
    return day;
  };

  const ref = useRef<HTMLDivElement>(null);
  const drag = useDragToPlace({
    axis: 'both',
    taskId,
    ref,
    onMove: (_, point) => {
      clearTargets();
      const column = dayUnder(point);
      if (dayFor(column)) column!.setAttribute(TARGET_ATTRIBUTE, '');
    },
    onDrop: (_, point) => {
      const day = dayFor(dayUnder(point));
      return day ? startOnDay(start, day, timeZone) : null;
    },
    onEnd: clearTargets,
  });

  return (
    <div
      className={`relative ${dragClasses(drag.isDragging, drag.isPending)}`}
      style={drag.style}
      ref={ref}
      onPointerDown={drag.onPointerDown}
      onClickCapture={drag.onClickCapture}
    >
      {children}
    </div>
  );
}
