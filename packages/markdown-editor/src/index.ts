export { default as CoarMarkdownEditor } from './CoarMarkdownEditor.vue';
export { COAR_MARKDOWN_EDITOR_ALL_TOOLS } from './CoarMarkdownEditor.vue';
export type {
  CoarMarkdownEditorProps,
  CoarMarkdownEditorToolbarMode,
  CoarMarkdownEditorToolbarPosition,
  CoarMarkdownEditorTool,
  CoarMarkdownEditorToolRef,
  CoarMarkdownEditorToolFlyout,
  CoarMarkdownEditorToolEntry,
} from './CoarMarkdownEditor.vue';
export type { ImageUploader, ImageUploadOptions } from './image/imageUpload';
export type { ImageInsertResult } from './image/ImageInsertDialog.vue';
export type { ImagePicker, ImagePickContext, ImageDescriptor } from './image/pickImage';
export { resolveCapabilities } from './flavor';
export type { CoarMarkdownFlavor, CoarMarkdownFlavorInput, CoarMarkdownCapabilities } from './flavor';
// Custom-embed registry — re-exported from the viewer package so consumers can
// register embeds and type the `embeds` prop from a single import.
export {
  EmbedRenderer,
  MARKDOWN_EMBEDS_KEY,
  resolveEmbed,
} from '@cocoar/vue-markdown';
export type {
  EmbedDefinition,
  EmbedEditorController,
  EmbedEditorProps,
  EmbedInsertIntegration,
  EmbedRegistry,
} from '@cocoar/vue-markdown';
