import { type InjectionKey, inject, type Plugin } from 'vue';
import { createOverlayService, type OverlayService, type OverlayInstance } from './overlay-service';
import { createToastService, registerToastService, TOAST_SERVICE_KEY } from '../toast/toast-service';

/**
 * Injection key for the overlay service singleton.
 */
export const OVERLAY_SERVICE_KEY: InjectionKey<OverlayService> = Symbol('CoarOverlayService');

/**
 * Injection key for the **nearest ancestor overlay**. Every `CoarOverlayOutlet` provides
 * its own `OverlayInstance` under this key, so any descendant component that opens its
 * own overlay (popover, tooltip, sub-menu, etc.) can read the nearest parent and pass it
 * to `overlay.open({ parent })`. The service then:
 *
 *  - stacks the child above the parent (each new `instance.id` is larger, so
 *    `calc(var(--coar-z-overlay) + id*2)` gives higher z-index automatically)
 *  - treats clicks inside the child as clicks inside the parent (parent does not close
 *    when the user interacts with a popover that was opened from inside it)
 *  - propagates close-on-parent-close so orphaned children don't linger
 *
 * Components outside any overlay get `undefined` on inject and open as root overlays.
 * Mirrors Angular's `@Optional() @SkipSelf() parentOverlay?: OverlayInstance` pattern.
 */
export const OVERLAY_PARENT_KEY: InjectionKey<OverlayInstance> = Symbol('CoarOverlayParent');

/**
 * Convenience composable — reads the nearest ancestor overlay instance, or `undefined`
 * if the component is outside any overlay (top-level of the app).
 *
 * ```ts
 * const parent = useOverlayParent();
 * overlay.open({ spec, content, parent });
 * ```
 */
export function useOverlayParent(): OverlayInstance | undefined {
  return inject(OVERLAY_PARENT_KEY, undefined);
}

/**
 * Module-level service capture so useDialog/useToast work outside setup().
 */
let _moduleOverlayService: OverlayService | null = null;

/**
 * Get the overlay service without injection (for use outside setup()).
 * Throws if CoarOverlayPlugin has not been installed.
 */
export function getOverlayService(): OverlayService {
  if (!_moduleOverlayService) {
    throw new Error(
      'getOverlayService() requires CoarOverlayPlugin to be installed. Call app.use(CoarOverlayPlugin) in your app setup.',
    );
  }
  return _moduleOverlayService;
}

/** Reset module-level service reference (for test teardown). */
export function _resetOverlayServiceForTests(): void {
  _moduleOverlayService = null;
}

/**
 * Vue plugin that provides a global overlay service.
 *
 * Usage:
 * ```ts
 * import { CoarOverlayPlugin } from '@cocoar/vue-ui';
 * app.use(CoarOverlayPlugin);
 * ```
 */
export const CoarOverlayPlugin: Plugin = {
  install(app) {
    const service = createOverlayService();
    app.provide(OVERLAY_SERVICE_KEY, service);
    _moduleOverlayService = service;

    // Create and register toast service
    const toastService = createToastService();
    registerToastService(toastService);
    app.provide(TOAST_SERVICE_KEY, toastService);
  },
};

/**
 * Composable to access the overlay service.
 * Must be used within a component that has the CoarOverlayPlugin installed.
 *
 * Usage:
 * ```ts
 * const overlay = useOverlay();
 * const ref = overlay.open({ spec: menuPreset, content: { kind: 'component', component: MyMenu } });
 * ```
 */
export function useOverlay(): OverlayService {
  const service = inject(OVERLAY_SERVICE_KEY);
  if (!service) {
    throw new Error(
      'useOverlay() requires CoarOverlayPlugin to be installed. Call app.use(CoarOverlayPlugin) in your app setup.',
    );
  }
  return service;
}
