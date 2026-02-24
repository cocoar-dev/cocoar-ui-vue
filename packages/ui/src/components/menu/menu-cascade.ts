import { type InjectionKey, inject, provide } from 'vue';
import { shouldDelaySubmenuSwitch, type MenuAimPoint } from './menu-aim';

export interface MenuAimConfig {
  enabled: boolean;
  switchDelayMs: number;
  sampleMaxAgeMs: number;
}

const DEFAULT_AIM_CONFIG: MenuAimConfig = {
  enabled: true,
  switchDelayMs: 500,
  sampleMaxAgeMs: 200,
};

/**
 * Tracks parent-child and sibling relationships for menu hierarchies.
 * Manages the menu-aim algorithm for smart submenu switching.
 */
export class MenuCascade {
  overlayRef: { panelEl: HTMLElement | null; close: () => void } | null = null;
  /** Callback set by CoarSubmenuItem to cancel its close timer from children */
  onChildPanelEnter: (() => void) | null = null;
  private children = new Set<MenuCascade>();

  private activeChild: MenuCascade | null = null;
  private pointerHistory: MenuAimPoint[] = [];
  private pointerAbort: AbortController | null = null;

  private pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChild: MenuCascade | null = null;
  private pendingActivate: (() => void) | null = null;

  constructor(
    readonly parent: MenuCascade | null,
    private aimConfig: MenuAimConfig = DEFAULT_AIM_CONFIG,
  ) {
    if (parent) {
      parent.children.add(this);
    }
  }

  requestOpenFromChild(
    child: MenuCascade,
    activate: () => void,
    pointer: { x: number; y: number },
  ): void {
    if (!this.aimConfig.enabled) {
      this.activateNow(child, activate);
      return;
    }

    const now = Date.now();
    const point: MenuAimPoint = { x: pointer.x, y: pointer.y, t: now };
    this.pushPointerPoint(point);

    if (!this.activeChild || this.activeChild === child) {
      this.activateNow(child, activate);
      return;
    }

    const submenuRect = this.getActiveChildSubmenuRect();
    if (!submenuRect) {
      this.activateNow(child, activate);
      return;
    }

    const previous =
      this.pointerHistory.length >= 2 ? this.pointerHistory[this.pointerHistory.length - 2] : null;
    const direction = this.inferSubmenuDirection(submenuRect, point);

    const shouldDelay = shouldDelaySubmenuSwitch(
      previous,
      point,
      submenuRect,
      direction,
      this.aimConfig.sampleMaxAgeMs,
    );

    if (!shouldDelay) {
      this.activateNow(child, activate);
      return;
    }

    this.scheduleSwitch(child, activate, this.aimConfig.switchDelayMs);
  }

  notifyChildOpened(_child: MenuCascade): void {
    // placeholder for panel enter listener if needed
  }

  notifyChildClosed(child: MenuCascade): void {
    if (this.activeChild === child) {
      this.activeChild = null;
      this.cancelPendingSwitch();
      this.stopPointerTracking();
    }
  }

  closeSiblings(): void {
    if (this.parent) {
      for (const sibling of this.parent.children) {
        if (sibling !== this && sibling.overlayRef) {
          sibling.overlayRef.close();
          sibling.overlayRef = null;
        }
      }
    }
  }

  /** Cancel close timers and pending aim-switches up the ancestor chain (called when a child panel is hovered) */
  cancelAncestorCloseTimers(): void {
    this.onChildPanelEnter?.();
    // User reached the active flyout — cancel any pending switch to a different submenu
    this.cancelPendingSwitch();
    this.parent?.cancelAncestorCloseTimers();
  }

  destroy(): void {
    this.cancelPendingSwitch();
    this.stopPointerTracking();
    if (this.parent) {
      this.parent.children.delete(this);
    }
  }

  private activateNow(child: MenuCascade, activate: () => void): void {
    this.cancelPendingSwitch();
    this.activeChild = child;
    this.ensurePointerTracking();
    activate();
  }

  private scheduleSwitch(child: MenuCascade, activate: () => void, delayMs: number): void {
    this.cancelPendingSwitch();
    this.pendingChild = child;
    this.pendingActivate = activate;
    this.pendingSwitchTimer = setTimeout(() => {
      const pc = this.pendingChild;
      const pa = this.pendingActivate;
      this.pendingChild = null;
      this.pendingActivate = null;
      this.pendingSwitchTimer = null;
      if (!pc || !pa) return;
      this.activeChild = pc;
      this.ensurePointerTracking();
      pa();
    }, delayMs);
  }

  private cancelPendingSwitch(): void {
    if (this.pendingSwitchTimer) {
      clearTimeout(this.pendingSwitchTimer);
      this.pendingSwitchTimer = null;
    }
    this.pendingChild = null;
    this.pendingActivate = null;
  }

  private ensurePointerTracking(): void {
    if (this.pointerAbort || typeof document === 'undefined') return;
    const abort = new AbortController();
    this.pointerAbort = abort;
    document.addEventListener(
      'pointermove',
      (e: PointerEvent) => {
        this.pushPointerPoint({ x: e.clientX, y: e.clientY, t: Date.now() });
      },
      { signal: abort.signal, passive: true },
    );
  }

  private stopPointerTracking(): void {
    if (!this.pointerAbort) return;
    this.pointerAbort.abort();
    this.pointerAbort = null;
    this.pointerHistory = [];
  }

  private pushPointerPoint(point: MenuAimPoint): void {
    this.pointerHistory.push(point);
    if (this.pointerHistory.length > 5) {
      this.pointerHistory = this.pointerHistory.slice(-5);
    }
  }

  private getActiveChildSubmenuRect(): DOMRect | null {
    const panelEl = this.activeChild?.overlayRef?.panelEl;
    if (!panelEl) return null;
    return panelEl.getBoundingClientRect();
  }

  private inferSubmenuDirection(
    rect: DOMRect,
    point: { x: number; y: number },
  ): 'right' | 'left' {
    return rect.left >= point.x ? 'right' : 'left';
  }
}

// Provide/inject keys
export const MENU_CASCADE_KEY: InjectionKey<MenuCascade> = Symbol('coar-menu-cascade');

/** Close callback injected by root menu overlay (e.g. popover trigger) */
export const MENU_CLOSE_KEY: InjectionKey<() => void> = Symbol('coar-menu-close');

export function provideMenuCascade(cascade: MenuCascade): void {
  provide(MENU_CASCADE_KEY, cascade);
}

export function useMenuCascade(): MenuCascade | undefined {
  return inject(MENU_CASCADE_KEY, undefined);
}

export function provideMenuClose(closeFn: () => void): void {
  provide(MENU_CLOSE_KEY, closeFn);
}

export function useMenuClose(): (() => void) | undefined {
  return inject(MENU_CLOSE_KEY, undefined);
}
