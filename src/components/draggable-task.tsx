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
// Dragging works with a mouse or pen. On touch screens a drag would fight
// with scrolling, so there (and from the keyboard) the task's edit dialog
// has a "Start at" field instead. A press that doesn't move is an ordinary
// click, so the task's menu still opens.

const DRAG_THRESHOLD_PX = 5;

type Offset = { x: number; y: number };

interface DragOptions {
  axis: 'y' | 'both';
  /** Called as the pointer moves, with how far it has moved. */
  onMove?: (offset: Offset, event: PointerEvent) => void;
  /** Called on release: the new start to place the task at, or null to cancel. */
  onDrop: (offset: Offset, event: PointerEvent) => Date | null;
  onEnd?: () => void;
  taskId: string;
}

function useDragToPlace({ axis, onMove, onDrop, onEnd, taskId }: DragOptions) {
  const [offset, setOffset] = useState<Offset | null>(null);
  const [isPending, startTransition] = useTransition();
  const suppressClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});

  // Keep the block where it was dropped until the new plan arrives, then let
  // the redrawn plan position it. A layout effect, so the two never both show.
  const wasPending = useRef(false);
  useLayoutEffect(() => {
    if (wasPending.current && !isPending) setOffset(null);
    wasPending.current = isPending;
  }, [isPending]);

  useEffect(() => () => cleanup.current(), []);

  const onPointerDown = (down: React.PointerEvent) => {
    if (down.button !== 0 || down.pointerType === 'touch' || isPending) return;
    const origin = { x: down.clientX, y: down.clientY };
    let dragging = false;

    const offsetOf = (event: PointerEvent) => ({
      x: axis === 'y' ? 0 : event.clientX - origin.x,
      y: event.clientY - origin.y,
    });

    const move = (event: PointerEvent) => {
      const next = offsetOf(event);
      if (!dragging) {
        if (Math.hypot(next.x, next.y) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        document.body.style.userSelect = 'none';
      }
      setOffset(next);
      onMove?.(next, event);
    };

    const finish = (event: PointerEvent | null) => {
      stop();
      if (!dragging) return;
      // The click that follows the release isn't a click on the task.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      onEnd?.();

      const start = event ? onDrop(offsetOf(event), event) : null;
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
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      document.body.style.userSelect = '';
      cleanup.current = () => {};
    };
    const cancel = () => finish(null);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    cleanup.current = stop;
  };

  const onClickCapture = (event: React.MouseEvent) => {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const isDragging = offset !== null && !isPending;
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

const dragClasses = (isDragging: boolean, isPending: boolean) =>
  `${isDragging ? 'cursor-grabbing opacity-90 shadow-lg' : ''} ${isPending ? 'opacity-70' : ''}`;

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

  const drag = useDragToPlace({
    axis: 'y',
    taskId,
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
function dayUnder(event: PointerEvent): HTMLElement | null {
  return (
    document
      .elementFromPoint(event.clientX, event.clientY)
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

  const drag = useDragToPlace({
    axis: 'both',
    taskId,
    onMove: (_, event) => {
      clearTargets();
      const column = dayUnder(event);
      if (dayFor(column)) column!.setAttribute(TARGET_ATTRIBUTE, '');
    },
    onDrop: (_, event) => {
      const day = dayFor(dayUnder(event));
      return day ? startOnDay(start, day, timeZone) : null;
    },
    onEnd: clearTargets,
  });

  return (
    <div
      className={`relative ${dragClasses(drag.isDragging, drag.isPending)}`}
      style={drag.style}
      onPointerDown={drag.onPointerDown}
      onClickCapture={drag.onClickCapture}
    >
      {children}
    </div>
  );
}
