export { parseFragment, type ParsedRoute } from './lib/fragment-parser';
export { type RoutedFragmentBase } from './lib/routed-fragment';

// Composables (require vue-router and @cocoar/vue-ui as peer dependencies)
export { useFragmentNavigation, useRoutedFragments, useRoutedModals } from './composables';
export type { DialogFragment, ModalFragment, RoutedOverlayFragment } from './composables';
