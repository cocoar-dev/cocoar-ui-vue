/**
 * The playground's consumer-registered element — the end-to-end proof that a
 * component defined entirely OUTSIDE the library becomes a first-class
 * builder + renderer element. Registered under the vendor-prefixed key
 * `acme-rating` via `config.elementTypes`.
 */
import { definePageElement, QUICK_PROPERTY_PRESETS as quick } from '@cocoar/vue-page-builder';
import type { RatingProps } from './ratingProps';
import RatingRenderer from './RatingRenderer.vue';
import RatingPreview from './RatingPreview.vue';
import RatingInspector from './RatingInspector.vue';
import RatingDefaultInput from './RatingDefaultInput.vue';

export const ratingElement = definePageElement<RatingProps>({
  renderer: RatingRenderer,
  value: {
    // A rating edits number fields (contract compatibility).
    types: ['number'],
    // required = at least one star.
    isEmpty: (v) => !v || Number(v) === 0,
  },
  builder: {
    label: { key: 'playground.pb.type.rating', fallback: 'Rating' },
    icon: 'star',
    defaults: () => ({ label: 'Rating', max: 5 }),
    // Consumer elements opt into the same code-backed Quick Property contract.
    quickProperties: [quick.label, quick.width, quick.hidden],
    preview: RatingPreview,
    inspector: RatingInspector,
    inspectorTitle: { key: 'playground.pb.section.rating', fallback: 'Rating' },
    defaultValueInput: RatingDefaultInput,
  },
});
