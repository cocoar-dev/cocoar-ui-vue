import { inject, provide, ref, type InjectionKey, type Ref } from 'vue';
import { isAncestor, type NodePath } from './operations';
import { createPointerDndEngine } from './pointerDnd';
import type { UsePageBuilderReturn } from './usePageBuilder';

export type DragPayload =
  // `type` is a registry key — built-in or consumer-registered.
  | { kind: 'new'; type: string }
  | { kind: 'move'; path: NodePath };

export interface BuilderDndContext {
  isDragging: Ref<boolean>;
  payload: Ref<DragPayload | null>;
  activeZoneKey: Ref<string | null>;
  startDrag(payload: DragPayload): void;
  endDrag(): void;
  onZoneEnter(key: string, parentPath: NodePath): boolean;
  onZoneLeave(key: string): void;
  onZoneDrop(parentPath: NodePath, index: number): void;
  canDrop(parentPath: NodePath): boolean;
  /**
   * Entry point for every drag handle (palette card, canvas tab, outline
   * grip): hands the pointerdown to the pointer engine, which arms the drag
   * (movement threshold for mouse, long-press for touch) and drives the zone
   * callbacks above. `ghostFrom` picks the element the drag ghost is cloned
   * from when the handle itself is too small to be recognizable.
   */
  onHandlePointerDown(
    e: PointerEvent,
    payload: DragPayload,
    ghostFrom?: HTMLElement | null,
  ): void;
}

export const BUILDER_DND: InjectionKey<BuilderDndContext> = Symbol('PageBuilderDnd');

const HOVER_CLEAR_DELAY_MS = 80;

export function provideBuilderDnd(builder: UsePageBuilderReturn): BuilderDndContext {
  const isDragging = ref(false);
  const payload = ref<DragPayload | null>(null);
  const activeZoneKey = ref<string | null>(null);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelClearTimer() {
    if (clearTimer !== null) { clearTimeout(clearTimer); clearTimer = null; }
  }

  function canDrop(parentPath: NodePath): boolean {
    const p = payload.value;
    if (!p) return false;
    if (p.kind === 'new') return true;
    return !isAncestor(p.path, parentPath);
  }

  function startDrag(p: DragPayload) {
    cancelClearTimer();
    isDragging.value = true;
    payload.value = p;
  }

  function endDrag() {
    isDragging.value = false;
    payload.value = null;
    activeZoneKey.value = null;
    cancelClearTimer();
  }

  function onZoneEnter(key: string, parentPath: NodePath): boolean {
    if (!canDrop(parentPath)) return false;
    cancelClearTimer();
    activeZoneKey.value = key;
    return true;
  }

  function onZoneLeave(key: string) {
    if (activeZoneKey.value !== key) return;
    cancelClearTimer();
    clearTimer = setTimeout(() => {
      if (activeZoneKey.value === key) activeZoneKey.value = null;
      clearTimer = null;
    }, HOVER_CLEAR_DELAY_MS);
  }

  function onZoneDrop(parentPath: NodePath, index: number) {
    const p = payload.value;
    if (!p || !canDrop(parentPath)) return;

    if (p.kind === 'new') {
      builder.addChild(parentPath, p.type, index);
      return;
    }

    const fromPath = p.path;
    if (fromPath.length === 0) return;
    const fromParent = fromPath.slice(0, -1);
    const fromIndex = fromPath[fromPath.length - 1];
    const sameParent =
      fromParent.length === parentPath.length &&
      fromParent.every((v, i) => v === parentPath[i]);

    let finalIndex = index;
    if (sameParent) {
      if (fromIndex < index) finalIndex = index - 1;
      if (finalIndex === fromIndex) return;
    }

    builder.moveTo(fromPath, parentPath, finalIndex);
  }

  const engine = createPointerDndEngine({
    canDrop, startDrag, endDrag, onZoneEnter, onZoneLeave, onZoneDrop,
  });

  const ctx: BuilderDndContext = {
    isDragging, payload, activeZoneKey,
    startDrag, endDrag, onZoneEnter, onZoneLeave, onZoneDrop, canDrop,
    onHandlePointerDown: engine.onHandlePointerDown,
  };
  provide(BUILDER_DND, ctx);
  return ctx;
}

export function useBuilderDnd(): BuilderDndContext {
  const ctx = inject(BUILDER_DND);
  if (!ctx) throw new Error('useBuilderDnd must be called inside CoarPageBuilder.');
  return ctx;
}
