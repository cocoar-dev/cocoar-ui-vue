export { default as CoarScriptEditor } from './CoarScriptEditor.vue';
export type {
  CoarScriptEditorProps,
  CoarScriptEditorRejectReason,
  CoarScriptEditorRejectEvent,
} from './CoarScriptEditor.vue';
export type {
  CoarScriptEditorLanguage,
  CoarScriptEditorVariant,
} from './composables/useMonacoEditor';
export type { CoarScriptEditorExtraLib } from './composables/useExtraLibs';
export type { CoarScriptEditorTheme } from './theme';
export {
  COAR_THEME_LIGHT,
  COAR_THEME_DARK,
  ensureCoarThemes,
  detectAutoTheme,
  watchAutoTheme,
} from './theme';

export {
  scanLockedLines,
  computeProtectedRanges,
  hasLockedMarkers,
  getEditableSegments,
  overlapsProtectedRange,
  editIsProtected,
  snapOffsetAwayFromLocked,
  countLockedLines,
  isEverySegmentNonEmpty,
  validateSource,
  LOCKED_MARKER_TEXT,
  type LockedLine,
  type ProtectedRange,
  type SourceValidation,
} from './constrained/LockedLineScanner';
