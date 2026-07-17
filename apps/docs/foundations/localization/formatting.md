---
description: "Locale-aware number, currency, percent, and date formatting via the useL10n() composable from @cocoar/vue-localization, reacting to language changes."
---

<script setup>
import NumberFormatter from './demos/NumberFormatter.vue';
import DateFormatter from './demos/DateFormatter.vue';
import RegionalDemo from './demos/RegionalDemo.vue';
</script>

# Formatting

Locale-aware formatting for numbers, currencies, percentages, and dates. All formatters react to language changes automatically via the `useL10n()` composable from `@cocoar/vue-localization`.

## Number and Currency Formatting

Toggle between locales to see how separators, grouping, and currency symbols adapt.

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
