<template>
  <div class="demo">
    <div class="tz-card">
      <div class="tz-row">
        <span class="tz-label">Detected timezone</span>
        <code class="tz-value">{{ timezone }}</code>
      </div>
      <div class="tz-row">
        <span class="tz-label">UTC offset</span>
        <code class="tz-value">{{ utcOffset }}</code>
      </div>
      <div class="tz-row">
        <span class="tz-label">Current time</span>
        <code class="tz-value">{{ currentTime }}</code>
      </div>
    </div>

    <button class="refresh-btn" @click="onRefresh">
      Refresh timezone
    </button>

    <p class="tz-note">
      The timezone is auto-detected from your browser using <code>Intl.DateTimeFormat</code>.
      Call <code>refresh()</code> to re-detect if it changes (e.g. VPN or system settings update).
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useTimezone } from '@cocoar/vue-localization';

const { timezone, refresh } = useTimezone();

const now = ref(new Date());
let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

const utcOffset = computed(() => {
  const offset = now.value.getTimezoneOffset();
  const sign = offset <= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const mins = String(Math.abs(offset) % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
});

const currentTime = computed(() => {
  return now.value.toLocaleTimeString('en-GB', {
    timeZone: timezone.value,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
});

function onRefresh() {
  refresh();
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tz-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-primary);
  background: var(--coar-bg-neutral-primary);
}

.tz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tz-label {
  font-size: 14px;
  color: var(--coar-text-neutral-secondary);
}

.tz-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--coar-text-accent-primary);
}

.refresh-btn {
  align-self: flex-start;
  padding: 6px 14px;
  border: 1px solid var(--coar-border-neutral-primary);
  border-radius: 6px;
  background: var(--coar-bg-neutral-primary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.refresh-btn:hover {
  border-color: var(--coar-border-accent-primary);
  color: var(--coar-text-accent-primary);
}

.tz-note {
  font-size: 13px;
  color: var(--coar-text-neutral-tertiary);
  margin: 0;
  line-height: 1.5;
}
</style>
