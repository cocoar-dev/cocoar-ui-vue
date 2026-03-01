import { type InjectionKey, inject, type Plugin } from 'vue';
import { createOverlayService, type OverlayService } from './overlay-service';
import { createToastService, registerToastService, TOAST_SERVICE_KEY } from '../toast/toast-service';

/**
 * Injection key for the overlay service singleton.
 */
export const OVERLAY_SERVICE_KEY: InjectionKey<OverlayService> = Symbol('CoarOverlayService');

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
