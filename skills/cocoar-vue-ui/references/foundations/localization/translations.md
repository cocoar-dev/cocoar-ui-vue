<!-- Generated from apps/docs/foundations/localization/translations.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Translations

The `useI18n()` composable provides translation lookup with parameter interpolation. Translations can come from HTTP sources (configured via `i18nUrl`) or be registered directly in code using the service's `i18nStore`.

Parameters use `{name}` syntax and are replaced at runtime. Nested translation objects are automatically flattened to dot-separated keys.

**Demo — `localization/demos/TranslationDemo.vue`**

```vue
<template>
  <div class="demo">
    <div class="locale-switcher">
      <button
        v-for="loc in locales"
        :key="loc.code"
        :class="['locale-btn', { active: currentLocale === loc.code }]"
        @click="switchLocale(loc.code)"
      >
        {{ loc.label }}
      </button>
    </div>

    <div class="translated-ui">
      <div class="greeting">{{ t('greeting', { name: 'Alice' }) }}</div>
      <div class="message">{{ t('items.count', { count: 3 }) }}</div>
      <div class="button-row">
        <button class="action-btn primary">{{ t('actions.save') }}</button>
        <button class="action-btn secondary">{{ t('actions.cancel') }}</button>
        <button class="action-btn danger">{{ t('actions.delete') }}</button>
      </div>
      <div class="status">{{ t('status.lastSaved', { time: '14:30' }) }}</div>
    </div>

    <div class="code-hint">
      <code>t('greeting', { name: 'Alice' })</code>
      <span class="arrow">&rarr;</span>
      <code class="result">{{ t('greeting', { name: 'Alice' }) }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocalization, useI18n } from '@cocoar/vue-localization';

const service = useLocalization()!;
const { t } = useI18n();

const locales = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
];

const currentLocale = ref('en');

// Register inline translations for the demo
onMounted(() => {
  service.i18nStore.setTranslations('en', {
    greeting: 'Hello, {name}!',
    items: { count: 'You have {count} items in your cart.' },
    actions: { save: 'Save', cancel: 'Cancel', delete: 'Delete' },
    status: { lastSaved: 'Last saved at {time}' },
  });
  service.i18nStore.setTranslations('de', {
    greeting: 'Hallo, {name}!',
    items: { count: 'Sie haben {count} Artikel im Warenkorb.' },
    actions: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Loeschen' },
    status: { lastSaved: 'Zuletzt gespeichert um {time}' },
  });
  service.i18nStore.setTranslations('fr', {
    greeting: 'Bonjour, {name} !',
    items: { count: 'Vous avez {count} articles dans votre panier.' },
    actions: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer' },
    status: { lastSaved: 'Derniere sauvegarde a {time}' },
  });
  service.i18nStore.setTranslations('es', {
    greeting: 'Hola, {name}!',
    items: { count: 'Tienes {count} articulos en tu carrito.' },
    actions: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar' },
    status: { lastSaved: 'Guardado por ultima vez a las {time}' },
  });
});

async function switchLocale(code: string) {
  currentLocale.value = code;
  await service.setLanguage(code);
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.locale-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.locale-btn {
  padding: 6px 14px;
  border: 1px solid var(--coar-border-neutral-primary);
  border-radius: 6px;
  background: var(--coar-bg-neutral-primary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.locale-btn:hover {
  border-color: var(--coar-border-accent-primary);
}

.locale-btn.active {
  background: var(--coar-bg-accent-primary);
  color: var(--coar-text-constant-white);
  border-color: var(--coar-bg-accent-primary);
}

.translated-ui {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-primary);
  background: var(--coar-bg-neutral-primary);
}

.greeting {
  font-size: 18px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
}

.message {
  font-size: 14px;
  color: var(--coar-text-neutral-secondary);
}

.button-row {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.action-btn.primary {
  background: var(--coar-bg-accent-primary);
  color: var(--coar-text-constant-white);
}

.action-btn.secondary {
  background: var(--coar-bg-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.action-btn.danger {
  background: var(--coar-bg-error-primary);
  color: var(--coar-text-constant-white);
}

.status {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-style: italic;
}

.code-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.arrow {
  color: var(--coar-text-neutral-tertiary);
}

.result {
  color: var(--coar-text-accent-primary);
  font-weight: 600;
}
</style>
```

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

> **Tip: Props as alternative**
>
> If you only need to change a single string in one place, some components offer direct props -- for example `CoarSpinner` has a `label` prop, `CoarPopconfirm` has `confirmText` and `cancelText`. Check the component's **Props** table first before reaching for i18n.
