export interface MenuAimPoint {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export type MenuAimDirection = 'right' | 'left';

/**
 * Amazon-style menu-aim algorithm.
 * Detects if the pointer is heading toward the currently open submenu panel
 * by checking if the current position falls inside a triangle formed by the
 * previous position and the near edge of the submenu.
 */
export function shouldDelaySubmenuSwitch(
  previous: MenuAimPoint | null,
  current: MenuAimPoint,
  submenuRect: DOMRect,
  direction: MenuAimDirection,
  sampleMaxAgeMs = 200,
): boolean {
  if (!previous) return false;

  if (!Number.isFinite(submenuRect.left) || submenuRect.width <= 0 || submenuRect.height <= 0) {
    return false;
  }

  if (current.t - previous.t > sampleMaxAgeMs) return false;

  const dx = current.x - previous.x;

  // Require clear horizontal intent toward the submenu
  if (direction === 'right' && dx <= 2) return false;
  if (direction === 'left' && dx >= -2) return false;

  // Near edge of submenu panel
  const edgeX = direction === 'right' ? submenuRect.left : submenuRect.right;

  const padY = 8;
  const cornerA = { x: edgeX, y: submenuRect.top - padY };
  const cornerB = { x: edgeX, y: submenuRect.bottom + padY };

  return pointInTriangle(current, previous, cornerA, cornerB);
}

function pointInTriangle(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): boolean {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

function sign(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
