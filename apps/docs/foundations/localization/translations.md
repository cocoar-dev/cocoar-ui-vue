---
description: "Translation lookup with the useI18n() composable: t() and tRef() with parameter interpolation, HTTP-loaded or code-registered translations, and fallbacks."
---

<script setup>
import TranslationDemo from './demos/TranslationDemo.vue';
</script>

# Translations

The `useI18n()` composable provides translation lookup with parameter interpolation. Translations can come from HTTP sources (configured via `i18nUrl`) or be registered directly in code using the service's `i18nStore`.

Parameters use `{name}` syntax and are replaced at runtime. Nested translation objects are automatically flattened to dot-separated keys.

<TranslationDemo />

## Usage

```vue
<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';

const { t, tRef, language } = useI18n();

// Immediate value (call in template for reactivity)
// t('greeting', { name: 'Alice' })  →  "Hello, Alice!"

// Computed ref (reacts to language changes automatically)
const title = tRef('app.title');
</script>

<template>
  <h1>{{ title }}</h1>
  <p>{{ t('greeting', { name: 'Alice' }) }}</p>
  <p>{{ t('missing.key', {}, 'Fallback text') }}</p>
</template>
```

## Registering Translations in Code

For cases where HTTP loading is not appropriate (tests, demos, embedded apps), you can register translations directly on the service.

```ts
import { useLocalization } from '@cocoar/vue-localization';

const service = useLocalization()!;

service.i18nStore.setTranslations('en', {
  greeting: 'Hello, {name}!',
  actions: {
    save: 'Save',
    cancel: 'Cancel',
  },
});

service.i18nStore.setTranslations('de', {
  greeting: 'Hallo, {name}!',
  actions: {
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
});
```

Nested keys are automatically flattened: `actions.save` resolves `'Save'` for English.

## `useI18n()` API

| Property | Type | Description |
|----------|------|-------------|
| `language` | `Ref<string>` | Current language (reactive) |
| `t(key, params?, fallback?)` | `(string, Record?, string?) => string` | Translate a key with optional interpolation |
| `tRef(key, params?, fallback?)` | `(string, Record?, string?) => ComputedRef<string>` | Computed translation that reacts to language changes |

## Translation Fallback Behavior

1. Look up the key in the current language (e.g. `de-AT`)
2. If not found and locale is regional, try the base language (`de`)
3. If still not found, use the provided `fallback` argument
4. If no fallback, return the key itself

## Translating Component Strings

All built-in text in Cocoar UI components -- `aria-label`s, button labels, empty state messages, screen-reader announcements -- defaults to English and can be translated by providing a `coar.ui.*` namespace in your translation JSON.

If the localization plugin is **not** installed, every string falls back to its English default automatically. Nothing breaks, nothing needs to be configured.

```
Plugin not installed        →  English fallbacks (default)
Plugin installed            →  Translated strings, if the key exists in your JSON
Plugin installed, key missing  →  English fallback
```

Your translation file only needs to contain the keys you want to override:

```json
{
  "coar": {
    "ui": {
      "dialog": { "dialog": "Dialog", "close": "Schließen" },
      "select": { "noResults": "Keine Ergebnisse", "noOptions": "Keine Optionen verfügbar" },
      "datePicker": {
        "dialog": "Datumsauswahl",
        "clearDate": "Datum löschen",
        "previousYear": "Vorheriges Jahr",
        "nextYear": "Nächstes Jahr",
        "months": "Monate"
      },
      "toast": { "dismiss": "Benachrichtigung schließen" }
    }
  }
}
```

Each component's documentation page lists its translatable keys under an **i18n Keys** section. Check the component page you're working with for the exact keys available.

::: tip Props as alternative
If you only need to change a single string in one place, some components offer direct props -- for example `CoarSpinner` has a `label` prop, `CoarPopconfirm` has `confirmText` and `cancelText`. Check the component's **Props** table first before reaching for i18n.
:::
