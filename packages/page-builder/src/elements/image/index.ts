import type { ImageNode } from '../../schema';
import { definePageElement } from '../registry';
import ImageRenderer from './ImageRenderer.vue';
import ImagePreview from './ImagePreview.vue';
import ImageInspector from './ImageInspector.vue';

export const imageElement = definePageElement<ImageNode['props']>({
  renderer: ImageRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.image', fallback: 'Image' },
    icon: 'image',
    defaults: () => ({ assetId: '' }),
    preview: ImagePreview,
    inspector: ImageInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.image', fallback: 'Image' },
  },
});
