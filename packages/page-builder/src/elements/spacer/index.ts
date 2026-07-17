import type { SpacerNode } from '../../schema';
import { definePageElement } from '../registry';
import SpacerRenderer from './SpacerRenderer.vue';
import SpacerPreview from './SpacerPreview.vue';
import SpacerInspector from './SpacerInspector.vue';

export const spacerElement = definePageElement<SpacerNode['props']>({
  renderer: SpacerRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.spacer', fallback: 'Spacer' },
    icon: 'more-horizontal',
    group: 'element',
    defaults: () => ({}),
    preview: SpacerPreview,
    inspector: SpacerInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.spacer', fallback: 'Spacer' },
    hideStyleSection: true,
  },
});
