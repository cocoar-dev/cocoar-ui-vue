/*
 * Shared, deterministic fixtures of the page-builder review scenes
 * (compact-page-builder-inspectors.vue, -panes.vue, -code.vue).
 *
 * Everything is synthetic and local: no clock, no randomness, no network. The asset is an
 * inline SVG data URI; compositions live in the package's own in-memory repository.
 * Node ids and names are the contract of compact-page-builder-states.spec.ts.
 */
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  createInMemoryPageCompositionRepository,
  type ElementNode,
  type PageConfig,
  type PageNode,
} from '@cocoar/vue-page-builder';

const BRAND_MARK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
      '<rect width="96" height="96" fill="#3b6ea5"/><circle cx="48" cy="48" r="26" fill="#f4f1ea"/></svg>',
  );

/** A fresh tree per call: the builder mutates its working copy. */
export function createReviewSchema(): PageNode {
  return {
    id: 'root',
    type: 'page',
    schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
    style: { gap: '16px', padding: '24px' },
    translations: {
      en: { 'page.hero.title': 'Account settings', 'page.hero.cta': 'Save changes' },
      de: { 'page.hero.title': 'Kontoeinstellungen', 'page.hero.cta': 'Änderungen speichern' },
    },
    children: [
      {
        id: 'h-title',
        type: 'heading',
        name: 'heroTitle',
        props: { text: 'Account settings', level: 2 },
        bindings: { text: { source: 'translation', key: 'page.hero.title' } },
      },
      { id: 'p-intro', type: 'paragraph', name: 'introText', props: { text: 'Changes apply to every workspace.' } },
      {
        id: 's-form',
        type: 'stack',
        name: 'formStack',
        props: { direction: 'column' },
        style: { gap: '12px' },
        children: [
          { id: 't-name', type: 'text-input', name: 'displayName', props: { label: 'Display name', placeholder: 'First and last name' } },
          {
            id: 'sel-country',
            type: 'select',
            name: 'country',
            props: {
              label: 'Country',
              placeholder: 'Choose a country',
              options: [
                { value: 'at', label: 'Austria' },
                { value: 'de', label: 'Germany' },
                { value: 'ch', label: 'Switzerland' },
              ],
            },
          },
          { id: 'img-logo', type: 'image', name: 'brandImage', props: { assetId: 'brand-mark', alt: 'Brand mark' } },
          { id: 'b-save', type: 'button', name: 'saveButton', props: { label: 'Save', variant: 'primary', action: 'demo:save', validates: true } },
          // Not in config.availableActions: an authoring warning, hence an issue icon on its outline row.
          { id: 'b-legacy', type: 'button', name: 'legacyButton', props: { label: 'Legacy', variant: 'secondary', action: 'demo:retired' } },
        ],
      },
      {
        id: 'c-linked',
        type: 'card',
        name: 'brandPanel',
        props: {},
        composition: { id: 'brand-panel', version: 'v2' },
        children: [{ id: 'p-linked', type: 'paragraph', name: 'brandCopy', props: { text: 'Shared brand panel (v2).' } }],
      },
      // References a composition the repository does not have: a "missing" reference problem.
      { id: 'c-ghost', type: 'card', name: 'ghostPanel', props: {}, composition: { id: 'ghost-panel', version: 'v1' }, children: [] },
      { id: 'c-empty', type: 'card', name: 'emptyCard', props: {}, children: [] },
    ],
  } as PageNode;
}

export function createReviewConfig(): PageConfig {
  return {
    allowedElements: ['stack', 'card', 'heading', 'paragraph', 'text-input', 'select', 'image', 'button'],
    availableActions: [{ id: 'demo:save', label: 'Save (demo)' }],
    locales: [
      { id: 'en', label: 'English' },
      { id: 'de', label: 'Deutsch' },
    ],
    defaultLocale: 'en',
    assetResolver: () => BRAND_MARK,
    pickAsset: async () => 'brand-mark',
  };
}

function brandPanel(version: string): ElementNode {
  return {
    id: `brand-root-${version}`,
    type: 'card',
    name: 'brandPanel',
    props: {},
    children: [{ id: `brand-copy-${version}`, type: 'paragraph', name: 'brandCopy', props: { text: `Shared brand panel (${version}).` } }],
  } as ElementNode;
}

/** v3 is the latest, so the linked v2 instance offers "Update to latest". */
export function createReviewCompositionRepository() {
  return createInMemoryPageCompositionRepository([
    { id: 'brand-panel', name: 'Brand panel', version: 'v2', root: brandPanel('v2') },
    { id: 'brand-panel', name: 'Brand panel', version: 'v3', root: brandPanel('v3') },
  ]);
}

/** Opens the Structure drawer the way an author would; idempotent. */
export function openStructureDrawer(root: HTMLElement | null) {
  const button = root?.querySelector<HTMLButtonElement>('[aria-label="Structure"]');
  if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
}
