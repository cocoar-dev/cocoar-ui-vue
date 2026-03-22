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
