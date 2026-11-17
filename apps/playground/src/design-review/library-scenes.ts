/**
 * Library scenes of the design-review gallery (`/design-review?kind=<id>`): the complex
 * packages beside the core kinds of CorePresentationSamples. Every scene is
 * profile-neutral; the gallery decides legacy/compact, light/dark and mobile, with the
 * same synthetic data in every column.
 *
 * `isolation: 'frame'` marks scenes whose renderer keeps document-global theme state:
 * Monaco (one theme per page; the compact Monaco theme follows `.coar-compact` on
 * `<html>` only) and Mermaid (one config per page, not re-read on a mode change of the
 * same profile). The gallery shows those in one iframe per profile, each a page of the
 * gallery itself with `frame=1&kind=…&profile=…&mode=…&mobile=…`, which puts the profile,
 * mode and mobile classes on that iframe's `<html>`. `?isolate=true` frames every scene.
 */
import { defineAsyncComponent, type Component } from 'vue';

export interface LibraryScene {
  id: string;
  label: string;
  packages: string[];
  isolation: 'inline' | 'frame';
  /** Height of each iframe when isolated. */
  frameHeight: number;
  /** Selector inside a profile column that proves the real renderer is up. */
  ready: string;
  component: Component;
}

function scene(
  id: string,
  label: string,
  packages: string[],
  ready: string,
  load: () => Promise<{ default: Component }>,
  options: { isolation?: 'inline' | 'frame'; frameHeight?: number } = {},
): LibraryScene {
  return {
    id,
    label,
    packages,
    ready,
    isolation: options.isolation ?? 'inline',
    frameHeight: options.frameHeight ?? 760,
    component: defineAsyncComponent(load),
  };
}

export const libraryScenes: LibraryScene[] = [
  scene('data-grid', 'Data grid', ['data-grid'], '.ag-row',
    () => import('./scenes/compact-data-grid.vue')),
  scene('data-grid-tree', 'Data grid · tree + search', ['data-grid'], '.ag-row',
    () => import('./scenes/compact-data-grid-tree.vue')),
  scene('document-viewer', 'Document viewer · gallery', ['document-viewer'], '.coar-pdf-anno-panel__item',
    () => import('./scenes/compact-document-viewer.vue')),
  scene('document-viewer-open', 'Document viewer · annotation popover', ['document-viewer'], '.coar-pdf-anno-panel__item',
    () => import('./scenes/compact-document-viewer-open.vue')),
  scene('document-viewer-pdf', 'Document viewer · PDF', ['document-viewer'], 'canvas',
    () => import('./scenes/compact-document-viewer-pdf.vue')),
  scene('map', 'Map + point list', ['map'], '.leaflet-marker-icon',
    () => import('./scenes/compact-map.vue')),
  scene('map-editor', 'Map editor', ['map'], '.leaflet-marker-icon',
    () => import('./scenes/compact-map-editor.vue')),
  scene('markdown-viewer', 'Markdown viewer', ['markdown', 'markdown-core'], '.coar-markdown',
    () => import('./scenes/compact-markdown-viewer.vue')),
  scene('markdown-editor', 'Markdown editor', ['markdown-editor'], '.ProseMirror',
    () => import('./scenes/compact-markdown-editor.vue')),
  scene('markdown-editor-panels', 'Markdown editor · panels', ['markdown-editor'], '[data-scene-part=table-picker] *',
    () => import('./scenes/compact-markdown-editor-panels.vue')),
  scene('markdown-form', 'Markdown form', ['markdown-form'], '[data-scene-part=fill] input',
    () => import('./scenes/compact-markdown-form.vue')),
  scene('mermaid', 'Mermaid', ['mermaid'], '.coar-mermaid[data-status=rendered] svg',
    () => import('./scenes/compact-markdown-mermaid.vue'), { isolation: 'frame', frameHeight: 620 }),
  scene('markdown-phone', 'Markdown on a phone', ['markdown-editor', 'markdown', 'markdown-form', 'mermaid'], '.ProseMirror',
    () => import('./scenes/compact-markdown-phone.vue'), { isolation: 'frame', frameHeight: 820 }),
  scene('page-builder', 'Page builder', ['page-builder'], '.pb-tree-row',
    () => import('./scenes/compact-page-builder.vue')),
  scene('script-editor', 'Script editor (Monaco)', ['script-editor'], '.monaco-editor .view-lines',
    () => import('./scenes/compact-script-editor.vue'), { isolation: 'frame', frameHeight: 560 }),
  scene('composition', 'Cross-package workspace', ['ui', 'data-grid', 'map', 'markdown', 'markdown-form', 'mermaid'], '.ag-row',
    () => import('./scenes/compact-composition.vue'), { isolation: 'frame', frameHeight: 1180 }),
  scene('markdown-mermaid-integration', 'Markdown · mermaid fences (registry)', ['markdown', 'markdown-mermaid', 'mermaid'],
    '.coar-markdown-fence .coar-mermaid[data-status=rendered] svg',
    () => import('./scenes/compact-markdown-mermaid-integration.vue'), { isolation: 'frame', frameHeight: 900 }),
  scene('markdown-advanced', 'Markdown editor · NodeViews, toolbar, upload', ['markdown-editor'], '.coar-markdown-embed-host [data-scene-part=metric]',
    () => import('./scenes/compact-markdown-advanced.vue')),
  scene('markdown-form-layouts', 'Markdown form · row + stacked', ['markdown-form'], '.coar-markdown-form-paragraph--stacked input',
    () => import('./scenes/compact-markdown-form-layouts.vue')),
  scene('page-builder-inspectors', 'Page builder · inspectors, canvas, renderer', ['page-builder'], '.pb-tree-row',
    () => import('./scenes/compact-page-builder-inspectors.vue')),
  scene('page-builder-panes', 'Page builder · panes + expression dialog', ['page-builder', 'script-editor'], '.pb-tree-row',
    () => import('./scenes/compact-page-builder-panes.vue'), { isolation: 'frame', frameHeight: 820 }),
  scene('page-builder-code', 'Page builder · code mode dialogs', ['page-builder', 'script-editor'], '.pb-tree-row',
    () => import('./scenes/compact-page-builder-code.vue'), { isolation: 'frame', frameHeight: 820 }),
  scene('data-grid-editors', 'Data grid · cell editors', ['data-grid'], '.ag-row',
    () => import('./scenes/compact-data-grid-editors.vue')),
  scene('data-grid-states', 'Data grid · pagination, filter popup, overlays', ['data-grid'], '[data-scene-part=paged] .ag-row',
    () => import('./scenes/compact-data-grid-states.vue')),
  scene('document-viewer-states', 'Document viewer · outline, search, error', ['document-viewer'], '[data-scene-part=outline] .coar-pdf-viewer__pages canvas',
    () => import('./scenes/compact-document-viewer-states.vue')),
  scene('map-points', 'Map · point list, editor, popups', ['map'], '[data-scene-part=map] .leaflet-marker-icon',
    () => import('./scenes/compact-map-points.vue')),
];

export const libraryScene = (id: unknown): LibraryScene | undefined =>
  libraryScenes.find((entry) => entry.id === id);
