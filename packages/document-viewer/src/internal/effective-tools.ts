/**
 * Pure transformation that turns the user-supplied `tools` array into the
 * final render list:
 *
 *   1. Strip tools whose section-toggle is off.
 *   2. Trim leading separators.
 *   3. Trim trailing separators.
 *   4. Collapse consecutive separators.
 *
 * Extracted into its own module so it's directly testable without mounting
 * the toolbar component. Capability-disabling per tool is independent — it
 * renders the button in a disabled state with a tooltip suffix, so it does
 * NOT remove tools from the list.
 */
import type { CoarDocumentViewerTool } from '../types';

const ANNOTATION_MODE_TOOLS: readonly CoarDocumentViewerTool[] = [
  'pan',
  'select',
  'eraser',
  'marker',
  'note',
  'ink',
  'freetext',
];

export interface EffectiveToolsOptions {
  showSidebarToggle: boolean;
  showAnnotationsPanelToggle: boolean;
  showSearch: boolean;
  showPrintDownload: boolean;
  showAnnotationModes: boolean;
}

export function computeEffectiveTools(
  requested: readonly CoarDocumentViewerTool[],
  options: EffectiveToolsOptions,
): readonly CoarDocumentViewerTool[] {
  const filtered: CoarDocumentViewerTool[] = [];
  for (const tool of requested) {
    if (tool === 'sidebar-toggle' && !options.showSidebarToggle) continue;
    if (tool === 'annotations-panel' && !options.showAnnotationsPanelToggle) continue;
    if (tool === 'search' && !options.showSearch) continue;
    if ((tool === 'print' || tool === 'download') && !options.showPrintDownload) continue;
    if (!options.showAnnotationModes && ANNOTATION_MODE_TOOLS.includes(tool)) continue;
    filtered.push(tool);
  }

  while (filtered.length > 0 && filtered[0] === 'separator') filtered.shift();
  while (filtered.length > 0 && filtered[filtered.length - 1] === 'separator') filtered.pop();

  const collapsed: CoarDocumentViewerTool[] = [];
  for (const t of filtered) {
    if (t === 'separator' && collapsed[collapsed.length - 1] === 'separator') continue;
    collapsed.push(t);
  }
  return collapsed;
}
