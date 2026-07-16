/**
 * Shared helpers for canvas preview components.
 */
import type { CSSProperties } from 'vue';
import type { NodeStyle } from '../schema';

/**
 * Inline-natured leaf previews (button / link / image) are content-width by
 * default. When the node is sized (fill / fixed / explicit width) the rendered
 * element fills its box, so the preview should too — `width: 100%` fills the
 * chrome wrapper's content area (no overflow from the wrapper's own padding).
 * Block leaves (text, headings, form fields) already fill their wrapper.
 */
export function leafSizeStyle(style?: NodeStyle): CSSProperties {
  const sized = !!style && (style.size === 'fill' || style.size === 'fixed' || (!style.size && !!style.width));
  return sized ? { width: '100%' } : {};
}
