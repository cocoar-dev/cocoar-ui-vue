import type { HeadingNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import HeadingRenderer from './HeadingRenderer.vue';
import HeadingPreview from './HeadingPreview.vue';
import HeadingInspector from './HeadingInspector.vue';

export const headingElement = definePageElement<HeadingNode['props']>({
  renderer: HeadingRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.heading', fallback: 'Heading' },
    icon: 'heading',
    defaults: () => ({ text: 'Heading', level: 2 }),
    quickProperties: [quick.text, quick.width, quick.hidden],
    preview: HeadingPreview,
    inspector: HeadingInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.heading', fallback: 'Heading' },
  },
});
