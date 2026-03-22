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
