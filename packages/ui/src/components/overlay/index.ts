// Types
export type {
  Placement,
  OverlaySpec,
  OverlayRef,
  ResolvedOverlaySpec,
  AnchorSpec,
  PositionSpec,
  SizeSpec,
  BackdropSpec,
  ScrollSpec,
  DismissSpec,
  FocusSpec,
  A11ySpec,
  AttachmentSpec,
} from './overlay-types';
export { OVERLAY_DEFAULTS, resolveOverlaySpec } from './overlay-types';

// Positioning
export {
  computeOverlayCoordinates,
  getViewportRect,
  getAnchorRect,
  getContainerRect,
  getScrollParents,
} from './overlay-position';
export type { ViewportRect, Rect, OverlaySize, OverlayCoordinates } from './overlay-position';

// Service
export { createOverlayService } from './overlay-service';
export type { OverlayService, OverlayInstance, OverlayContent, OverlayOpenOptions } from './overlay-service';

// Plugin & composable
export { CoarOverlayPlugin, OVERLAY_SERVICE_KEY, useOverlay } from './useOverlay';

// Components
export { default as CoarOverlayHost } from './CoarOverlayHost.vue';
export { default as CoarOverlayOutlet } from './CoarOverlayOutlet.vue';

// Presets
export { tooltipPreset, modalPreset, menuPreset, selectPreset, hoverMenuPreset } from './overlay-presets';
