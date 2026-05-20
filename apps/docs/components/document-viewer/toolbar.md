# Toolbar customization

The toolbar is **order-driven**: the `tools` prop is an array of tool identifiers in the order you want them to render. Want zoom buttons on the left and page navigation on the right? Just reorder the array. Want a custom layout with only the four buttons you actually need? Pass that subset.

When `tools` is omitted, the viewer falls back to `COAR_DOCUMENT_VIEWER_ALL_TOOLS` — the canonical 8-group layout with separators at the original group boundaries.

## Minimal toolbar

The canonical "nav + zoom" layout — page navigation, separator, zoom controls:

<preview path="./demos/MinimalToolbarDemo.vue" />

```ts
import type { CoarDocumentViewerTool } from '@cocoar/vue-document-viewer';

const MINIMAL_TOOLS: CoarDocumentViewerTool[] = [
  'prev-page',
  'page-input',
  'next-page',
  'separator',
  'zoom-out',
  'zoom-reset',
  'zoom-in',
];
```

```vue
<CoarDocumentViewer :source="source" :tools="MINIMAL_TOOLS" />
```

## The `'separator'` pseudo-tool

`'separator'` doesn't render an action — it renders a `CoarSidebarDivider` between groups. Place it anywhere in the array to visually break up clusters.

Three convenience behaviors save you from edge-case handling:

| Input | Output |
|---|---|
| Leading `'separator'` | Trimmed |
| Trailing `'separator'` | Trimmed |
| Consecutive `'separator'`s | Collapsed to one |

This matters because **section toggles** (e.g. `showSearch: false`) filter tools _before_ the trim/collapse. So a `tools` array like `['prev-page', 'separator', 'search', 'separator', 'next-page']` with `showSearch: false` doesn't leave you two adjacent orphan separators — the collapse step turns it into `['prev-page', 'separator', 'next-page']` automatically.

## All available tools

The full `CoarDocumentViewerTool` union:

| Identifier | What it does | Default group |
|---|---|---|
| `sidebar-toggle` | Toggle the left rail (thumbnails / outline) | Panels |
| `annotations-panel` | Toggle the right rail | Panels |
| `prev-page` | Previous page | Navigation |
| `page-input` | "Page N of M" number input | Navigation |
| `next-page` | Next page | Navigation |
| `zoom-out` | Zoom out one step | Zoom |
| `zoom-reset` | Editable zoom-percent readout (click to reset to 100%) | Zoom |
| `zoom-in` | Zoom in one step | Zoom |
| `fit-width` | Fit page width to viewport | View |
| `fit-page` | Fit whole page to viewport | View |
| `reset-view` | Reset zoom + rotation | View |
| `rotate-ccw` | Rotate -90° | Rotation |
| `rotate-cw` | Rotate +90° | Rotation |
| `pan` | Hand tool — drag the page | Pointer |
| `select` | Select / move existing annotations | Pointer |
| `eraser` | Erase strokes from marker / ink annotations | Pointer |
| `marker` | Draw highlighter strokes | Drawing |
| `note` | Place comment pin | Drawing |
| `ink` | Free-hand ink strokes | Drawing |
| `freetext` | Place free-text box | Drawing |
| `search` | Open search bar | Actions |
| `print` | Print document | Actions |
| `download` | Download source file | Actions |
| `separator` | Visual divider between groups | _pseudo-tool_ |

## Default layout

`COAR_DOCUMENT_VIEWER_ALL_TOOLS` — the canonical 8-group layout, importable so you can derive variants by filtering:

```ts
import { COAR_DOCUMENT_VIEWER_ALL_TOOLS } from '@cocoar/vue-document-viewer';

// Hide just the print + download buttons
const tools = COAR_DOCUMENT_VIEWER_ALL_TOOLS.filter(
  (t) => t !== 'print' && t !== 'download',
);
```

## Filtering layers

Three independent layers decide which buttons render and how:

```
                user's `tools` array (or COAR_DOCUMENT_VIEWER_ALL_TOOLS)
                                │
                                ▼
   ┌─────────────────────────────────────────────────────┐
   │  1. Section toggles strip whole categories          │
   │     showSearch:false       → drop 'search'          │
   │     showPrintDownload:false → drop 'print','download' │
   │     showAnnotationModes:false → drop drawing tools  │
   │     (no Thumbnails/Outline?) → drop 'sidebar-toggle'│
   │     (no AnnotationsPanel?)   → drop 'annotations-panel' │
   └─────────────────────────────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────┐
   │  2. Separator normalization                         │
   │     trim leading / trailing → collapse consecutive  │
   └─────────────────────────────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────┐
   │  3. Capability gating (per-tool, runtime)            │
   │     source.capabilities.search:false → 'search' disabled │
   │     source.capabilities.multiPage:false → page-nav disabled │
   │     source.capabilities.outline:false → outline tab hidden │
   │     (disabled tools STAY VISIBLE with a tooltip suffix) │
   └─────────────────────────────────────────────────────┘
                                │
                                ▼
                  Final rendered toolbar
```

Layers 1 and 2 happen in pure-function form (`computeEffectiveTools` in `internal/effective-tools.ts`) and remove items from the array. Layer 3 happens per-button at render time — it never removes anything, just toggles the `disabled` state and appends `notAvailableForSource` to the tooltip.

This is the **stable-position rule**: switching sources never makes buttons jump around, because layer 3 doesn't touch positions.

## Section toggles vs `tools` array

If you want to drop a whole category, either path works:

```ts
// A) Shorthand — section toggle
<CoarDocumentViewer :source="src" :show-print-download="false" />

// B) Explicit — omit from tools array
<CoarDocumentViewer
  :source="src"
  :tools="COAR_DOCUMENT_VIEWER_ALL_TOOLS.filter(t => t !== 'print' && t !== 'download')"
/>
```

Use the section toggle when you want to drop a category cleanly. Use `tools` when you need precise positional control — e.g. moving search to the start, or placing the page-input between zoom and rotation.

## Toolbar position

`toolbarPosition` controls where the toolbar sits relative to the page area:

```vue
<CoarDocumentViewer :source="src" toolbar-position="left" />
```

| Value | Layout |
|---|---|
| `'top'` (default) | Horizontal bar above the page area |
| `'bottom'` | Horizontal bar below the page area |
| `'left'` | Vertical rail to the left of the page area |
| `'right'` | Vertical rail to the right of the page area |

Vertical rails ('left' / 'right') still use the same `tools` array — buttons just stack vertically and the `'separator'` pseudo-tool renders as a horizontal divider instead of a vertical one.
