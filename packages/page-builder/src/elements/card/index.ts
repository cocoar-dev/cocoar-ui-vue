import type { CardNode } from '../../schema';
import { definePageElement } from '../registry';
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
    inspector: CardInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.card', fallback: 'Card' },
  },
});
