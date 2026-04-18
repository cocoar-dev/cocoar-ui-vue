import { shallowRef, shallowReactive, markRaw, type Component, type Raw } from 'vue';
import type {
  OverlaySpec,
  OverlayRef,
  ResolvedOverlaySpec,
  SizeSpec,
} from './overlay-types';
import { resolveOverlaySpec } from './overlay-types';
import {
  computeOverlayCoordinates,
  getAnchorRect,
  getContainerRect,
  getScrollParents,
  getViewportRect,
} from './overlay-position';

let instanceId = 0;

/**
 * Internal state for a single open overlay.
 */
export interface OverlayInstance {
  readonly id: number;
  readonly spec: ResolvedOverlaySpec;
  readonly content: OverlayContent;
  readonly inputs: Record<string, unknown>;
  /** Position in px, updated by reposition logic */
  left: number;
  top: number;
  /** Resolved placement after flip/shift */
  placement: string;
  /** Whether the overlay has been presented (initial position computed) */
  presented: boolean;
  /** Whether closed */
  closed: boolean;
  /** Cleanup functions for event listeners */
  cleanups: Array<() => void>;
  /** The panel element (set after mount) */
  panelEl: HTMLElement | null;
  /** The anchor element for reposition */
  anchorEl: Element | null;
  /** Parent overlay instance (for tree hierarchies) */
  parent: OverlayInstance | null;
  /** Child overlays */
  children: Set<OverlayInstance>;
  /** Hover close timer */
  hoverCloseTimer: ReturnType<typeof setTimeout> | null;
  /** ResizeObserver */
  resizeObserver: ResizeObserver | null;
  /** RAF pending flag */
  rafPending: boolean;
  /** Focus restore target */
  restoreFocusTarget: Element | null;
  /** Promise resolve for afterClosed */
  resolveAfterClosed: (result: unknown) => void;
  /** After closed promise */
  afterClosed: Promise<unknown>;
}

interface OverlayRefWithId extends OverlayRef {
  __instanceId: number;
}

export type OverlayContent =
  | { kind: 'component'; component: Raw<Component>; }
  | { kind: 'slot' };

export interface OverlayOpenOptions {
  /** The overlay spec (can include a preset merged with overrides) */
  spec: OverlaySpec;
  /** Content to render — either a Vue component or 'slot' for template-based usage */
  content: OverlayContent;
  /** Props/inputs to pass to the content component */
  inputs?: Record<string, unknown>;
  /**
   * Parent overlay (for child/submenu overlays). Accepts either the `OverlayRef`
   * returned from a previous `open()` call or the `OverlayInstance` provided under
   * `OVERLAY_PARENT_KEY` by `CoarOverlayOutlet` — the latter is what
   * `useOverlayParent()` returns, so descendants can pass it straight through.
   */
  parent?: OverlayRef | OverlayInstance;
}

/**
 * Global overlay manager. Creates and manages overlay instances.
 *
 * Usage:
 * ```ts
 * const overlayService = useOverlayService();
 * const ref = overlayService.open({ spec: menuPreset, content: { kind: 'component', component: MyMenu } });
 * ref.close();
 * ```
 */
export function createOverlayService() {
  const instances = shallowRef<OverlayInstance[]>([]);
  let globalListenersInstalled = false;

  function open(options: OverlayOpenOptions): OverlayRef {
    const spec = resolveOverlaySpec(options.spec);
    const id = ++instanceId;

    let resolveAfterClosed: (result: unknown) => void = () => {};
    const afterClosed = new Promise<unknown>((resolve) => {
      resolveAfterClosed = resolve;
    });

    const instance = shallowReactive<OverlayInstance>({
      id,
      spec,
      content: options.content.kind === 'component'
        ? { kind: 'component', component: markRaw(options.content.component) }
        : { kind: 'slot' },
      inputs: options.inputs ?? {},
      left: 0,
      top: 0,
      placement: Array.isArray(spec.position.placement)
        ? (spec.position.placement[0] ?? 'bottom')
        : spec.position.placement,
      presented: false,
      closed: false,
      cleanups: [],
      panelEl: null,
      anchorEl: spec.anchor.kind === 'element' ? spec.anchor.element : null,
      parent: null,
      children: new Set(),
      hoverCloseTimer: null,
      resizeObserver: null,
      rafPending: false,
      restoreFocusTarget: typeof document !== 'undefined' ? document.activeElement : null,
      resolveAfterClosed,
      afterClosed,
    });

    // Parent-child linking
    if (options.parent) {
      const parentInstance = findInstanceByRefOrInstance(options.parent);
      if (parentInstance) {
        instance.parent = parentInstance;
        parentInstance.children.add(instance);
      }
    }

    instances.value = [...instances.value, instance];
    installGlobalListeners();

    const overlayRef = createOverlayRef(instance);
    return overlayRef;
  }

  function createOverlayRef(instance: OverlayInstance): OverlayRef {
    const ref: OverlayRefWithId = {
      __instanceId: instance.id,
      get isClosed() { return instance.closed; },
      get afterClosed() { return instance.afterClosed; },
      get panelElement() { return instance.panelEl; },
      close(result?: unknown) { closeInstance(instance, result); },
      updatePosition() { repositionInstance(instance); },
    };
    return ref;
  }

  function closeInstance(instance: OverlayInstance, result?: unknown): void {
    if (instance.closed) return;
    instance.closed = true;

    // Cancel hover timers
    if (instance.hoverCloseTimer) {
      clearTimeout(instance.hoverCloseTimer);
      instance.hoverCloseTimer = null;
    }

    // Close children first
    for (const child of Array.from(instance.children)) {
      closeInstance(child);
    }

    // Run cleanup functions
    for (const cleanup of instance.cleanups) {
      cleanup();
    }
    instance.cleanups = [];

    // Disconnect resize observer
    instance.resizeObserver?.disconnect();
    instance.resizeObserver = null;

    // Restore focus
    if (instance.spec.focus.restore !== false && instance.restoreFocusTarget) {
      const el = instance.restoreFocusTarget as HTMLElement;
      if (typeof el.focus === 'function') {
        try { el.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    }

    // Remove from parent
    instance.parent?.children.delete(instance);

    // Remove from instances array
    instances.value = instances.value.filter((i) => i.id !== instance.id);

    // Resolve promise
    instance.resolveAfterClosed(result);

    uninstallGlobalListenersIfIdle();
  }

  function closeAll(): void {
    for (const instance of [...instances.value]) {
      closeInstance(instance);
    }
  }

  /**
   * Called by CoarOverlayHost after the panel element mounts.
   * Sets up repositioning and presents the overlay.
   */
  function onPanelMounted(instance: OverlayInstance, panelEl: HTMLElement, hostEl: HTMLElement): void {
    instance.panelEl = panelEl;

    // Apply size constraints
    applySize(instance, hostEl);

    // Install reposition triggers
    installRepositionTriggers(instance, hostEl);

    // Initial position
    repositionInstance(instance, hostEl);
  }

  function repositionInstance(instance: OverlayInstance, hostEl?: HTMLElement): void {
    if (instance.closed) return;
    if (instance.rafPending) return;
    instance.rafPending = true;

    const schedule = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout;
    schedule(() => {
      instance.rafPending = false;
      if (instance.closed) return;

      const viewport = getViewportRect();
      const anchorRect = getAnchorRect(instance.spec.anchor, viewport);

      // Use the host element for overlay size measurement
      const el = hostEl ?? instance.panelEl?.parentElement;
      const rect = el?.getBoundingClientRect();
      const overlaySize = rect
        ? { width: rect.width, height: rect.height }
        : { width: 0, height: 0 };

      const attachment = instance.spec.attachment;
      const boundaryRect =
        attachment.strategy === 'parent' ? getContainerRect(attachment.container) : undefined;

      const coords = computeOverlayCoordinates(
        anchorRect,
        overlaySize,
        instance.spec.position,
        viewport,
        boundaryRect,
      );

      instance.left = Math.round(coords.left);
      instance.top = Math.round(coords.top);
      instance.placement = coords.placement;
      instance.presented = true;
    });
  }

  function applySize(instance: OverlayInstance, hostEl: HTMLElement): void {
    const size = instance.spec.size;
    if (!size) return;

    const viewport = getViewportRect();
    const anchorRect = getAnchorRect(instance.spec.anchor, viewport);

    const resolveMin = (value: SizeSpec['minWidth'], anchorSize: number): string | null => {
      if (value === 'anchor') return `${anchorSize}px`;
      if (typeof value === 'number') return `${value}px`;
      if (typeof value === 'string' && value.trim()) return value;
      return null;
    };

    const resolveMax = (value: SizeSpec['maxWidth'], viewportSize: number): string | null => {
      if (value === 'viewport') return `${viewportSize}px`;
      if (typeof value === 'number') return `${value}px`;
      if (typeof value === 'string' && value.trim()) return value;
      return null;
    };

    const resolveFixed = (
      value: SizeSpec['width'],
      anchorSize: number,
      viewportSize: number,
    ): string | null => {
      if (value === 'anchor') return `${anchorSize}px`;
      if (value === 'viewport') return `${viewportSize}px`;
      if (typeof value === 'number') return `${value}px`;
      if (typeof value === 'string' && value.trim()) return value;
      return null;
    };

    const s = hostEl.style;
    s.width = resolveFixed(size.width, anchorRect.width, viewport.width) ?? '';
    s.height = resolveFixed(size.height, anchorRect.height, viewport.height) ?? '';
    s.minWidth = resolveMin(size.minWidth, anchorRect.width) ?? '';
    s.minHeight = resolveMin(size.minHeight, anchorRect.height) ?? '';
    s.maxWidth = resolveMax(size.maxWidth, viewport.width) ?? '';
    s.maxHeight = resolveMax(size.maxHeight, viewport.height) ?? '';
    s.overflow = size.overflow ?? '';
  }

  function installRepositionTriggers(instance: OverlayInstance, hostEl: HTMLElement): void {
    const strategy = instance.spec.scroll.strategy;

    // Always reposition on window resize and overlay content resize,
    // regardless of scroll strategy. This ensures modals/dialogs stay
    // centered when their content grows after initial render (e.g. async data).
    const onResize = () => repositionInstance(instance, hostEl);

    window.addEventListener('resize', onResize, { passive: true });
    instance.cleanups.push(() => window.removeEventListener('resize', onResize));

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => repositionInstance(instance, hostEl));
      ro.observe(hostEl);
      instance.resizeObserver = ro;
    }

    if (strategy === 'noop') return;

    const scrollParents =
      instance.anchorEl ? getScrollParents(instance.anchorEl) : [window];

    if (strategy === 'reposition') {
      const onScroll = () => repositionInstance(instance, hostEl);

      for (const parent of scrollParents) {
        parent.addEventListener('scroll', onScroll, { passive: true });
        instance.cleanups.push(() => parent.removeEventListener('scroll', onScroll));
      }
    } else if (strategy === 'close') {
      const onScroll = (e: Event) => {
        const target = e.target;
        if (target instanceof Node && hostEl.contains(target)) return;
        closeInstance(instance);
      };

      document.addEventListener('scroll', onScroll, { passive: true, capture: true });
      instance.cleanups.push(() =>
        document.removeEventListener('scroll', onScroll, { capture: true }),
      );

      for (const parent of scrollParents) {
        if (parent === window) continue;
        parent.addEventListener('scroll', onScroll, { passive: true });
        instance.cleanups.push(() => parent.removeEventListener('scroll', onScroll));
      }
    }
  }

  // Global listeners for outside click and escape
  function onDocumentPointerDown(event: PointerEvent): void {
    const openInstances = instances.value.filter((i) => !i.closed);
    if (openInstances.length === 0) return;

    const target = event.target;

    // Find topmost overlay containing the target
    for (let i = openInstances.length - 1; i >= 0; i--) {
      const inst = openInstances[i];
      if (containsTarget(inst, target)) {
        // Close children of this overlay
        for (const child of Array.from(inst.children)) {
          closeInstance(child);
        }
        return;
      }
    }

    // Find topmost dismissable overlay
    for (let i = openInstances.length - 1; i >= 0; i--) {
      const inst = openInstances[i];
      if (inst.spec.dismiss.outsideClick !== false) {
        // For overlay trees, close the entire root tree
        const root = getRoot(inst);
        if (root !== inst && root.spec.dismiss.outsideClick !== false) {
          closeInstance(root);
        } else {
          closeInstance(inst);
        }
        return;
      }
    }
  }

  function onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const openInstances = instances.value.filter((i) => !i.closed);
      for (let i = openInstances.length - 1; i >= 0; i--) {
        const inst = openInstances[i];
        if (inst.spec.dismiss.escapeKey !== false) {
          event.preventDefault();
          event.stopPropagation();
          closeInstance(inst);
          return;
        }
      }
    }

    if (event.key === 'Tab') {
      const openInstances = instances.value.filter((i) => !i.closed);
      for (let i = openInstances.length - 1; i >= 0; i--) {
        const inst = openInstances[i];
        if (inst.spec.focus.trap) {
          if (handleTabKey(inst, event)) {
            event.preventDefault();
          }
          return;
        }
      }
    }
  }

  function containsTarget(instance: OverlayInstance, target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;
    if (instance.panelEl?.contains(target)) return true;
    // Check host element (parent of panel)
    const hostEl = instance.panelEl?.parentElement;
    if (hostEl?.contains(target)) return true;
    // Check anchor
    if (instance.anchorEl?.contains(target)) return true;
    // Legacy companion-dropdown hook: a body-teleported element can opt into being
    // treated as part of `triggerEl`'s overlay by setting `data-coar-overlay-companion`
    // to the trigger's id. Previously used by `CoarSelect`/`CoarMultiSelect`/
    // `CoarTagSelect` before they were migrated to the overlay-service; kept in place
    // for any third-party / legacy caller still relying on the pattern.
    if (target instanceof Element) {
      const dropdown = target.closest('[data-coar-overlay-companion]');
      if (dropdown) {
        const companionId = dropdown.getAttribute('data-coar-overlay-companion');
        if (companionId) {
          const triggerEl = document.getElementById(companionId);
          if (triggerEl && (instance.panelEl?.contains(triggerEl) || hostEl?.contains(triggerEl))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function getRoot(instance: OverlayInstance): OverlayInstance {
    return instance.parent ? getRoot(instance.parent) : instance;
  }

  function handleTabKey(instance: OverlayInstance, event: KeyboardEvent): boolean {
    const hostEl = instance.panelEl?.parentElement;
    if (!hostEl) return false;

    const focusables = getFocusableElements(hostEl);
    if (focusables.length === 0) return true;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const isInside = active instanceof Node && hostEl.contains(active);

    if (!isInside) {
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return true;
    }

    if (event.shiftKey && active === first) {
      last.focus({ preventScroll: true });
      return true;
    }
    if (!event.shiftKey && active === last) {
      first.focus({ preventScroll: true });
      return true;
    }

    return false;
  }

  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]',
      ),
    ).filter((el) => {
      if (el.hasAttribute('hidden')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
      return true;
    });
  }

  function installGlobalListeners(): void {
    if (globalListenersInstalled) return;
    if (typeof document === 'undefined') return;
    document.addEventListener('pointerdown', onDocumentPointerDown, { capture: true });
    document.addEventListener('keydown', onDocumentKeyDown, { capture: true });
    globalListenersInstalled = true;
  }

  function uninstallGlobalListenersIfIdle(): void {
    if (!globalListenersInstalled) return;
    if (instances.value.length > 0) return;
    document.removeEventListener('pointerdown', onDocumentPointerDown, { capture: true });
    document.removeEventListener('keydown', onDocumentKeyDown, { capture: true });
    globalListenersInstalled = false;
  }

  /**
   * Resolve the internal instance behind either shape we accept for `parent`:
   * an `OverlayRef` (which carries `__instanceId` attached in `createOverlayRef`) or
   * an `OverlayInstance` directly (whose `id` is the authoritative key). `useOverlayParent()`
   * returns an instance, so descendants that forward it must resolve via this path.
   */
  function findInstanceByRefOrInstance(
    ref: OverlayRef | OverlayInstance,
  ): OverlayInstance | undefined {
    const maybeRefId = (ref as Partial<OverlayRefWithId>).__instanceId;
    const maybeInstanceId = (ref as Partial<OverlayInstance>).id;
    const id = maybeRefId ?? maybeInstanceId;
    if (typeof id !== 'number') return undefined;
    return instances.value.find((i) => i.id === id);
  }

  return {
    /** Reactive list of open overlay instances. Used by CoarOverlayHost to render. */
    instances,
    /** Open a new overlay */
    open,
    /** Close all overlays */
    closeAll,
    /** Called by CoarOverlayHost when the panel DOM element is ready */
    onPanelMounted,
  };
}

export type OverlayService = ReturnType<typeof createOverlayService>;
