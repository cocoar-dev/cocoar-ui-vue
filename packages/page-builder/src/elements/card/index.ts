import type { CardNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '../registry';
import CardRenderer from './CardRenderer.vue';
import CardInspector from './CardInspector.vue';

export const cardElement = definePageElement<CardNode['props']>({
  renderer: CardRenderer,
  container: true,
  builder: {
    label: { key: 'coar.pageBuilder.type.card', fallback: 'Card' },
    icon: 'square-dashed',
    group: 'container',
    defaults: () => ({}),
    quickProperties: [
      quick.direction, quick.gap, quick.padding, quick.size, quick.width, quick.height,
      quick.minHeight, quick.maxHeight, quick.overflow, quick.hidden,
    ],
    inspector: CardInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.card', fallback: 'Card' },
  },
});
