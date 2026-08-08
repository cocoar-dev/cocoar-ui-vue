/**
 * Pointer-events drag engine for the builder. Replaces native HTML5 DnD so
 * dragging works with mouse, pen AND touch (tablet-first): HTML5 drag events
 * never fire from touch on Android, and long-press arming keeps taps intact.
 * The zone MODEL (enter/leave/drop, canDrop) stays in `useBuilderDnd` — this
 * module only supplies the transport.
 *
 * Mechanics:
 * - mouse: the drag starts once the pointer moves >5px with the button held —
 *   plain clicks keep working.
 * - touch/pen: the drag arms after a 300ms long-press with <8px movement.
 *   Handles carry `touch-action: none`, so the browser never converts the
 *   gesture into a scroll mid-drag.
 * - While dragging: a ghost clone follows the pointer; zones are hit-tested
 *   by rect distance (nearest wins; `data-pb-zone-inflate` lets thin bars
 *   compete with large row targets); scroll containers auto-scroll near their
 *   edges; Escape or pointercancel aborts.
 *
 * Zones are DOM-declared: any element inside the builder root carrying
 * `data-dropzone` (the zone key), `data-pb-zone-path` ('' = root, else
 * '0/2/1') and `data-pb-zone-index` participates. Rects are read fresh every
 * frame, so scrolling and layout shifts never leave stale targets.
 */
import type { NodePath } from './operations';
import type { DragPayload } from './useBuilderDnd';

// ─── Pure helpers (unit-tested) ───────────────────────────────────────────────

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ZoneCandidate {
  key: string;
  path: NodePath;
  index: number;
  rect: RectLike;
  /** Effective reach bonus in px — thin bars declare it to beat large rows. */
  inflate: number;
  el?: HTMLElement;
}

/** Distance from a point to a rect's edge; 0 when the point is inside. */
export function rectDistance(rect: RectLike, x: number, y: number): number {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

export function parseZonePath(raw: string): NodePath {
  return raw === '' ? [] : raw.split('/').map(Number);
}

/**
 * Nearest acceptable zone within `maxDist`. Ties (typically a thin inflated
 * bar overlapping a big row) go to the smaller target — the more precise
 * intent wins.
 */
export function pickZone(
  zones: readonly ZoneCandidate[],
  x: number,
  y: number,
  maxDist: number,
): ZoneCandidate | null {
  let best: ZoneCandidate | null = null;
  let bestDist = Infinity;
  let bestArea = Infinity;
  for (const z of zones) {
    const d = Math.max(0, rectDistance(z.rect, x, y) - z.inflate);
    if (d > maxDist) continue;
    const area = (z.rect.right - z.rect.left) * (z.rect.bottom - z.rect.top);
    if (d < bestDist || (d === bestDist && area < bestArea)) {
      best = z;
      bestDist = d;
      bestArea = area;
    }
  }
  return best;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const START_DIST_PX = 5;
const TOUCH_SLOP_PX = 8;
const LONG_PRESS_MS = 300;
const ZONE_ACCEPT_DIST_PX = 60;
const ZONE_FADE_RADIUS_PX = 120;
const EDGE_SCROLL_ZONE_PX = 36;
const EDGE_SCROLL_MAX_PX = 14;
const GHOST_MAX_WIDTH_PX = 280;
const GHOST_MAX_HEIGHT_PX = 160;

/** The slice of the dnd context the engine drives. */
export interface PointerDndTarget {
  canDrop(parentPath: NodePath): boolean;
  startDrag(payload: DragPayload): void;
  endDrag(): void;
  onZoneEnter(key: string, parentPath: NodePath): boolean;
  onZoneLeave(key: string): void;
  onZoneDrop(parentPath: NodePath, index: number): void;
}

export interface PointerDndEngine {
  onHandlePointerDown(
    e: PointerEvent,
    payload: DragPayload,
    ghostFrom?: HTMLElement | null,
  ): void;
}

export function createPointerDndEngine(dnd: PointerDndTarget): PointerDndEngine {
  let phase: 'idle' | 'pending' | 'dragging' = 'idle';
  let pointerId = -1;
  let isTouchLike = false;
  let payload: DragPayload | null = null;
  let ghostSource: HTMLElement | null = null;
  let rootEl: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let raf = 0;
  let ghostEl: HTMLElement | null = null;
  let cursorStyleEl: HTMLStyleElement | null = null;
  let currentZone: ZoneCandidate | null = null;

  function onHandlePointerDown(
    e: PointerEvent,
    dragPayload: DragPayload,
    ghostFrom?: HTMLElement | null,
  ) {
    if (phase !== 'idle') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const handle = e.currentTarget as HTMLElement | null;
    if (!handle) return;

    phase = 'pending';
    pointerId = e.pointerId;
    isTouchLike = e.pointerType !== 'mouse';
    payload = dragPayload;
    ghostSource = ghostFrom ?? handle;
    rootEl = handle.closest<HTMLElement>('.pb-builder');
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('contextmenu', onContextMenu, true);

    if (isTouchLike) {
      pressTimer = setTimeout(() => {
        pressTimer = null;
        if (phase === 'pending') beginDrag();
      }, LONG_PRESS_MS);
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (phase === 'pending') {
      const moved = Math.hypot(lastX - startX, lastY - startY);
      if (isTouchLike) {
        // Moving before the long-press fires means this was never a drag.
        if (moved > TOUCH_SLOP_PX) teardown(false);
      } else if (moved > START_DIST_PX) {
        beginDrag();
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (phase === 'dragging' && currentZone) {
      dnd.onZoneDrop(currentZone.path, currentZone.index);
    }
    teardown(phase === 'dragging');
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    teardown(phase === 'dragging');
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    teardown(true);
  }

  /** Long-press on touch fires the context menu — swallow it mid-gesture. */
  function onContextMenu(e: Event) {
    if (phase !== 'idle') e.preventDefault();
  }

  function beginDrag() {
    if (!payload) return;
    phase = 'dragging';
    dnd.startDrag(payload);
    window.addEventListener('keydown', onKeyDown, true);
    if (ghostSource) ghostEl = makeGhost(ghostSource);
    cursorStyleEl = document.createElement('style');
    cursorStyleEl.textContent =
      '* { cursor: grabbing !important; user-select: none !important; -webkit-user-select: none !important; }';
    document.head.appendChild(cursorStyleEl);
    raf = requestAnimationFrame(frame);
  }

  function frame() {
    if (phase !== 'dragging') return;
    autoScroll();
    hitTest();
    fadeCanvasZones();
    if (ghostEl) {
      ghostEl.style.transform = `translate(${lastX + 12}px, ${lastY + 10}px)`;
    }
    raf = requestAnimationFrame(frame);
  }

  function collectZones(): ZoneCandidate[] {
    const scope: ParentNode = rootEl ?? document;
    const els = scope.querySelectorAll<HTMLElement>('[data-pb-zone-path]');
    const zones: ZoneCandidate[] = [];
    for (const el of els) {
      const path = parseZonePath(el.dataset.pbZonePath ?? '');
      if (!dnd.canDrop(path)) continue;
      const rect = el.getBoundingClientRect();
      zones.push({
        key: el.dataset.dropzone ?? '',
        path,
        index: Number(el.dataset.pbZoneIndex ?? 0),
        rect,
        inflate: Number(el.dataset.pbZoneInflate ?? 0),
        el,
      });
    }
    return zones;
  }

  function hitTest() {
    const picked = pickZone(collectZones(), lastX, lastY, ZONE_ACCEPT_DIST_PX);
    if (picked?.key === currentZone?.key) {
      currentZone = picked ?? currentZone;
      return;
    }
    if (currentZone) dnd.onZoneLeave(currentZone.key);
    currentZone = picked && dnd.onZoneEnter(picked.key, picked.path) ? picked : null;
  }

  /** Same proximity fade the HTML5 dragover handler used to apply. */
  function fadeCanvasZones() {
    if (!rootEl) return;
    const zones = rootEl.querySelectorAll<HTMLElement>(
      '.canvas-dropzone:not(.canvas-dropzone--empty)',
    );
    for (const zone of zones) {
      const dist = rectDistance(zone.getBoundingClientRect(), lastX, lastY);
      zone.style.opacity =
        dist >= ZONE_FADE_RADIUS_PX ? '0' : (1 - dist / ZONE_FADE_RADIUS_PX).toFixed(3);
    }
  }

  function clearCanvasZoneFade() {
    if (!rootEl) return;
    const zones = rootEl.querySelectorAll<HTMLElement>(
      '.canvas-dropzone:not(.canvas-dropzone--empty)',
    );
    for (const zone of zones) zone.style.opacity = '';
  }

  function autoScroll() {
    if (!rootEl) return;
    const containers = rootEl.querySelectorAll<HTMLElement>('.pb-canvas, .pb-outline-wrap');
    for (const sc of containers) {
      const r = sc.getBoundingClientRect();
      if (lastX < r.left || lastX > r.right || lastY < r.top || lastY > r.bottom) continue;
      const topDist = lastY - r.top;
      const bottomDist = r.bottom - lastY;
      if (topDist < EDGE_SCROLL_ZONE_PX) {
        sc.scrollTop -= EDGE_SCROLL_MAX_PX * (1 - topDist / EDGE_SCROLL_ZONE_PX);
      } else if (bottomDist < EDGE_SCROLL_ZONE_PX) {
        sc.scrollTop += EDGE_SCROLL_MAX_PX * (1 - bottomDist / EDGE_SCROLL_ZONE_PX);
      }
    }
  }

  function makeGhost(src: HTMLElement): HTMLElement {
    const rect = src.getBoundingClientRect();
    const clone = src.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    const wrap = document.createElement('div');
    // Inline styles on purpose: the ghost lives on <body>, outside every
    // scoped stylesheet — it must look right even without them.
    Object.assign(wrap.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '9999',
      pointerEvents: 'none',
      opacity: '0.85',
      width: `${Math.min(rect.width || GHOST_MAX_WIDTH_PX, GHOST_MAX_WIDTH_PX)}px`,
      maxHeight: `${GHOST_MAX_HEIGHT_PX}px`,
      overflow: 'hidden',
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
      background: 'var(--coar-background-neutral-primary, #fff)',
      transform: `translate(${lastX + 12}px, ${lastY + 10}px)`,
    } satisfies Partial<CSSStyleDeclaration>);
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    return wrap;
  }

  function teardown(wasDragging: boolean) {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('contextmenu', onContextMenu, true);
    ghostEl?.remove();
    ghostEl = null;
    cursorStyleEl?.remove();
    cursorStyleEl = null;
    clearCanvasZoneFade();
    currentZone = null;
    payload = null;
    ghostSource = null;
    phase = 'idle';
    pointerId = -1;
    if (wasDragging) dnd.endDrag();
    rootEl = null;
  }

  return { onHandlePointerDown };
}
