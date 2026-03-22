<script setup>
import NumberFormatter from './localization/demos/NumberFormatter.vue';
import DateFormatter from './localization/demos/DateFormatter.vue';
import TranslationDemo from './localization/demos/TranslationDemo.vue';
import TimezoneDemo from './localization/demos/TimezoneDemo.vue';
import RegionalDemo from './localization/demos/RegionalDemo.vue';
</script>

# Localization

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

## Number and Currency Formatting

The `useL10n()` composable provides locale-aware formatting for numbers, currencies, and percentages. All formatters react to language changes automatically. Toggle between locales to see how separators, grouping, and currency symbols adapt.

<NumberFormatter />

### Usage

```vue
<script setup lang="ts">
import { useL10n } from '@cocoar/vue-localization';

const { language, fmtNumber, fmtCurrency, fmtPercent } = useL10n();
</script>

<template>
  <p>{{ fmtNumber(1234567.89) }}</p>       <!-- "1,234,567.89" in en -->
  <p>{{ fmtNumber(1234567.89, 0) }}</p>    <!-- "1,234,568" in en -->
  <p>{{ fmtCurrency(9999.99) }}</p>         <!-- "$9,999.99" in en -->
  <p>{{ fmtCurrency(9999.99, 'EUR') }}</p>  <!-- "EUR9,999.99" in en -->
  <p>{{ fmtPercent(0.256) }}</p>            <!-- "26%" in en -->
  <p>{{ fmtPercent(0.256, 2) }}</p>         <!-- "25.60%" in en -->
</template>
```

### `useL10n()` API

| Property | Type | Description |
|----------|------|-------------|
| `language` | `Ref<string>` | Current language (reactive) |
| `localeData` | `ComputedRef<CoarLocalizationData \| undefined>` | Full locale data for the current language |
| `fmtNumber(value, decimals?)` | `(number, number?) => string` | Format a number with locale separators |
| `fmtCurrency(value, currencyCode?)` | `(number, string?) => string` | Format as currency (defaults to locale's currency) |
| `fmtPercent(value, decimals?)` | `(number, number?) => string` | Format as percentage (0.25 becomes "25%") |
| `fmtDate(value, includeTime?)` | `(Date \| string, boolean?) => string` | Format a date (optionally with time) |

## Date Formatting

Dates are formatted according to the locale's date pattern. The system detects whether the locale uses `dd/mm/yyyy`, `mm/dd/yyyy`, `dd.mm.yyyy`, or `yyyy-mm-dd` from the browser's `Intl` API. Switch locales to see both the formatted output and the underlying locale metadata.

<DateFormatter />

### Usage

```vue
<script setup lang="ts">
import { useL10n } from '@cocoar/vue-localization';

const { fmtDate } = useL10n();
</script>

<template>
  <p>{{ fmtDate(new Date()) }}</p>                   <!-- date only -->
  <p>{{ fmtDate(new Date(), true) }}</p>              <!-- date + time -->
  <p>{{ fmtDate('2025-12-31T23:59:00') }}</p>         <!-- from ISO string -->
</template>
```

## Regional Locales

Same language, different region — `en-US` vs `en-GB`, `de-DE` vs `de-AT`, `fr-FR` vs `fr-CH`. The system loads the base locale first, then merges regional overrides on top. This means currency symbols, date patterns, and number formatting automatically adapt to the user's region without duplicating the entire locale definition.

<RegionalDemo />

## Translations (i18n)

The `useI18n()` composable provides translation lookup with parameter interpolation. Translations can come from HTTP sources (configured via `i18nUrl`) or be registered directly in code using the service's `i18nStore`.

Parameters use `{name}` syntax and are replaced at runtime. Nested translation objects are automatically flattened to dot-separated keys.

<TranslationDemo />

### Usage

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

### Registering Translations in Code

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

### `useI18n()` API

| Property | Type | Description |
|----------|------|-------------|
| `language` | `Ref<string>` | Current language (reactive) |
| `t(key, params?, fallback?)` | `(string, Record?, string?) => string` | Translate a key with optional interpolation |
| `tRef(key, params?, fallback?)` | `(string, Record?, string?) => ComputedRef<string>` | Computed translation that reacts to language changes |

### Translation Fallback Behavior

1. Look up the key in the current language (e.g. `de-AT`)
2. If not found and locale is regional, try the base language (`de`)
3. If still not found, use the provided `fallback` argument
4. If no fallback, return the key itself

## Timezone Detection

The `useTimezone()` composable provides the browser's detected IANA timezone identifier as a reactive ref. The date/time picker components in `@cocoar/vue-ui` use this automatically.

<TimezoneDemo />

### Usage

```vue
<script setup lang="ts">
import { useTimezone } from '@cocoar/vue-localization';

const { timezone, refresh } = useTimezone();

// timezone.value → "Europe/Berlin", "America/New_York", etc.
</script>

<template>
  <p>Your timezone: {{ timezone }}</p>
  <button @click="refresh()">Re-detect</button>
</template>
```

### Custom Timezone Providers

You can supply custom providers (e.g. from a user profile API) that are checked before the browser default.

```ts
import { createCoarLocalization } from '@cocoar/vue-localization';
import type { CoarTimezoneProvider } from '@cocoar/vue-localization';

const userTimezone: CoarTimezoneProvider = {
  getTimezone() {
    // Return from user settings, or null to defer to next provider
    return userStore.timezone ?? null;
  },
};

app.use(createCoarLocalization({
  timezoneProviders: [userTimezone],
}));
```

### `useTimezone()` API

| Property | Type | Description |
|----------|------|-------------|
| `timezone` | `Ref<string>` | Current IANA timezone identifier (reactive) |
| `refresh()` | `() => void` | Re-resolve timezone from providers |

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

## Locale Data Structure

When providing locale data via HTTP (the `l10nUrl` option), the JSON should follow the `CoarLocalizationData` shape:

```json
{
  "code": "de",
  "date": {
    "pattern": "dd.mm.yyyy",
    "firstDayOfWeek": 1,
    "monthNames": ["Januar", "Februar", "..."],
    "monthNamesShort": ["Jan", "Feb", "..."],
    "dayNames": ["Sonntag", "Montag", "..."],
    "dayNamesShort": ["So", "Mo", "..."],
    "amPm": ["AM", "PM"]
  },
  "number": {
    "decimal": ",",
    "group": ".",
    "grouping": [3]
  },
  "currency": {
    "default": "EUR",
    "symbols": { "EUR": "\u20ac", "USD": "$" },
    "position": "after",
    "spacing": true,
    "decimals": 2
  },
  "percent": {
    "symbol": "%",
    "spacing": true,
    "decimals": 0
  }
}
```

::: tip
You typically do not need to provide locale JSON files. The built-in `IntlLocaleDataSource` derives all of this from the browser's `Intl` API. HTTP sources are useful when you need to override specific values (e.g. custom currency symbols or non-standard grouping).
:::
