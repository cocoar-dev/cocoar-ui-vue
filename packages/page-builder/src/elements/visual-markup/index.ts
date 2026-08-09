import { defineAsyncComponent } from 'vue';
import type { VisualMarkupNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import VisualMarkupRenderer from './VisualMarkupRenderer.vue';
import VisualMarkupPreview from './VisualMarkupPreview.vue';
import { buildVisualDocument } from './visualDocument';

const VisualMarkupInspector = defineAsyncComponent(() => import('./VisualMarkupInspector.vue'));

const DEFAULT_HTML = '<div class="visual-card">Decorative visual</div>';
const DEFAULT_CSS = `.visual-card {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: var(--visual-surface, #f7f7f9);
  color: var(--visual-text, #20242d);
  font-family: sans-serif;
}`;

export const visualMarkupElement = definePageElement<VisualMarkupNode['props']>({
  renderer: VisualMarkupRenderer,
  normalizeProps: (raw) => {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    return {
      html: typeof value.html === 'string' ? value.html : '',
      ...(typeof value.css === 'string' ? { css: value.css } : {}),
    };
  },
  builder: {
    label: { key: 'coar.pageBuilder.type.visualMarkup', fallback: 'Visual markup' },
    icon: 'image',
    defaults: () => ({ html: DEFAULT_HTML, css: DEFAULT_CSS }),
    preview: VisualMarkupPreview,
    inspector: VisualMarkupInspector,
    inspectorInCodeMode: true,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.visualMarkup', fallback: 'Visual markup' },
    // A decorative panel is nearly always sized by its slot, so leaving Height
    // empty (and letting the parent row stretch it) has to be reachable.
    quickProperties: [
      quick.size, quick.width, quick.height, quick.minHeight, quick.maxHeight,
      quick.overflow, quick.hidden,
    ],
    lint: (node, config) => {
      const result = buildVisualDocument(node.props.html ?? '', node.props.css ?? '', config?.visualMarkup);
      return result.errors.map((message) => ({
        severity: 'error' as const,
        message: { key: 'coar.pageBuilder.visualMarkup.invalid', fallback: message },
      }));
    },
  },
});

export { buildVisualDocument } from './visualDocument';
