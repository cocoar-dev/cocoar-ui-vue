import { computed, ref, readonly, shallowRef, type DeepReadonly, type Ref } from 'vue';

/**
 * Reactive state object returned by {@link useContextMenu}.
 * Pass it to `<CoarContextMenu :menu="...">` to wire up the context menu.
 */
export interface ContextMenuContext {
  /** Whether the context menu is currently open */
  readonly isOpen: DeepReadonly<Ref<boolean>>;
  /** Cursor position where the menu was opened — used internally by CoarContextMenu */
  readonly position: DeepReadonly<Ref<{ x: number; y: number }>>;
  /**
   * **Preview** — may still change. Element the opening event targeted (`null` without an
   * element target). CoarContextMenu passes it as the overlay's `context`, so a menu opened
   * in a local `.coar-mobile` area keeps the mobile presentation. Optional so hand-made
   * controllers keep type-checking.
   */
  readonly target?: Readonly<Ref<Element | null>>;
  /** Open the context menu at the pointer position. Calls `preventDefault()` on the event. */
  open(event: MouseEvent | { clientX: number; clientY: number }): void;
  /** Close the context menu */
  close(): void;
}

/**
 * Composable for managing context menu state.
 * Use together with `<CoarContextMenu>` to create right-click menus.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useContextMenu, CoarContextMenu, CoarMenuItem } from '@cocoar/vue-ui';
 * const menu = useContextMenu();
 * </script>
 *
 * <template>
 *   <div @contextmenu="menu.open">Right-click here</div>
 *   <CoarContextMenu :menu="menu">
 *     <CoarMenuItem label="Copy" icon="copy" />
 *     <CoarMenuItem label="Delete" icon="trash-2" />
 *   </CoarContextMenu>
 * </template>
 * ```
 */
function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === 1;
}

export function useContextMenu(): ContextMenuContext {
  const isOpen = ref(false);
  const position = ref({ x: 0, y: 0 });
  const target = shallowRef<Element | null>(null);

  function open(event: MouseEvent | { clientX: number; clientY: number }) {
    if ('preventDefault' in event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    position.value = { x: event.clientX, y: event.clientY };
    const eventTarget = 'target' in event ? event.target : null;
    // No global `Element` during SSR: check the node type instead of `instanceof`.
    target.value = isElement(eventTarget) ? eventTarget : null;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  return {
    isOpen: readonly(isOpen),
    position: readonly(position),
    // computed, not readonly(): a deep-readonly Element type would not be an Element.
    target: computed(() => target.value),
    open,
    close,
  };
}
