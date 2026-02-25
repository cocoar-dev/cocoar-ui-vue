import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref, computed, onMounted } from 'vue';
import {
  CoarLocalizationService,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
} from '@cocoar/vue-localization';

const LocalizationDemo = defineComponent({
  name: 'LocalizationDemo',
  setup() {
    const service = new CoarLocalizationService({ defaultLanguage: 'en' });
    const languages = ['en', 'en-US', 'en-GB', 'de', 'de-AT', 'fr', 'es', 'ja', 'zh-CN', 'ar', 'pt-BR'];
    const selectedLanguage = ref('en');
    const loading = ref(false);

    const localeData = computed(() => service.l10nStore.getLocaleData(selectedLanguage.value));

    const sampleNumber = 1234567.89;
    const sampleDate = new Date(2024, 11, 25, 14, 30); // Dec 25, 2024 2:30 PM
    const samplePercent = 0.8567;
    const sampleCurrency = 49999.99;

    async function switchLanguage(lang: string) {
      loading.value = true;
      await service.setLanguage(lang);
      selectedLanguage.value = lang;
      loading.value = false;
    }

    onMounted(() => switchLanguage('en'));

    // i18n demo
    const translations: Record<string, Record<string, string>> = {
      en: { 'app.greeting': 'Hello, {name}!', 'app.items': '{count} items found', 'app.welcome': 'Welcome to our application' },
      de: { 'app.greeting': 'Hallo, {name}!', 'app.items': '{count} Einträge gefunden', 'app.welcome': 'Willkommen in unserer Anwendung' },
      fr: { 'app.greeting': 'Bonjour, {name} !', 'app.items': '{count} éléments trouvés', 'app.welcome': 'Bienvenue dans notre application' },
      es: { 'app.greeting': '¡Hola, {name}!', 'app.items': '{count} elementos encontrados', 'app.welcome': 'Bienvenido a nuestra aplicación' },
      ja: { 'app.greeting': 'こんにちは、{name}さん！', 'app.items': '{count}件見つかりました', 'app.welcome': 'アプリケーションへようこそ' },
    };

    function getTranslation(key: string, params?: Record<string, unknown>): string {
      const lang = selectedLanguage.value;
      const baseLang = lang.split('-')[0];
      const dict = translations[lang] ?? translations[baseLang] ?? translations['en'];
      let template = dict[key] ?? key;
      if (params) {
        template = template.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
      }
      return template;
    }

    return {
      languages, selectedLanguage, loading, localeData,
      sampleNumber, sampleDate, samplePercent, sampleCurrency,
      switchLanguage, getTranslation, formatNumber, formatCurrency, formatPercent, formatDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
  template: `
    <div style="max-width: 900px; font-family: var(--coar-font-family);">
      <h1 style="margin: 0 0 8px; font-size: 28px; color: var(--coar-text-neutral-primary);">Localization</h1>
      <p style="margin: 0 0 24px; color: var(--coar-text-neutral-secondary); line-height: 1.5;">
        The <code style="background: var(--coar-background-neutral-tertiary); padding: 2px 6px; border-radius: 4px;">@cocoar/vue-localization</code> package provides
        three pillars: <strong>L10n</strong> (locale-aware formatting), <strong>i18n</strong> (translations), and <strong>Timezone</strong> management.
      </p>

      <!-- Language Selector -->
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; margin: 0 0 12px; color: var(--coar-text-neutral-primary);">Language Selector</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button
            v-for="lang in languages"
            :key="lang"
            @click="switchLanguage(lang)"
            :style="{
              padding: '6px 14px',
              borderRadius: '6px',
              border: selectedLanguage === lang ? '2px solid var(--coar-border-accent)' : '1px solid var(--coar-border-neutral-primary)',
              background: selectedLanguage === lang ? 'var(--coar-background-accent-tertiary)' : 'var(--coar-background-neutral-secondary)',
              color: selectedLanguage === lang ? 'var(--coar-text-accent-primary)' : 'var(--coar-text-neutral-primary)',
              cursor: 'pointer',
              fontWeight: selectedLanguage === lang ? '600' : '400',
              fontSize: '14px',
              fontFamily: 'var(--coar-font-family)',
              transition: 'all 0.15s ease',
            }"
          >
            {{ lang }}
          </button>
        </div>
        <p v-if="loading" style="color: var(--coar-text-neutral-secondary); margin-top: 8px; font-size: 13px;">Loading locale data…</p>
      </div>

      <!-- L10n: Number & Currency Formatting -->
      <div v-if="localeData" style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; margin: 0 0 16px; color: var(--coar-text-neutral-primary);">L10n — Formatting</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Number</div>
            <div style="font-size: 22px; font-weight: 600; color: var(--coar-text-neutral-primary);">{{ formatNumber(sampleNumber, localeData.number, 2) }}</div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">decimal: "{{ localeData.number.decimal }}" · group: "{{ localeData.number.group }}"</div>
          </div>
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Currency</div>
            <div style="font-size: 22px; font-weight: 600; color: var(--coar-text-neutral-primary);">{{ formatCurrency(sampleCurrency, localeData) }}</div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">{{ localeData.currency.default }} · {{ localeData.currency.position }} · spacing: {{ localeData.currency.spacing }}</div>
          </div>
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Percent</div>
            <div style="font-size: 22px; font-weight: 600; color: var(--coar-text-neutral-primary);">{{ formatPercent(samplePercent, localeData) }}</div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">spacing: {{ localeData.percent.spacing }}</div>
          </div>
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Date</div>
            <div style="font-size: 22px; font-weight: 600; color: var(--coar-text-neutral-primary);">{{ formatDate(sampleDate, localeData.date) }}</div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">pattern: {{ localeData.date.pattern }}</div>
          </div>
        </div>
      </div>

      <!-- Date Locale Details -->
      <div v-if="localeData" style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; margin: 0 0 16px; color: var(--coar-text-neutral-primary);">Date Locale Details</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Month Names</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <span
                v-for="(m, i) in localeData.date.monthNamesShort"
                :key="i"
                style="padding: 3px 8px; border-radius: 4px; background: var(--coar-background-neutral-tertiary); font-size: 13px; color: var(--coar-text-neutral-primary);"
              >{{ m }}</span>
            </div>
          </div>
          <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--coar-text-neutral-tertiary); margin-bottom: 8px;">Day Names</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <span
                v-for="(d, i) in localeData.date.dayNamesShort"
                :key="i"
                :style="{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: i === localeData.date.firstDayOfWeek ? 'var(--coar-background-accent-tertiary)' : 'var(--coar-background-neutral-tertiary)',
                  fontWeight: i === localeData.date.firstDayOfWeek ? '600' : '400',
                  fontSize: '13px',
                  color: i === localeData.date.firstDayOfWeek ? 'var(--coar-text-accent-primary)' : 'var(--coar-text-neutral-primary)',
                }"
              >{{ d }}</span>
            </div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary); margin-top: 8px;">
              First day of week: <strong>{{ localeData.date.dayNames[localeData.date.firstDayOfWeek] }}</strong> · AM/PM: {{ localeData.date.amPm.join(' / ') }}
            </div>
          </div>
        </div>
      </div>

      <!-- i18n Translations -->
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; margin: 0 0 16px; color: var(--coar-text-neutral-primary);">i18n — Translations</h2>
        <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary);">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-tertiary); font-weight: 500; font-size: 12px; text-transform: uppercase;">Key</th>
                <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-tertiary); font-weight: 500; font-size: 12px; text-transform: uppercase;">Translation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-secondary); font-family: monospace; font-size: 13px;">app.welcome</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-primary);">{{ getTranslation('app.welcome') }}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-secondary); font-family: monospace; font-size: 13px;">app.greeting</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid var(--coar-border-neutral-primary); color: var(--coar-text-neutral-primary);">{{ getTranslation('app.greeting', { name: 'Alice' }) }}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: var(--coar-text-neutral-secondary); font-family: monospace; font-size: 13px;">app.items</td>
                <td style="padding: 8px 12px; color: var(--coar-text-neutral-primary);">{{ getTranslation('app.items', { count: 42 }) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Timezone -->
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; margin: 0 0 16px; color: var(--coar-text-neutral-primary);">Timezone</h2>
        <div style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-secondary); border: 1px solid var(--coar-border-neutral-primary); display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">🌍</span>
          <div>
            <div style="font-size: 16px; font-weight: 600; color: var(--coar-text-neutral-primary);">{{ timezone }}</div>
            <div style="font-size: 12px; color: var(--coar-text-neutral-tertiary);">Detected from browser via Intl API · Pluggable providers supported</div>
          </div>
        </div>
      </div>

      <!-- Usage Code -->
      <div>
        <h2 style="font-size: 18px; margin: 0 0 16px; color: var(--coar-text-neutral-primary);">Usage</h2>
        <pre style="padding: 16px; border-radius: 8px; background: var(--coar-background-neutral-tertiary); border: 1px solid var(--coar-border-neutral-primary); overflow-x: auto; font-size: 13px; line-height: 1.6; color: var(--coar-text-neutral-primary);"><code>// Setup
import { createCoarLocalization } from '@cocoar/vue-localization';

app.use(createCoarLocalization({
  defaultLanguage: 'en',
  i18nUrl: (lang) => \`/i18n/\${lang}.json\`,
}));

// In components
const { fmtNumber, fmtCurrency, fmtDate, localeData } = useL10n();
const { t, tRef } = useI18n();
const { timezone } = useTimezone();</code></pre>
      </div>
    </div>
  `,
});

const meta: Meta<typeof LocalizationDemo> = {
  title: 'Foundations/Localization',
  component: LocalizationDemo,
};

export default meta;
type Story = StoryObj<typeof LocalizationDemo>;

export const Localization: Story = {};
