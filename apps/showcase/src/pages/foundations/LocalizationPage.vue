<script setup lang="ts">
import { ref } from 'vue';
import { CoarCard, CoarCodeBlock, CoarNote } from '@cocoar/vue-ui';

const codeInstall = `pnpm add @cocoar/vue-localization`;

const codeSetup = `// main.ts
import { createApp } from 'vue';
import { CoarLocalizationPlugin } from '@cocoar/vue-localization';

createApp(App)
  .use(CoarLocalizationPlugin, {
    locale: 'en-US',
    timezone: 'America/New_York',
  })
  .mount('#app');`;

const codeUseLocale = `<script setup lang="ts">
import { useLocale } from '@cocoar/vue-localization';

const { locale, setLocale } = useLocale();

function switchToGerman() {
  setLocale('de-DE');
}
<\/script>`;

const codeUseTimezone = `<script setup lang="ts">
import { useTimezone } from '@cocoar/vue-localization';

const { timezone, setTimezone } = useTimezone();

// e.g. 'Europe/Berlin', 'America/New_York', 'UTC'
console.log(timezone.value);
<\/script>`;

const codeTranslations = `// translations/en.ts
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
};`;

const codeUseTranslation = `<script setup lang="ts">
import { useTranslation } from '@cocoar/vue-localization';

const { t } = useTranslation();
<\/script>

<template>
  <CoarButton>{{ t('common.save') }}</CoarButton>
  <span>{{ t('errors.required') }}</span>
</template>`;

const supportedLocales = [
  { code: 'en-US', name: 'English (US)', dateFormat: 'MM/DD/YYYY', timeFormat: '12-hour' },
  { code: 'en-GB', name: 'English (UK)', dateFormat: 'DD/MM/YYYY', timeFormat: '24-hour' },
  { code: 'de-DE', name: 'German', dateFormat: 'DD.MM.YYYY', timeFormat: '24-hour' },
  { code: 'fr-FR', name: 'French', dateFormat: 'DD/MM/YYYY', timeFormat: '24-hour' },
  { code: 'ja-JP', name: 'Japanese', dateFormat: 'YYYY/MM/DD', timeFormat: '24-hour' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', dateFormat: 'YYYY/MM/DD', timeFormat: '24-hour' },
];
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Localization</h1>
      <p class="page-description">
        Complete localization system covering translations (i18n) and locale formatting (l10n) for Vue 3 applications.
        Provided by the optional <code>@cocoar/vue-localization</code> package.
      </p>
    </header>

    <div class="examples-content">
      <h2 class="component-section-title">Installation</h2>

      <div class="examples-grid">
        <CoarCard elevated variant="info">
          <h3>Package</h3>
          <p class="example-description">
            The localization package is separate from <code>@cocoar/vue-ui</code> to keep the core bundle lean.
          </p>
          <CoarCodeBlock :code="codeInstall" language="bash" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated variant="info">
          <h3>Plugin Setup</h3>
          <p class="example-description">Register the plugin in your app entry point with your default locale and timezone.</p>
          <CoarCodeBlock :code="codeSetup" language="typescript" :collapsible="false" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">Composables</h2>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>useLocale</h3>
          <p class="example-description">Access and change the current locale at runtime.</p>
          <CoarCodeBlock :code="codeUseLocale" language="typescript" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>useTimezone</h3>
          <p class="example-description">Access and change the current timezone. Used by date/time picker components automatically.</p>
          <CoarCodeBlock :code="codeUseTimezone" language="typescript" :collapsible="false" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">Translations (i18n)</h2>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Define Translations</h3>
          <p class="example-description">Create translation objects for each supported locale.</p>
          <CoarCodeBlock :code="codeTranslations" language="typescript" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Use in Components</h3>
          <p class="example-description">Use the <code>useTranslation</code> composable and the <code>t()</code> function in templates.</p>
          <CoarCodeBlock :code="codeUseTranslation" language="typescript" :collapsible="false" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">Supported Locales & Formats</h2>
      <p class="component-section-description">
        Date/time components use <code>Intl.DateTimeFormat</code> automatically based on the current locale.
      </p>

      <div class="examples-grid">
        <CoarCard elevated>
          <table class="api-table">
            <thead>
              <tr>
                <th>Locale</th>
                <th>Name</th>
                <th>Date Format</th>
                <th>Time Format</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="locale in supportedLocales" :key="locale.code">
                <td><code>{{ locale.code }}</code></td>
                <td>{{ locale.name }}</td>
                <td>{{ locale.dateFormat }}</td>
                <td>{{ locale.timeFormat }}</td>
              </tr>
            </tbody>
          </table>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="margin-top: var(--coar-spacing-l)">
        <strong>Date/Time Integration:</strong> The <code>CoarPlainDatePicker</code>, <code>CoarPlainDateTimePicker</code>, and
        <code>CoarZonedDateTimePicker</code> components automatically use the locale from <code>useLocale()</code> for
        date format detection (12h vs 24h) and display formatting.
      </CoarNote>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}

code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}
</style>
