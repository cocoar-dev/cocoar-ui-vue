import {
  definePageElement,
  QUICK_PROPERTY_PRESETS as quick,
  type ElementNode,
} from '@cocoar/vue-page-builder';
import MarkdownFieldRenderer, { type MarkdownFieldProps } from './MarkdownFieldRenderer.vue';
import MarkdownFieldPreview from './MarkdownFieldPreview.vue';

export const markdownFieldElement = definePageElement<MarkdownFieldProps>({
  renderer: MarkdownFieldRenderer,
  value: {
    types: ['markdown'],
    defaultValue: () => '',
    isEmpty: (value) => String(value ?? '').trim().length === 0,
  },
  builder: {
    label: { key: 'poc.pageBuilder.markdownField', fallback: 'Markdown field' },
    icon: 'file-text',
    group: 'element',
    defaults: () => ({ placeholder: 'Write Markdown …' }),
    preview: MarkdownFieldPreview,
    quickProperties: [quick.placeholder, quick.size, quick.width, quick.height, quick.hidden],
    lint: (node: ElementNode<string, MarkdownFieldProps>) => node.name
      ? []
      : [{ severity: 'warning', message: { key: 'poc.markdownField.name', fallback: 'Bind the Markdown field to a name.' } }],
  },
});
