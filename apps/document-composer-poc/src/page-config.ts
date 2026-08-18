import type { PageConfig } from '@cocoar/vue-page-builder';
import { markdownFieldElement } from './markdown-field/markdownFieldElement';

export const pageConfig: PageConfig = {
  elementTypes: {
    'cocoar-markdown-field': markdownFieldElement,
  },
  allowCustomFields: true,
  allowedElements: [
    'stack', 'card', 'section', 'heading', 'paragraph', 'note', 'divider', 'spacer',
    'text-input', 'date-input', 'checkbox', 'select', 'button',
    'cocoar-markdown-field',
  ],
  documentLimits: { maxNodes: 120, maxDepth: 12 },
};
