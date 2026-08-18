import type { CoarMarkdownEditorToolEntry } from '@cocoar/vue-markdown-editor';

/** Value editors deliberately cannot insert structural Page/field directives. */
export const markdownValueTools: CoarMarkdownEditorToolEntry[] = [
  'bold', 'italic', 'strikethrough', 'inlineCode', 'headings',
  'divider', 'bulletList', 'orderedList', 'taskList', 'blockquote',
  'divider', 'table', 'image', 'clearFormatting',
  'divider', 'undo', 'redo',
];
