<script setup lang="ts">
/**
 * A deliberately feature-rich, INTERACTIVE component used to prove the markdown
 * custom-embed mechanism end-to-end. It knows nothing about markdown — it's a
 * plain component with normal props, registered into the embed registry from
 * outside (exactly how a consumer like Tellify would register a real Map).
 *
 * Receives the `:::demo{...}` directive attributes as props (all strings, since
 * directive attrs are strings). Local interactive state (tab, counter, toggle)
 * lives here, so you can SEE it's a live component in both the editor preview
 * and the viewer — not a static image.
 */
import { computed, ref } from 'vue';
import { CoarButton, CoarBadge, CoarSwitch } from '@cocoar/vue-ui';

const props = withDefaults(
  defineProps<{
    title?: string;
    accent?: string;
    metric?: string;
    trend?: string;
  }>(),
  {
    title: 'Embed',
    accent: '#6366f1',
    metric: '1,284',
    trend: '+12.4%',
  },
);

type Tab = 'overview' | 'breakdown' | 'activity';
const tab = ref<Tab>('overview');
const count = ref(0);
const live = ref(true);

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'activity', label: 'Activity' },
];

// Deterministic bar heights derived from the title, so different embeds look
// distinct without any external data.
const bars = computed(() => {
  let seed = 0;
  for (const ch of `${props.title}`) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  return Array.from({ length: 12 }, (_, i) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return 24 + ((seed >> 8) % 76);
  });
});

const rows = [
  { label: 'Direct', value: '38%' },
  { label: 'Referral', value: '24%' },
  { label: 'Organic', value: '21%' },
  { label: 'Social', value: '17%' },
];

const activity = [
  'Deployed v2.12.0 to staging',
  'Merged PR #18 — embed registry',
  'Closed 3 issues in triage',
  'Added DemoEmbed to playground',
];
</script>

<template>
  <div class="demo-embed" :style="{ '--accent': accent }">
    <header class="demo-embed__head">
      <div class="demo-embed__title-wrap">
        <span class="demo-embed__dot" />
        <h3 class="demo-embed__title">{{ title }}</h3>
        <CoarBadge v-if="live" variant="success" :content="'LIVE'" />
      </div>
      <div class="demo-embed__metric">
        <span class="demo-embed__metric-value">{{ metric }}</span>
        <span class="demo-embed__metric-trend">{{ trend }}</span>
      </div>
    </header>

    <nav class="demo-embed__tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        :class="['demo-embed__tab', { 'demo-embed__tab--active': tab === t.id }]"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <section class="demo-embed__body">
      <div v-if="tab === 'overview'" class="demo-embed__chart" role="img" aria-label="Bar chart">
        <div
          v-for="(h, i) in bars"
          :key="i"
          class="demo-embed__bar"
          :style="{ height: `${h}%` }"
        />
      </div>

      <table v-else-if="tab === 'breakdown'" class="demo-embed__table">
        <tbody>
          <tr v-for="r in rows" :key="r.label">
            <td>{{ r.label }}</td>
            <td>
              <div class="demo-embed__track">
                <div class="demo-embed__fill" :style="{ width: r.value }" />
              </div>
            </td>
            <td class="demo-embed__pct">{{ r.value }}</td>
          </tr>
        </tbody>
      </table>

      <ul v-else class="demo-embed__activity">
        <li v-for="(a, i) in activity" :key="i">
          <span class="demo-embed__bullet" />{{ a }}
        </li>
      </ul>
    </section>

    <footer class="demo-embed__foot">
      <CoarButton size="s" variant="secondary" @click="count++">
        Interact +1
      </CoarButton>
      <span class="demo-embed__count">clicks: <strong>{{ count }}</strong></span>
      <label class="demo-embed__live">
        <CoarSwitch v-model="live" size="s" /> live badge
      </label>
    </footer>
  </div>
</template>

<style scoped>
.demo-embed {
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: 12px;
  padding: 16px;
  background: var(--coar-background-neutral-primary, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  font-size: 13px;
}

.demo-embed__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.demo-embed__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-embed__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

.demo-embed__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.demo-embed__metric {
  text-align: right;
  line-height: 1.1;
}
.demo-embed__metric-value {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.demo-embed__metric-trend {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--coar-text-success, #16a34a);
}

.demo-embed__tabs {
  display: flex;
  gap: 4px;
  margin: 14px 0 12px;
  border-bottom: 1px solid var(--coar-border-neutral, #ededed);
}
.demo-embed__tab {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 10px;
  font: inherit;
  font-weight: 600;
  color: var(--coar-text-neutral-secondary, #777);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.demo-embed__tab--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.demo-embed__body {
  min-height: 116px;
}

.demo-embed__chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 116px;
}
.demo-embed__bar {
  flex: 1;
  background: linear-gradient(var(--accent), color-mix(in srgb, var(--accent) 45%, white));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}

.demo-embed__table {
  width: 100%;
  border-collapse: collapse;
}
.demo-embed__table td {
  padding: 6px 8px 6px 0;
  vertical-align: middle;
}
.demo-embed__table td:first-child {
  width: 90px;
  font-weight: 600;
}
.demo-embed__track {
  height: 8px;
  border-radius: 4px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  overflow: hidden;
}
.demo-embed__fill {
  height: 100%;
  background: var(--accent);
}
.demo-embed__pct {
  width: 44px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary, #777);
}

.demo-embed__activity {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.demo-embed__activity li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.demo-embed__bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.demo-embed__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--coar-border-neutral, #ededed);
}
.demo-embed__count {
  color: var(--coar-text-neutral-secondary, #777);
}
.demo-embed__live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--coar-text-neutral-secondary, #777);
  cursor: pointer;
}
</style>
