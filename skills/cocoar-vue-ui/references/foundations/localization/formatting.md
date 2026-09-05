<!-- Generated from apps/docs/foundations/localization/formatting.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Formatting

Locale-aware formatting for numbers, currencies, percentages, and dates. All formatters react to language changes automatically via the `useL10n()` composable from `@cocoar/vue-localization`.

## Number and Currency Formatting

Toggle between locales to see how separators, grouping, and currency symbols adapt.

**Demo — `localization/demos/NumberFormatter.vue`**

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

    <table class="format-table">
      <thead>
        <tr>
          <th>Format</th>
          <th>Input</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>fmtNumber</code></td>
          <td>1234567.89</td>
          <td class="output">{{ fmtNumber(1234567.89) }}</td>
        </tr>
        <tr>
          <td><code>fmtNumber</code> (0 decimals)</td>
          <td>1234567.89</td>
          <td class="output">{{ fmtNumber(1234567.89, 0) }}</td>
        </tr>
        <tr>
          <td><code>fmtCurrency</code></td>
          <td>9999.99</td>
          <td class="output">{{ fmtCurrency(9999.99) }}</td>
        </tr>
        <tr>
          <td><code>fmtCurrency</code> (EUR)</td>
          <td>9999.99</td>
          <td class="output">{{ fmtCurrency(9999.99, 'EUR') }}</td>
        </tr>
        <tr>
          <td><code>fmtPercent</code></td>
          <td>0.256</td>
          <td class="output">{{ fmtPercent(0.256) }}</td>
        </tr>
        <tr>
          <td><code>fmtPercent</code> (2 decimals)</td>
          <td>0.256</td>
          <td class="output">{{ fmtPercent(0.256, 2) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="locale-note">
      Current language: <code>{{ language }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocalization, useL10n } from '@cocoar/vue-localization';

const service = useLocalization()!;
const { language, fmtNumber, fmtCurrency, fmtPercent } = useL10n();

const locales = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Francais' },
  { code: 'ja', label: 'Japanese' },
];

const currentLocale = ref('en');

onMounted(() => {
  service.setLanguage('en');
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

.format-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.format-table th,
.format-table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--coar-border-neutral-primary);
}

.format-table th {
  font-weight: 600;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.output {
  font-family: monospace;
  font-weight: 600;
  color: var(--coar-text-accent-primary);
}

.locale-note {
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
  margin: 0;
}
</style>
```

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

**Demo — `localization/demos/DateFormatter.vue`**

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

    <table class="format-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Date only</td>
          <td class="output">{{ fmtDate(sampleDate) }}</td>
        </tr>
        <tr>
          <td>Date + time</td>
          <td class="output">{{ fmtDate(sampleDate, true) }}</td>
        </tr>
        <tr>
          <td>From ISO string</td>
          <td class="output">{{ fmtDate('2025-12-31T23:59:00') }}</td>
        </tr>
      </tbody>
    </table>

    <div class="locale-details" v-if="localeData">
      <div class="detail-row">
        <span class="detail-label">Pattern:</span>
        <code>{{ localeData.date.pattern }}</code>
      </div>
      <div class="detail-row">
        <span class="detail-label">Decimal separator:</span>
        <code>{{ localeData.number.decimal }}</code>
      </div>
      <div class="detail-row">
        <span class="detail-label">Group separator:</span>
        <code>"{{ localeData.number.group }}"</code>
      </div>
      <div class="detail-row">
        <span class="detail-label">Default currency:</span>
        <code>{{ localeData.currency.default }}</code>
      </div>
      <div class="detail-row">
        <span class="detail-label">First day of week:</span>
        <code>{{ localeData.date.dayNames[localeData.date.firstDayOfWeek] }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocalization, useL10n } from '@cocoar/vue-localization';

const service = useLocalization()!;
const { fmtDate, localeData } = useL10n();

const sampleDate = new Date(2025, 2, 22, 14, 30);

const locales = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Francais' },
  { code: 'ja', label: 'Japanese' },
];

const currentLocale = ref('en');

onMounted(() => {
  service.setLanguage('en');
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

.format-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.format-table th,
.format-table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--coar-border-neutral-primary);
}

.format-table th {
  font-weight: 600;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.output {
  font-family: monospace;
  font-weight: 600;
  color: var(--coar-text-accent-primary);
}

.locale-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: var(--coar-bg-neutral-secondary);
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  color: var(--coar-text-neutral-secondary);
  min-width: 140px;
}
</style>
```

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

**Demo — `localization/demos/RegionalDemo.vue`**

```vue
<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
      <button
        v-for="loc in locales"
        :key="loc.code"
        style="padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.15s;"
        :style="{
          background: current === loc.code ? 'var(--coar-background-accent-primary)' : 'var(--coar-background-neutral-secondary)',
          color: current === loc.code ? '#fff' : 'var(--coar-text-neutral-primary)',
          border: 'none',
        }"
        @click="switchTo(loc.code)"
      >
        {{ loc.label }}
      </button>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-tertiary); color: var(--coar-text-neutral-tertiary); font-weight: 600; text-transform: uppercase; font-size: 11px;">What</th>
          <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-tertiary); color: var(--coar-text-neutral-tertiary); font-weight: 600; text-transform: uppercase; font-size: 11px;">Output</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Number (1234567.89)</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ fmtNumber(1234567.89) }}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Currency (9999.99)</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ fmtCurrency(9999.99) }}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Date</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ fmtDate(new Date()) }}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Date pattern</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ localeData?.date?.pattern || '—' }}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Default currency</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ localeData?.currency?.default || '—' }}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary);">Decimal separator</td>
          <td style="padding: 8px 12px; font-family: var(--coar-font-family-mono, monospace); color: var(--coar-text-accent-primary);">{{ localeData?.number?.decimal || '—' }}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin-top: 12px; font-size: 12px; color: var(--coar-text-neutral-tertiary);">
      Notice how <strong>de-DE</strong> and <strong>de-AT</strong> share the same language but differ in currency (EUR vs EUR with different formatting).
      The system loads the base locale (<code>de</code>) first, then merges regional overrides on top.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useL10n, useLocalization } from '@cocoar/vue-localization';

const service = useLocalization()!;
const { fmtNumber, fmtCurrency, fmtDate, localeData } = useL10n();

const locales = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'de-DE', label: 'Deutsch (DE)' },
  { code: 'de-AT', label: 'Deutsch (AT)' },
  { code: 'fr-FR', label: 'Français (FR)' },
  { code: 'fr-CH', label: 'Français (CH)' },
];

const current = ref('en-US');

onMounted(() => {
  service.setLanguage('en-US');
});

async function switchTo(code: string) {
  current.value = code;
  await service.setLanguage(code);
}
</script>
```

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

> **Tip**
>
> You typically do not need to provide locale JSON files. The built-in `IntlLocaleDataSource` derives all of this from the browser's `Intl` API. HTTP sources are useful when you need to override specific values (e.g. custom currency symbols or non-standard grouping).
