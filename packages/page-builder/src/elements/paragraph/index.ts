import type { ParagraphNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import ParagraphRenderer from './ParagraphRenderer.vue';
import ParagraphPreview from './ParagraphPreview.vue';
import ParagraphInspector from './ParagraphInspector.vue';

export const paragraphElement = definePageElement<ParagraphNode['props']>({
  renderer: ParagraphRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.paragraph', fallback: 'Paragraph' },
    icon: 'pilcrow',
    defaults: () => ({ text: 'Paragraph text.' }),
    quickProperties: [quick.text, quick.width, quick.hidden],
    preview: ParagraphPreview,
    inspector: ParagraphInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.paragraph', fallback: 'Paragraph' },
  },
});
