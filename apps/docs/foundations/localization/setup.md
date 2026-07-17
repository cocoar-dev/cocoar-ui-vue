---
description: "Install and configure @cocoar/vue-localization: register the createCoarLocalization() plugin, set locale and translation URLs, and switch languages at runtime."
---

# Localization Setup

A complete localization system for Vue 3 covering locale-aware formatting (l10n), translations (i18n), and timezone detection. Provided by the optional `@cocoar/vue-localization` package.

::: info Separate Package
The localization system is shipped separately from `@cocoar/vue-ui` to keep the core bundle lean. Install it only when you need it.

```bash
pnpm add @cocoar/vue-localization
```
:::

## Setup

Register the plugin in your app entry point. The `createCoarLocalization()` factory creates both the plugin and the underlying service instance.

```ts
// main.ts
import { createApp } from 'vue';
import { createCoarLocalization } from '@cocoar/vue-localization';
import App from './App.vue';

const app = createApp(App);

app.use(createCoarLocalization({
  defaultLanguage: 'en',
  // Optional: load locale data from your server
  l10nUrl: (lang) => `/locales/${lang}.json`,
  // Optional: load translations from your server
  i18nUrl: (lang) => `/i18n/${lang}.json`,
}));

app.mount('#app');
```

The `defaultLanguage` is loaded automatically on startup using the browser's `Intl` API as a data source. No JSON files are needed for basic formatting -- the system derives number separators, date patterns, currency symbols, and more directly from `Intl`.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultLanguage` | `string` | `'en'` | Initial language code |
| `l10nUrl` | `(lang: string) => string` | `undefined` | URL builder for locale data JSON (overrides Intl defaults) |
| `i18nUrl` | `(lang: string) => string` | `undefined` | URL builder for translation JSON |
| `timezoneProviders` | `CoarTimezoneProvider[]` | `[]` | Custom timezone providers (checked before browser default) |

## Changing Language at Runtime

Use the service directly to switch languages. Data is loaded on demand and cached.

```ts
import { useLocalization } from '@cocoar/vue-localization';

const service = useLocalization()!;

// Switch language (loads locale data + translations if not cached)
await service.setLanguage('de');

// Preload without switching (useful for instant switching later)
await service.preloadLanguage('fr');

// Force reload from all sources (e.g. after server-side data changes)
await service.reloadLanguage();
```

## Service API

The `useLocalization()` composable returns the full `CoarLocalizationService` instance for advanced use cases.

| Method / Property | Type | Description |
|-------------------|------|-------------|
| `language` | `Ref<string>` | Current language (reactive) |
| `loading` | `Ref<boolean>` | Whether data is currently being loaded |
| `localeData` | `ComputedRef<CoarLocalizationData \| undefined>` | Locale data for the current language |
| `setLanguage(lang)` | `(string) => Promise<void>` | Switch language and load data |
| `preloadLanguage(lang)` | `(string) => Promise<void>` | Preload data without switching |
| `reloadLanguage(lang?)` | `(string?) => Promise<void>` | Force reload data from all sources |
| `t(key, params?, fallback?)` | `(string, Record?, string?) => string` | Translate a key |
| `getDefaultLanguage()` | `() => string` | Get the configured default language |
| `i18nStore` | `CoarTranslationStore` | Direct access to the translation store |
| `l10nStore` | `CoarLocalizationDataStore` | Direct access to the locale data store |
| `timezoneService` | `CoarTimezoneService` | Direct access to the timezone service |
| `addLocaleDataSource(source)` | `(CoarLocaleDataSource) => void` | Add a custom locale data source |
| `addTranslationSource(source)` | `(CoarTranslationSource) => void` | Add a custom translation source |
