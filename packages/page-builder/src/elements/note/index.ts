import type { NoteNode } from '../../schema';
import { definePageElement } from '../registry';
import NoteRenderer from './NoteRenderer.vue';
import NotePreview from './NotePreview.vue';
import NoteInspector from './NoteInspector.vue';

export const noteElement = definePageElement<NoteNode['props']>({
  renderer: NoteRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.note', fallback: 'Note' },
    icon: 'info',
    defaults: () => ({ text: 'Note text.', variant: 'info' }),
    preview: NotePreview,
    inspector: NoteInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.note', fallback: 'Note' },
  },
});
