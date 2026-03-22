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
