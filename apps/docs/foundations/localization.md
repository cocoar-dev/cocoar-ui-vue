# Localization

Complete localization system covering translations (i18n) and locale formatting (l10n) for Vue 3 applications.
Provided by the optional `@cocoar/vue-localization` package.

## Installation

The localization package is separate from `@cocoar/vue-ui` to keep the core bundle lean.

```bash
pnpm add @cocoar/vue-localization
```

### Plugin Setup

Register the plugin in your app entry point with your default locale and timezone.

```ts
// main.ts
import { createApp } from 'vue';
import { CoarLocalizationPlugin } from '@cocoar/vue-localization';

createApp(App)
  .use(CoarLocalizationPlugin, {
    locale: 'en-US',
    timezone: 'America/New_York',
  })
  .mount('#app');
```

## Composables

### useLocale

Access and change the current locale at runtime.

```vue
<script setup lang="ts">
import { useLocale } from '@cocoar/vue-localization';

const { locale, setLocale } = useLocale();

function switchToGerman() {
  setLocale('de-DE');
}
</script>
```

### useTimezone

Access and change the current timezone. Used by date/time picker components automatically.

```vue
<script setup lang="ts">
import { useTimezone } from '@cocoar/vue-localization';

const { timezone, setTimezone } = useTimezone();

// e.g. 'Europe/Berlin', 'America/New_York', 'UTC'
console.log(timezone.value);
</script>
```

## Translations (i18n)

### Define Translations

Create translation objects for each supported locale.

```ts
// translations/en.ts
export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
  },
  errors: {
    required: 'This field is required',
    invalid: 'Invalid value',
  },
};

// translations/de.ts
export const de = {
  common: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    loading: 'Laden...',
  },
  errors: {
    required: 'Pflichtfeld',
    invalid: 'Ungültiger Wert',
  },
};
```

### Use in Components

Use the `useTranslation` composable and the `t()` function in templates.

```vue
<script setup lang="ts">
import { useTranslation } from '@cocoar/vue-localization';

const { t } = useTranslation();
</script>

<template>
  <CoarButton>{{ t('common.save') }}</CoarButton>
  <span>{{ t('errors.required') }}</span>
</template>
```

## Supported Locales & Formats

Date/time components use `Intl.DateTimeFormat` automatically based on the current locale.

| Locale | Name | Date Format | Time Format |
|--------|------|-------------|-------------|
| `en-US` | English (US) | MM/DD/YYYY | 12-hour |
| `en-GB` | English (UK) | DD/MM/YYYY | 24-hour |
| `de-DE` | German | DD.MM.YYYY | 24-hour |
| `fr-FR` | French | DD/MM/YYYY | 24-hour |
| `ja-JP` | Japanese | YYYY/MM/DD | 24-hour |
| `zh-CN` | Chinese (Simplified) | YYYY/MM/DD | 24-hour |

::: info Date/Time Integration
The `CoarPlainDatePicker`, `CoarPlainDateTimePicker`, and `CoarZonedDateTimePicker` components automatically use the locale from `useLocale()` for date format detection (12h vs 24h) and display formatting.
:::
