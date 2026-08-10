import type { CardNode } from '../../schema';
import { definePageElement, QUICK_PROPERTY_PRESETS as quick, QUICK_COMPOUND_PRESETS as box } from '../registry';
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
      quick.direction, quick.gap, box.paddingBox,
      quick.size, box.widthBox, box.heightBox, quick.overflow, quick.hidden,
    ],
    inspector: CardInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.card', fallback: 'Card' },
  },
});
