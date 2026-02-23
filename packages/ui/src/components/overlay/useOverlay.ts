import { type InjectionKey, inject, type Plugin } from 'vue';
import { createOverlayService, type OverlayService } from './overlay-service';

/**
 * Injection key for the overlay service singleton.
 */
export const OVERLAY_SERVICE_KEY: InjectionKey<OverlayService> = Symbol('CoarOverlayService');

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
