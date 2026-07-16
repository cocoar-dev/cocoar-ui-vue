import type { LinkNode } from '../../schema';
import { definePageElement } from '../registry';
import LinkRenderer from './LinkRenderer.vue';
import LinkPreview from './LinkPreview.vue';
import LinkInspector from './LinkInspector.vue';

export const linkElement = definePageElement<LinkNode['props']>({
  renderer: LinkRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.link', fallback: 'Link' },
    icon: 'link',
    defaults: () => ({ label: 'Link' }),
    preview: LinkPreview,
    inspector: LinkInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.link', fallback: 'Link' },
  },
});
