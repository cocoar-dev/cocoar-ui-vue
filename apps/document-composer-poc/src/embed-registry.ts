import type { EmbedRegistry } from '@cocoar/vue-markdown';
import PageEmbedEditor from './PageEmbedEditor.vue';
import PageEmbedViewer from './PageEmbedViewer.vue';
import MarkdownSectionViewer from './MarkdownSectionViewer.vue';
import MarkdownSectionTemplateEditor from './MarkdownSectionTemplateEditor.vue';
import { requestPageReference } from './page-store';

let sectionSequence = 0;

export const composerEmbeds: EmbedRegistry = {
  page: {
    viewer: PageEmbedViewer,
    editor: PageEmbedEditor,
    insert: {
      label: 'Insert page',
      icon: 'layout-grid',
      pick: () => requestPageReference(),
    },
  },
  field: {
    viewer: MarkdownSectionViewer,
    editor: MarkdownSectionTemplateEditor,
    insert: {
      label: 'Insert editable section',
      icon: 'file-text',
      pick: () => ({
        id: `section-${++sectionSequence}`,
        label: 'Editable text',
        placeholder: 'Click here to add text …',
      }),
    },
  },
};
