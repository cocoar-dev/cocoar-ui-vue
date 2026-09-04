/**
 * Module-level registry that carries live item references across HTML5 drag-and-drop
 * events. Used by {@link useDragDrop} to exchange payloads between independent Vue
 * components — the browser's `DataTransfer` API only accepts strings, so we serialize
 * a drag id there and keep the actual payload (with object identity preserved) here.
 *
 * Exported for advanced integrations that want to implement their own drag handlers
 * while staying compatible with {@link useDragDrop}'s matching rules.
 */

export const DRAG_MIME = 'application/x-coar-dnd';

export interface DragEntry<T = unknown> {
  /** Random drag-session id (stored in DataTransfer as a string). */
  id: string;
  /** Stable id of the source surface — used to detect self-drops. */
  sourceId: string;
  /** Public identifier the consumer gave the source via `dragId`, if any. */
  fromId: string | null;
  /** Optional drag group name. Only surfaces sharing a group accept each other's items. */
  dragGroup: string | null;
  /** The actual items being dragged. */
  items: readonly T[];
  /**
   * Invoked by the drop target when it accepts the drop. The source uses this to
   * emit its "items-removed" callback synchronously — avoiding the brief "duplicated
   * items" window between `drop` on the target and `dragend` on the source.
   */
  onAcceptedBy?: (targetId: string, insertIndex: number | null) => void;
  /** Flag set by a target on accept so the source's `dragend` can report `dropped: true`. */
  consumed?: boolean;
}

const registry = new Map<string, DragEntry<unknown>>();
let activeEntry: DragEntry<unknown> | null = null;

export function registerDrag<T>(entry: DragEntry<T>): void {
  registry.set(entry.id, entry as DragEntry<unknown>);
  activeEntry = entry as DragEntry<unknown>;
}

export function getDrag<T>(id: string): DragEntry<T> | undefined {
  return registry.get(id) as DragEntry<T> | undefined;
}

/**
 * Returns the drag session currently in flight — readable during `dragover`
 * events, where the browser refuses to expose `DataTransfer.getData()`.
 */
export function getActiveDrag<T>(): DragEntry<T> | undefined {
  return activeEntry as DragEntry<T> | undefined;
}

export function deleteDrag(id: string): void {
  registry.delete(id);
  if (activeEntry?.id === id) activeEntry = null;
}

// ── Pointer-engine drop surfaces ──────────────────────────────────────────────
// The pointer engine has no browser-provided target dispatch, so surfaces that
// accept pointer drags register their element here and are looked up by hit test.

/** A drop surface for pointer-engine drags. @internal */
export interface PointerSurface {
  hover(entry: DragEntry<unknown>, x: number, y: number): void;
  leave(): void;
  drop(entry: DragEntry<unknown>, x: number, y: number): boolean;
}

const pointerSurfaces = new Map<HTMLElement, PointerSurface>();

/** @internal */
export function registerPointerSurface(element: HTMLElement, surface: PointerSurface): void {
  pointerSurfaces.set(element, surface);
}

/** @internal */
export function unregisterPointerSurface(element: HTMLElement): void {
  pointerSurfaces.delete(element);
}

/** The registered surface whose element contains the point, innermost first. @internal */
export function findPointerSurface(x: number, y: number): PointerSurface | null {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return null;
  const hit = document.elementFromPoint(x, y);
  if (!hit) return null;
  let best: { element: HTMLElement; surface: PointerSurface } | null = null;
  for (const [element, surface] of pointerSurfaces) {
    if (!element.contains(hit)) continue;
    if (!best || best.element.contains(element)) best = { element, surface };
  }
  return best?.surface ?? null;
}
