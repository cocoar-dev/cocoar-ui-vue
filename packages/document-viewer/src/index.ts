export { default as CoarDocumentViewer } from './CoarDocumentViewer.vue';
export type {
  CoarDocumentViewerProps,
  CoarDocumentViewerLabels,
  CoarDocumentViewerPosition,
  CoarDocumentViewerErrorEvent,
  CoarDocumentViewerToolbarPosition,
} from './CoarDocumentViewer.vue';
export type {
  CoarPdfAnnotation,
  CoarPdfAnnotationType,
  CoarPdfAnnotationMode,
  CoarPdfMarkerAnnotation,
  CoarPdfCommentAnnotation,
  CoarPdfInkAnnotation,
  CoarPdfFreetextAnnotation,
  CoarPdfAnnotationCreatePayload,
  CoarPdfAnnotationUpdatePayload,
  CoarPdfRect,
  CoarPdfPoint,
  CoarDocumentViewerTool,
} from './types';
export { COAR_DOCUMENT_VIEWER_ALL_TOOLS } from './types';
export type {
  DocumentSource,
  DocumentSourceCapabilities,
  PdfDocumentSource,
  ImageDocumentSource,
  ImageGalleryDocumentSource,
  DocumentInfo,
  PdfMetadata,
} from './source-types';
export {
  imageSource,
  imageGallerySource,
  type ImageSourceOptions,
  type ImageGallerySourceOptions,
} from './sources/image';
