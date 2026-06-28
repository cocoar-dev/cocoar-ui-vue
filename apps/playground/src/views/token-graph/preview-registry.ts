/**
 * Live-preview specs for consumer nodes. A consumer node can expand to render
 * the *real* Cocoar component in its body; this maps a component name to the
 * component + sensible default props/slot so it shows something meaningful.
 *
 * Not every component is listed — those without an entry simply don't offer a
 * preview toggle. `markRaw` keeps Vue from making the component definition
 * reactive.
 */
import { markRaw } from 'vue';
import {
  CoarButton, CoarTextInput, CoarCheckbox, CoarSwitch, CoarTag, CoarBadge,
} from '@cocoar/vue-ui';

export interface PreviewSpec {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any;
  props?: Record<string, unknown>;
  /** Default-slot text, for components that render their content (Button, Tag). */
  slot?: string;
}

export const PREVIEW_REGISTRY: Record<string, PreviewSpec> = {
  CoarButton: { component: markRaw(CoarButton), props: { variant: 'primary' }, slot: 'Button' },
  CoarTextInput: { component: markRaw(CoarTextInput), props: { modelValue: 'Sample', placeholder: 'Type…' } },
  CoarCheckbox: { component: markRaw(CoarCheckbox), props: { label: 'Option', modelValue: true } },
  CoarSwitch: { component: markRaw(CoarSwitch), props: { label: 'Enabled', modelValue: true } },
  CoarTag: { component: markRaw(CoarTag), slot: 'Tag' },
  CoarBadge: { component: markRaw(CoarBadge), props: { content: '5' } },
};

export function previewFor(name: string): PreviewSpec | undefined {
  return PREVIEW_REGISTRY[name];
}
