import type { AnchorSpec, Placement, PositionSpec } from './overlay-types';

export interface ViewportRect {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface OverlaySize {
  readonly width: number;
  readonly height: number;
}

export interface OverlayCoordinates {
  readonly left: number;
  readonly top: number;
  readonly placement: Placement;
}

export function getViewportRect(): ViewportRect {
  const docEl = document.documentElement;
  const width = docEl?.clientWidth || window.innerWidth;
  const height = docEl?.clientHeight || window.innerHeight;
  return { width, height };
}

export function getContainerRect(container: HTMLElement): Rect {
  return rectFromDom(container.getBoundingClientRect());
}

export function rectFromDom(domRect: DOMRect): Rect {
  return {
    left: domRect.left,
    top: domRect.top,
    right: domRect.right,
    bottom: domRect.bottom,
    width: domRect.width,
    height: domRect.height,
  };
}

export function getAnchorRect(anchor: AnchorSpec, viewport: ViewportRect): Rect {
  switch (anchor.kind) {
    case 'element':
      return rectFromDom(anchor.element.getBoundingClientRect());
    case 'point':
      return rectFromPoint(anchor, 0, 0);
    case 'virtual':
      return rectFromVirtual(anchor, viewport);
  }
}

export function rectFromPoint(
  point: { x: number; y: number },
  width: number,
  height: number,
): Rect {
  const left = point.x;
  const top = point.y;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function rectFromVirtual(
  spec: Extract<AnchorSpec, { kind: 'virtual' }>,
  viewport: ViewportRect,
): Rect {
  if (spec.placement === 'center') {
    return rectFromPoint({ x: viewport.width / 2, y: viewport.height / 2 }, 0, 0);
  }
  if (spec.placement === 'top') {
    return rectFromPoint({ x: viewport.width / 2, y: 0 }, 0, 0);
  }
  return rectFromPoint({ x: viewport.width / 2, y: viewport.height }, 0, 0);
}

export function getScrollParents(element: Element): Array<Element | Window> {
  const result: Array<Element | Window> = [];
  let current: Element | null = element;

  while (current?.parentElement) {
    current = current.parentElement;
    const style = getComputedStyle(current);
    const scrollable =
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowX === 'auto' ||
      style.overflowX === 'scroll';
    if (scrollable) result.push(current);
  }

  result.push(window);
  return result;
}

/**
 * Compute the best overlay position given anchor, overlay size, and constraints.
 */
export function computeOverlayCoordinates(
  anchorRect: Rect,
  overlaySize: OverlaySize,
  position: PositionSpec,
  viewport: ViewportRect,
  boundaryRect?: Rect,
): OverlayCoordinates {
  const placements: readonly Placement[] = Array.isArray(position.placement)
    ? position.placement
    : [position.placement];

  const offset = position.offset ?? 0;
  const allowFlip = position.flip ?? false;
  const allowShift = position.shift ?? false;

  const boundary: Rect = boundaryRect ?? {
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
    width: viewport.width,
    height: viewport.height,
  };

  const candidates = placements.map((placement) => ({
    placement,
    coords: coordsForPlacement(anchorRect, overlaySize, placement, offset),
  }));

  if (allowFlip) {
    for (const candidate of candidates) {
      if (fitsInBoundary(candidate.coords, overlaySize, boundary)) {
        const coords = allowShift
          ? shiftIntoBoundary(candidate.coords, overlaySize, boundary)
          : candidate.coords;
        return { ...coords, placement: candidate.placement };
      }
    }
  }

  // Choose the candidate with smallest total overflow
  let best = candidates[0];
  let bestOverflow = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const overflow = totalOverflow(candidate.coords, overlaySize, boundary);
    if (overflow < bestOverflow) {
      best = candidate;
      bestOverflow = overflow;
    }
  }

  const chosen =
    best?.coords ?? coordsForPlacement(anchorRect, overlaySize, placements[0] ?? 'bottom', offset);
  const shifted = allowShift ? shiftIntoBoundary(chosen, overlaySize, boundary) : chosen;
  return { ...shifted, placement: best?.placement ?? (placements[0] ?? 'bottom') };
}

function coordsForPlacement(
  anchor: Rect,
  overlay: OverlaySize,
  placement: Placement,
  offset: number,
): { left: number; top: number } {
  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;

  switch (placement) {
    case 'center':
      return { left: cx - overlay.width / 2, top: cy - overlay.height / 2 };

    case 'top':
      return { left: cx - overlay.width / 2, top: anchor.top - overlay.height - offset };
    case 'top-start':
      return { left: anchor.left, top: anchor.top - overlay.height - offset };
    case 'top-end':
      return { left: anchor.right - overlay.width, top: anchor.top - overlay.height - offset };

    case 'bottom':
      return { left: cx - overlay.width / 2, top: anchor.bottom + offset };
    case 'bottom-start':
      return { left: anchor.left, top: anchor.bottom + offset };
    case 'bottom-end':
      return { left: anchor.right - overlay.width, top: anchor.bottom + offset };

    case 'left':
      return { left: anchor.left - overlay.width - offset, top: cy - overlay.height / 2 };
    case 'left-start':
      return { left: anchor.left - overlay.width - offset, top: anchor.top };
    case 'left-end':
      return { left: anchor.left - overlay.width - offset, top: anchor.bottom - overlay.height };

    case 'right':
      return { left: anchor.right + offset, top: cy - overlay.height / 2 };
    case 'right-start':
      return { left: anchor.right + offset, top: anchor.top };
    case 'right-end':
      return { left: anchor.right + offset, top: anchor.bottom - overlay.height };
  }
}

function fitsInBoundary(
  coords: { left: number; top: number },
  size: OverlaySize,
  boundary: Rect,
): boolean {
  return (
    coords.left >= boundary.left &&
    coords.top >= boundary.top &&
    coords.left + size.width <= boundary.right &&
    coords.top + size.height <= boundary.bottom
  );
}

function shiftIntoBoundary(
  coords: { left: number; top: number },
  size: OverlaySize,
  boundary: Rect,
): { left: number; top: number } {
  const maxLeft = Math.max(boundary.left, boundary.right - size.width);
  const maxTop = Math.max(boundary.top, boundary.bottom - size.height);
  return {
    left: clamp(coords.left, boundary.left, maxLeft),
    top: clamp(coords.top, boundary.top, maxTop),
  };
}

function totalOverflow(
  coords: { left: number; top: number },
  size: OverlaySize,
  boundary: Rect,
): number {
  return (
    Math.max(0, boundary.left - coords.left) +
    Math.max(0, boundary.top - coords.top) +
    Math.max(0, coords.left + size.width - boundary.right) +
    Math.max(0, coords.top + size.height - boundary.bottom)
  );
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
