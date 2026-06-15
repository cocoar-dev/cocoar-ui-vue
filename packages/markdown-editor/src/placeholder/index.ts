/**
 * Public surface for the empty-state placeholder.
 *
 * The placeholder is a muted overlay of the shared `@cocoar/vue-markdown`
 * viewer — see `PlaceholderOverlay.vue` for the why. The editor renders it
 * over the writing area while the document is empty; it never becomes
 * document content, so an untouched editor still emits an empty string.
 */
export { default as PlaceholderOverlay } from './PlaceholderOverlay.vue';
