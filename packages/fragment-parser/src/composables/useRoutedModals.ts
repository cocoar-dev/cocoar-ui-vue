import { watch, onUnmounted, markRaw, shallowRef } from 'vue';
import type { Component } from 'vue';
import { useDialog, getOverlayService, modalPreset } from '@cocoar/vue-ui';
import type { DialogConfig, OverlayRef, OverlaySpec } from '@cocoar/vue-ui';
import { useRoutedFragments } from './useRoutedFragments';
import { useFragmentNavigation } from './useFragmentNavigation';
import type { RoutedFragmentBase } from '../lib/routed-fragment';

/** Fragment that opens a component inside a CoarDialog shell (header, title, close button). */
export interface DialogFragment extends RoutedFragmentBase {
  type: 'dialog';
  component: () => Promise<{ default: Component }>;
  /** Dialog shell options (title, size, close behavior) */
  dialogOptions?: DialogConfig;
}

/** Fragment that opens a component as a raw overlay (no shell, full control). */
export interface ModalFragment extends RoutedFragmentBase {
  type: 'modal';
  component: () => Promise<{ default: Component }>;
  /** Overlay spec overrides (backdrop, positioning, sizing, etc.) */
  overlayOptions?: Partial<OverlaySpec>;
}

/** Union type for all supported routed fragment types. */
export type RoutedOverlayFragment = DialogFragment | ModalFragment;

interface OpenEntry {
  close: () => void;
  result: Promise<unknown>;
}

/**
 * Composable that automatically opens and closes dialogs/modals based on URL fragments.
 *
 * Supports two fragment types:
 * - `type: 'dialog'` — Opens inside CoarDialog shell (header, title, close button)
 * - `type: 'modal'` — Opens as raw overlay (no shell, component is the entire content)
 *
 * @example
 * ```ts
 * // In your view component:
 * useRoutedModals();
 *
 * // Modals open/close automatically based on URL fragments.
 * // Define fragments in route.meta.routedFragments.
 * ```
 */
export function useRoutedModals() {
  const { fragments } = useRoutedFragments<RoutedOverlayFragment>();
  const { closeModal } = useFragmentNavigation();
  const { open } = useDialog();

  const openEntries = shallowRef(new Map<string, OpenEntry>());

  watch(
    fragments,
    async (currentFragments) => {
      const currentPaths = new Set(currentFragments.map((f) => f.fragment.split('?')[0]));
      const prevEntries = new Map(openEntries.value);

      // Close entries whose fragments no longer exist in URL
      for (const [path, entry] of prevEntries) {
        if (!currentPaths.has(path)) {
          entry.close();
          prevEntries.delete(path);
        }
      }

      // Open entries for new fragments
      for (const fragment of currentFragments) {
        const path = fragment.fragment.split('?')[0];
        if (prevEntries.has(path)) continue;

        const route = fragment.route;
        const module = await route.component();
        const component = module.default as Component;

        let entry: OpenEntry;

        if (route.type === 'dialog') {
          const dialogRef = open(
            component,
            route.dialogOptions ?? {},
            { ...fragment.params },
          );
          entry = { close: () => dialogRef.close(), result: dialogRef.result };
        } else {
          const overlayRef: OverlayRef = getOverlayService().open({
            spec: { ...modalPreset, ...route.overlayOptions },
            content: { kind: 'component', component: markRaw(component) },
            inputs: {
              ...fragment.params,
              close: (result?: unknown) => overlayRef.close(result),
            },
          });
          entry = { close: () => overlayRef.close(), result: overlayRef.afterClosed };
        }

        prevEntries.set(path, entry);

        // When closed, remove fragment from URL
        entry.result.then(() => {
          openEntries.value.delete(path);
          closeModal(path);
        });
      }

      openEntries.value = prevEntries;
    },
    { immediate: true },
  );

  onUnmounted(() => {
    for (const entry of openEntries.value.values()) {
      entry.close();
    }
    openEntries.value.clear();
  });
}
