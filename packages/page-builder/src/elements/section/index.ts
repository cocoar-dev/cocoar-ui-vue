import type { SectionNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import SectionRenderer from './SectionRenderer.vue';
import SectionInspector from './SectionInspector.vue';

export const sectionElement = definePageElement<SectionNode['props']>({
  renderer: SectionRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.section', fallback: 'Section' },
    icon: 'panel-left',
    group: 'container',
    defaults: () => ({ title: 'Section' }),
    inspector: SectionInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.section', fallback: 'Section' },
    quickProperties: [
      quick.direction, quick.gap, quick.padding, quick.size, quick.width, quick.height,
      quick.minHeight, quick.maxHeight, quick.overflow, quick.hidden,
    ],
  },
});
