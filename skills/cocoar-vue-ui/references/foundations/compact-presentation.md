<!-- Generated from apps/docs/foundations/compact-presentation.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Compact presentation (Preview)

The compact profile is an experiment across the library, not a change of the default theme.
It uses smaller, normally weighted Inter text, Slate-tinted structure, restrained corners and
aligned controls. Existing props, events and data formats are unchanged.

## Compare this documentation

Use **Style → Bisher / Compact** in the navigation to switch the entire documentation:
the VitePress shell, prose and ordinary live component examples. In a narrower window, the
selector is in the main navigation menu. The mobile documentation has the same selector in its header.

The choice is remembered in this browser and follows page navigation. Embedded phone/tablet
demos follow it without reloading, so their form values and open dialogs remain intact.
Light/dark mode remains independent. If browser storage is blocked, switching still works
for the current visit.

**Bisher** remains the default. Examples that explicitly opt into Compact, including the
sample on this page, remain Compact in either site mode; explicit theme demonstrations keep
their own scopes. This documentation preference does not change an application's opt-in.

## Opt in

Keep the normal stylesheet import and load the optional font entry:

```ts
import '@cocoar/vue-ui/styles';
import '@cocoar/vue-ui/fonts/compact';
```

```vue
<CoarThemeScope mode="light">
  <section class="coar-compact">
    <!-- UI, calendar, grids, editors, viewer and map chrome -->
  </section>
</CoarThemeScope>
```

Use `.coar-compact` on `html` for an entire application, or on a container for a local comparison.
Areas outside the class retain the existing desktop and mobile presentation. The library does not
paint an application's page background; use `background: var(--coar-background-neutral-primary)`
on your page or panel.

Load `@cocoar/vue-ui/fonts` as before if the same document also displays the legacy typography.
The compact entry self-hosts Inter 400, 500, 600 and 700; it does not load fonts from a CDN.

## Density and typography

| Role | Desktop | With `.coar-mobile` |
| --- | --- | --- |
| Body | 14 px / 1.5, weight 400 | 14 px / 1.5 |
| Actions and UI labels | 13 px, weight 400/500 | 14 px |
| Input text `xs / s / m / l` | 12 / 13 / 14 / 16 px | 16 / 16 / 16 / 18 px |
| Caption | 12 px | 12 px |
| Normal control | 36 px | 44 px |
| Controls `xs / s / m / l` | 24 / 32 / 36 / 44 px | 44 / 44 / 44 / 48 px |
| Control / panel radius | 6 / 8 px | 6 / 8 px |

Input text and action text are deliberately independent. A small visible icon is not a small touch
target. Dense calendar labels and document/code content have their own roles; they are not scaled
by a global zoom or density multiplier.

`--coar-field-font-size` sets the medium field text. Extra-small, small and large text default
to two pixels smaller, one pixel smaller and two pixels larger. Override those sizes independently
with `--coar-field-xs-font-size`, `--coar-field-s-font-size` and `--coar-field-l-font-size` on the
Compact boundary. Nested themes inherit these overrides; an explicit theme reset restores defaults.
`--coar-field-min-font-size` keeps all mobile field text at least 16 px without enlarging action text.
Single-line controls retain their existing heights. Multiline fields retain their previous minimum
row spacing and add leading when their text is larger than medium, so umlauts and descenders do not
clip or touch. Textareas with many rows can therefore grow to fit the larger type.
The playground's `/design-review/field-sizes` page exercises the same roles across text,
selection, date/time and OTP fields.

Fixed week grids keep a minimum day-column width and scroll horizontally inside the calendar
instead of clipping the last day. A horizontal gesture scrolls that overflow; range paging resumes
when all columns fit. Month overflow actions follow a separate target-size role. Timed-event resize
targets occupy a side rail, leaving the body available for moving. Short or narrow cards bound the
rail to half the card: they do not promise full-size touch targets, and arrow keys remain an alternative.

```html
<section class="coar-compact coar-mobile">…</section>
```

Live demo in phone size: [Compact fields and keyboard-aware sheet](https://docs.cocoar.dev/cocoar-ui-vue/mobile/#/compact)

<div class="coar-mobile">

**Demo — `mobile/demos/CompactDemo.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCheckbox, CoarFormField, CoarSelect, CoarTextInput, useDialog } from '@cocoar/vue-ui';
import '@cocoar/vue-ui/fonts/compact';
import SheetDemoContact, { type Contact } from './SheetDemoContact.vue';

const name = ref('Anna Berger');
const status = ref<string | null>('review');
const notify = ref(true);
const message = ref('Synthetic data only.');
const dialog = useDialog();
const contact: Contact = {
  name: 'Anna Berger', email: 'anna@example.com', phone: '+43 1 234 567',
  company: 'Example', street: 'Ringstraße 12', postcode: '1010',
  city: 'Vienna', country: 'Austria', notes: 'Synthetic compact presentation sample.',
};

async function edit() {
  const result = await dialog.open<Contact>(
    SheetDemoContact,
    { title: 'Compact contact', presentation: 'sheet' },
    { contact },
  ).result;
  message.value = result ? `Saved “${result.name}”.` : 'Editing cancelled.';
}
</script>

<template>
  <section class="coar-compact compact-demo">
    <p>Preview: 44 px controls, 14 px actions and separate 16 px input text.</p>
    <CoarFormField label="Name"><CoarTextInput v-model="name" clearable /></CoarFormField>
    <CoarFormField label="Status">
      <CoarSelect v-model="status" :options="[
        { value: 'review', label: 'In Prüfung' },
        { value: 'planned', label: 'Geplant' },
        { value: 'done', label: 'Abgeschlossen' },
      ]" />
    </CoarFormField>
    <CoarCheckbox v-model="notify" label="Benachrichtigungen senden" />
    <CoarButton full-width @click="edit">Edit compact contact</CoarButton>
    <output>{{ message }}</output>
  </section>
</template>

<style scoped>
.compact-demo { display: grid; gap: 12px; padding: 16px; background: var(--coar-background-neutral-primary); }
.compact-demo p { margin: 0; }
.compact-demo output { overflow-wrap: anywhere; color: var(--coar-text-neutral-secondary); }
</style>
```

</div>

## Theme inputs and local specialization

`CoarThemeScope` continues to accept accent, semantic colors, fonts and component radii.
Without an explicit accent, compact uses Slate instead of the legacy blue. The compact curves
separate filled-action colors from text, border and focus colors in light and dark mode.
Normal field outlines use a muted Slate tone; hover strengthens them only slightly.
The `--coar-border-input` and `--coar-border-input-hover` roles remain independently
customizable, separate from focus and semantic error colors.

```vue
<CoarThemeScope :theme="{ accent: '#15803d', bodyFontFamily: 'Inter', buttonRadius: 8 }">
  <section class="coar-compact">…</section>
</CoarThemeScope>
```

Apply shared role overrides on a presentation boundary (`.coar-compact`, `CoarThemeScope`, or
`.coar-theme-scope`), where dependent aliases are recalculated. Setting a source variable on an
arbitrary descendant does not recalculate aliases that CSS already resolved on its ancestor.

```html
<div class="coar-compact">
  <section class="coar-theme-scope" style="--coar-ui-font-size: 14px; --coar-panel-radius: 10px">
    …
  </section>
</div>
```

Package roles stay independent where their meaning differs: grid row heights, calendar event
geometry, document pages and editor line heights are not interchangeable control heights.
Consumer-supplied event colors, map geometry, PDF content and saved page layouts are not rewritten.

Inside compact, `.coar-theme-none` resets brand inputs to the compact light defaults without
turning the presentation into a mixture of legacy and compact tokens. It retains the surrounding
mobile presentation. Use a sibling outside `.coar-compact` for a fully legacy area.

## Teleports and global renderers

Library overlays carry their originating profile, local theme, mobile roles and explicit overrides,
including changes while open. Custom library-like teleports can use the Preview helper:

```ts
const presentation = useCompactPresentationContext(() => origin.value);
```

```vue
<Teleport to="body">
  <div :class="presentation.classes" :style="presentation.style">…</div>
</Teleport>
```

The helper is exported from `@cocoar/vue-ui`; it observes source ancestors, not all computed CSS
properties. Register the origin as an element ref and keep it mounted while the tool is open.

- **Monaco:** themes are document-global. Compact editor colors activate only when `html` or `body`
  carries `.coar-compact`; local compact frames do not promise an independent Monaco theme.
  Compare legacy and compact editors in separate documents. Shared color roles are converted to
  concrete Monaco colors; code typography remains independent of the UI scale.
- **Mermaid:** rendering is serialized with the diagram's resolved compact configuration. Local
  mode and token changes rerender compact diagrams; stored diagram source is unchanged.
- **Page Builder:** authoring chrome uses the compact roles, including theme-aware accent ink for
  selected canvas labels and frames. Saved layout and document geometry retain their meaning.
  Embedded library widgets still use the host presentation.

The profile does not add missing touch features: Monaco editing, hover-only editor handles,
some viewer flyouts and desktop-oriented builder interactions retain their documented device limits.
Browser emulation is not native keyboard or safe-area acceptance.

This preview is for testing in real applications, not a completed design review. Native calendar
gestures and some grid editor and document viewer states still need verification. Keep the
`.coar-compact` class behind an app-level toggle so testers can compare with the default presentation.
