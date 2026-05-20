/**
 * Toolbar tool identifiers — pass an array of these to `CoarDocumentViewer`'s
 * `tools` prop. The array drives BOTH the visible set AND the order they
 * appear in, so consumers can rearrange the layout however they want:
 *
 * ```ts
 * tools: ['prev-page', 'page-input', 'next-page', 'separator', 'zoom-out', 'zoom-reset', 'zoom-in']
 * ```
 *
 * When omitted, `COAR_DOCUMENT_VIEWER_ALL_TOOLS` is used as the default.
 *
 * Use `'separator'` to place a visual divider between groups. Leading +
 * trailing separators are auto-trimmed and consecutive separators collapse
 * to one — so it's safe to leave a separator after a tool that the section
 * toggles end up filtering out.
 *
 * Mirrors the markdown-editor's `tools` API so consumers using both packages
 * have the same mental model for toolbar configuration.
 */
export type CoarDocumentViewerTool =
  | 'sidebar-toggle'
  | 'prev-page'
  | 'next-page'
  | 'page-input'
  | 'zoom-out'
  | 'zoom-reset'
  | 'zoom-in'
  | 'fit-width'
  | 'fit-page'
  | 'pan'
  | 'reset-view'
  | 'rotate-ccw'
  | 'rotate-cw'
  | 'select'
  | 'eraser'
  | 'marker'
  | 'note'
  | 'ink'
  | 'freetext'
  | 'search'
  | 'annotations-panel'
  | 'print'
  | 'download'
  /**
   * Visual divider between toolbar groups. Renders as a `CoarSidebarDivider`.
   * Place anywhere in `tools` to introduce a separator at that point.
   */
  | 'separator';

/**
 * Default toolbar layout. Drives both which tools render AND the order.
 * Separators sit at the original group boundaries (panels / nav / zoom /
 * view / rotation / pointer-modes / drawing / doc-actions).
 *
 * Re-use freely:
 *   - filter to a subset: `COAR_DOCUMENT_VIEWER_ALL_TOOLS.filter(t => t !== 'print')`
 *   - custom layout: `['prev-page', 'page-input', 'next-page', 'separator', 'zoom-out', 'zoom-reset', 'zoom-in']`
 */
export const COAR_DOCUMENT_VIEWER_ALL_TOOLS: readonly CoarDocumentViewerTool[] = [
  // Panels (both side-panel toggles together).
  'sidebar-toggle',
  'annotations-panel',
  'separator',
  // Page navigation (prev — input — next).
  'prev-page',
  'page-input',
  'next-page',
  'separator',
  // Zoom.
  'zoom-out',
  'zoom-reset',
  'zoom-in',
  'separator',
  // View / fit (zoom-presets that are one-shot actions).
  'fit-width',
  'fit-page',
  'reset-view',
  'separator',
  // Rotation.
  'rotate-ccw',
  'rotate-cw',
  'separator',
  // Pointer modes (existing-annotation interactions).
  'pan',
  'select',
  'eraser',
  'separator',
  // Drawing tools (create new annotations).
  'marker',
  'note',
  'ink',
  'freetext',
  'separator',
  // Document-level actions.
  'search',
  'print',
  'download',
];

/**
 * Coordinates are page-relative and normalized to [0..1] — multiply by current page
 * viewport on render so the same annotation renders correctly at any zoom or rotation.
 */
export interface CoarPdfPoint {
  x: number;
  y: number;
}

export interface CoarPdfRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CoarPdfAnnotationType = 'marker' | 'comment' | 'ink' | 'freetext';

/**
 * Pointer-interaction mode for the annotation overlay.
 *
 * - `'view'`     — read-only; existing annotations are clickable to open the
 *                  edit popover, but no new annotations are created.
 * - `'select'`   — existing annotations are clickable AND draggable (move).
 * - `'eraser'`   — clicking a stroke on a marker/ink annotation removes that
 *                  stroke; the annotation is deleted when the last stroke goes.
 * - The four annotation types (`'marker' | 'comment' | 'ink' | 'freetext'`)
 *   are creation modes — pointer interactions on a page wrapper produce new
 *   annotations of the matching kind.
 */
export type CoarPdfAnnotationMode = 'view' | 'select' | 'eraser' | CoarPdfAnnotationType;

interface BaseAnnotation {
  id: string;
  type: CoarPdfAnnotationType;
  /** 0-based page index. */
  pageIndex: number;
  /** CSS color. */
  color: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Consumer-provided display string (e.g. user name). */
  createdBy?: string;
  /** Optional text body — every type can carry a comment. */
  comment?: string;
}

export interface CoarPdfCommentAnnotation extends BaseAnnotation {
  type: 'comment';
  /** Pin position in normalized page coords. */
  anchor: CoarPdfPoint;
  /** Required for comment annotations. */
  comment: string;
}

export interface CoarPdfInkAnnotation extends BaseAnnotation {
  type: 'ink';
  /** SVG-style polyline list — each path is a sequence of normalized points. */
  strokes: CoarPdfPoint[][];
  /** Stroke width in CSS pixels at zoom=1. */
  width: number;
}

/**
 * Freeform highlighter — drawn like a felt-tip marker, semi-transparent over
 * the underlying content. Same wire shape as an ink annotation, but renders
 * with `mix-blend-mode: multiply` and a thicker default width so existing
 * text reads through it.
 */
export interface CoarPdfMarkerAnnotation extends BaseAnnotation {
  type: 'marker';
  strokes: CoarPdfPoint[][];
  /** Stroke width in CSS pixels at zoom=1. Defaults to one of the preset thicknesses. */
  width: number;
}

export interface CoarPdfFreetextAnnotation extends BaseAnnotation {
  type: 'freetext';
  rect: CoarPdfRect;
  text: string;
  /** Font size in CSS pixels at zoom=1. */
  fontSize: number;
}

export type CoarPdfAnnotation =
  | CoarPdfMarkerAnnotation
  | CoarPdfCommentAnnotation
  | CoarPdfInkAnnotation
  | CoarPdfFreetextAnnotation;

/**
 * Distributive Omit — preserves the discriminated-union structure when stripping
 * shared keys. Plain `Omit<A | B, K>` collapses the union into a single
 * intersection, which breaks narrowing by `type` at the call site.
 */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/**
 * Payload emitted by `@annotation:create`. Consumer assigns `id`, `createdAt`, and
 * optionally `createdBy`, then pushes the result into the `annotations` prop.
 */
export type CoarPdfAnnotationCreatePayload = DistributiveOmit<
  CoarPdfAnnotation,
  'id' | 'createdAt' | 'createdBy'
>;

/**
 * Payload emitted by `@annotation:update`. Consumer merges `patch` into the
 * existing annotation identified by `id`.
 */
export interface CoarPdfAnnotationUpdatePayload {
  id: string;
  patch: Partial<CoarPdfAnnotation>;
}
