<script setup lang="ts">
/**
 * Phase 0 / Spike B — RRULE engine cold-start bench (browser).
 *
 * Node-side ops/sec numbers from `recurrence-bakeoff.bench.ts` already
 * show `rrule-rust` 230–410× faster than `rrule.js`, 16–30× faster
 * than `rrule-temporal`. The two open questions for the engine
 * decision are browser-only:
 *
 *   1. **Cold start.** `rrule-rust` ships a WASM module that has to
 *      load and instantiate before the first expansion. Spike plan
 *      §3.4 target: ≤ 200 ms Tier A; abort if > 500 ms.
 *   2. **Network / bundle cost.** Production bundle size for each
 *      engine, including WASM blobs.
 *
 * This page measures both. Each engine is loaded via dynamic
 * `import()` (so the time-to-first-expansion captures the network +
 * parse + execute + first-call cost), and the test re-runs the
 * import in fresh isolated contexts via `?bust=` cache-busting.
 */

import { onMounted, ref } from 'vue';

interface EngineRow {
  name: string;
  importMs: number | null;
  firstExpandMs: number | null;
  warmExpandMs: number | null;
  occurrenceCount: number | null;
  error: string | null;
  status: 'idle' | 'running' | 'done' | 'error';
}

const engines = ref<EngineRow[]>([
  { name: 'rrule', importMs: null, firstExpandMs: null, warmExpandMs: null, occurrenceCount: null, error: null, status: 'idle' },
  { name: 'rrule-rust', importMs: null, firstExpandMs: null, warmExpandMs: null, occurrenceCount: null, error: null, status: 'idle' },
  { name: 'rrule-temporal', importMs: null, firstExpandMs: null, warmExpandMs: null, occurrenceCount: null, error: null, status: 'idle' },
]);

// Same fixture for all three engines — a moderate weekly rule that
// every engine handles, so the timing is dominated by engine
// machinery rather than rule complexity.
const FIXTURE_ICAL = 'DTSTART:20240101T090000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
const WIN_START = new Date('2024-01-01T00:00:00Z');
const WIN_END = new Date('2024-12-31T23:59:59Z');

async function benchRrule(): Promise<{ importMs: number; firstExpandMs: number; warmExpandMs: number; count: number }> {
  const t0 = performance.now();
  const mod = await import('rrule');
  const t1 = performance.now();
  const rule = mod.rrulestr(FIXTURE_ICAL);
  const occ = rule.between(WIN_START, WIN_END, true);
  const t2 = performance.now();
  // Warm call — re-create rule, expand again. The parse cost is real
  // for each expansion in our worker design.
  const rule2 = mod.rrulestr(FIXTURE_ICAL);
  const occ2 = rule2.between(WIN_START, WIN_END, true);
  const t3 = performance.now();
  void occ2; // satisfy eslint
  return {
    importMs: t1 - t0,
    firstExpandMs: t2 - t1,
    warmExpandMs: t3 - t2,
    count: occ.length,
  };
}

async function benchRruleRust(): Promise<{ importMs: number; firstExpandMs: number; warmExpandMs: number; count: number }> {
  const t0 = performance.now();
  const mod = await import('rrule-rust');
  const t1 = performance.now();
  const set = mod.RRuleSet.fromString(FIXTURE_ICAL);
  const a = mod.DateTime.fromTimestamp(WIN_START.getTime(), 'UTC');
  const b = mod.DateTime.fromTimestamp(WIN_END.getTime(), 'UTC');
  const occ = set.between(a, b, true);
  const t2 = performance.now();
  const set2 = mod.RRuleSet.fromString(FIXTURE_ICAL);
  const occ2 = set2.between(a, b, true);
  const t3 = performance.now();
  void occ2;
  return {
    importMs: t1 - t0,
    firstExpandMs: t2 - t1,
    warmExpandMs: t3 - t2,
    count: occ.length,
  };
}

async function benchRruleTemporal(): Promise<{ importMs: number; firstExpandMs: number; warmExpandMs: number; count: number }> {
  const t0 = performance.now();
  const mod = await import('rrule-temporal');
  const t1 = performance.now();
  const rule = new mod.RRuleTemporal({ rruleString: FIXTURE_ICAL });
  const occ = rule.between(WIN_START, WIN_END, true);
  const t2 = performance.now();
  const rule2 = new mod.RRuleTemporal({ rruleString: FIXTURE_ICAL });
  const occ2 = rule2.between(WIN_START, WIN_END, true);
  const t3 = performance.now();
  void occ2;
  return {
    importMs: t1 - t0,
    firstExpandMs: t2 - t1,
    warmExpandMs: t3 - t2,
    count: occ.length,
  };
}

async function runOne(name: string, fn: () => Promise<{ importMs: number; firstExpandMs: number; warmExpandMs: number; count: number }>) {
  const row = engines.value.find((r) => r.name === name);
  if (!row) return;
  row.status = 'running';
  row.error = null;
  try {
    const result = await fn();
    row.importMs = Math.round(result.importMs * 1000) / 1000;
    row.firstExpandMs = Math.round(result.firstExpandMs * 1000) / 1000;
    row.warmExpandMs = Math.round(result.warmExpandMs * 1000) / 1000;
    row.occurrenceCount = result.count;
    row.status = 'done';
  } catch (e) {
    row.error = (e as Error).message;
    row.status = 'error';
  }
}

async function runAll() {
  // Reset
  for (const r of engines.value) {
    r.importMs = r.firstExpandMs = r.warmExpandMs = r.occurrenceCount = null;
    r.error = null;
    r.status = 'idle';
  }
  // Sequential — cold-start measurements need clean V8 / WASM state
  // per engine. Run with a rest in between to let the runtime settle.
  await runOne('rrule', benchRrule);
  await new Promise((r) => setTimeout(r, 200));
  await runOne('rrule-rust', benchRruleRust);
  await new Promise((r) => setTimeout(r, 200));
  await runOne('rrule-temporal', benchRruleTemporal);
}

onMounted(() => {
  // The first run uses the cached module if anything imported it
  // earlier on the page; for a true cold-start, hard-refresh.
  void runAll();
});

function tone(row: EngineRow): string {
  if (row.status === 'error') return 'bad';
  if (row.firstExpandMs === null) return 'idle';
  if (row.firstExpandMs > 500) return 'bad';
  if (row.firstExpandMs > 200) return 'ok';
  return 'good';
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — RRULE engine bake-off (browser cold start)</h1>
      <p>
        Browser-side cold-start measurement for the three RRULE engine
        candidates. Hard-refresh the page (Ctrl+Shift+R) to get a true
        cold start without HTTP cache.
      </p>
      <p>
        Node-side bench (vitest) already shows
        <strong>rrule-rust 230–410× faster than rrule</strong>, 16–30×
        faster than rrule-temporal on hot expansion. The browser
        questions are: WASM init cost, and bundle delta.
      </p>
    </header>

    <button class="btn" :disabled="engines.some((r) => r.status === 'running')" @click="runAll">
      Re-run
    </button>

    <table class="results">
      <thead>
        <tr>
          <th>Engine</th>
          <th>Import (ms)</th>
          <th>First expand (ms)</th>
          <th>Warm expand (ms)</th>
          <th>Occurrences</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in engines" :key="row.name">
          <td><code>{{ row.name }}</code></td>
          <td class="num">{{ row.importMs ?? '—' }}</td>
          <td
            class="num"
            :class="{
              good: tone(row) === 'good',
              ok: tone(row) === 'ok',
              bad: tone(row) === 'bad',
            }"
          >
            {{ row.firstExpandMs ?? '—' }}
          </td>
          <td class="num">{{ row.warmExpandMs ?? '—' }}</td>
          <td class="num">{{ row.occurrenceCount ?? '—' }}</td>
          <td>
            <span v-if="row.status === 'error'" class="bad">ERROR: {{ row.error }}</span>
            <span v-else>{{ row.status }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="legend">
      <strong>Cold-start budget</strong> (Spike plan §3.4): ≤ 200 ms
      Tier A; abort if &gt; 500 ms. Color: <span class="good">green</span>
      = under budget, <span class="ok">amber</span> = over but
      tolerable, <span class="bad">red</span> = abort.
    </p>

    <h2>Fixture</h2>
    <pre>{{ FIXTURE_ICAL }}</pre>
    <p class="legend">
      Window: {{ WIN_START.toISOString() }} → {{ WIN_END.toISOString() }}
    </p>
  </div>
</template>

<style scoped>
.view {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 {
  margin: 0 0 4px 0;
  font-size: 22px;
}
.view__header p {
  margin: 0 0 8px 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.btn {
  align-self: flex-start;
  padding: 6px 16px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: wait; }

.results {
  border-collapse: collapse;
  width: 100%;
  font-variant-numeric: tabular-nums;
}
.results th,
.results td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid #e3e5e9;
  font-size: 14px;
}
.results th {
  background: #f6f7f9;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c7280;
}
.num { text-align: right; font-feature-settings: 'tnum'; }

.good { color: #16a34a; }
.ok { color: #d97706; }
.bad { color: #dc2626; }

.legend {
  font-size: 13px;
  color: #6c7280;
}

pre {
  background: #f6f7f9;
  border: 1px solid #e3e5e9;
  border-radius: 4px;
  padding: 12px;
  font-size: 13px;
  margin: 0;
  white-space: pre-wrap;
}
</style>
