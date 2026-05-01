<script setup lang="ts">
/**
 * Phase 0 / Spike E — recurrence worker boundary bench.
 *
 * Compares two paths through the same `RecurrenceRequest` shape:
 *
 *   - `expandSync`  — runs `rrule-rust` in this thread.
 *   - `expandAsync` — dispatches to a long-lived worker; the
 *                     occurrence Float64Array buffers come back via
 *                     postMessage's transferList (zero-copy).
 *
 * Four scenarios from the spike plan:
 *
 *   W1: 100 weekly  × 1-week window  → ~ 700 occurrences
 *   W2: 1.000 weekly × 1-week window  → ~ 7.000 occurrences
 *   W3: 1.000 daily  × 1-month window → ~ 30.000 occurrences
 *   W4: 10.000 weekly × 1-week window → ~ 70.000 occurrences
 *
 * Each scenario runs both paths in sequence with a small idle gap
 * between, so the worker has time to settle. Results show:
 *
 *   - sync ms (full main-thread blocking time)
 *   - async ms (postMessage-out → reply received, the round-trip
 *               cost from the consumer's perspective)
 *   - async expansion ms (worker-internal expansion time, excluding
 *                         transport)
 *   - delta = async - sync (positive = sync is faster; negative =
 *             worker is faster, the auto-dispatch threshold has
 *             been crossed)
 */

import { computed, onMounted, ref } from 'vue';
import {
  expandSync,
  expandAsync,
  shutdownRecurrenceWorker,
  type RecurrenceRequest,
} from '@cocoar/vue-calendar/recurrence';

interface ScenarioRow {
  id: string;
  description: string;
  ruleCount: number;
  ruleTemplate: string;
  windowStart: number;
  windowEnd: number;
  syncMs: number | null;
  asyncMs: number | null;
  asyncExpansionMs: number | null;
  deltaMs: number | null;
  occurrenceCount: number | null;
  status: 'idle' | 'running' | 'done' | 'error';
  error: string | null;
}

const Y_2024 = new Date('2024-01-01T00:00:00Z').getTime();
const M_2024_06 = new Date('2024-06-01T00:00:00Z').getTime();

function buildRequest(
  template: string,
  count: number,
  start: number,
  end: number,
): RecurrenceRequest {
  const rules: RecurrenceRequest['rules'] = new Array(count);
  for (let i = 0; i < count; i++) {
    // Stagger DTSTART by index so rules aren't degenerate duplicates,
    // but keep the rule itself constant so the workload is dominated
    // by expansion, not parsing.
    const dtstartMs = start + i * 1000; // 1 second apart
    const dt = new Date(dtstartMs);
    const dtIso =
      dt.getUTCFullYear().toString().padStart(4, '0') +
      (dt.getUTCMonth() + 1).toString().padStart(2, '0') +
      dt.getUTCDate().toString().padStart(2, '0') +
      'T' +
      dt.getUTCHours().toString().padStart(2, '0') +
      dt.getUTCMinutes().toString().padStart(2, '0') +
      dt.getUTCSeconds().toString().padStart(2, '0') +
      'Z';
    rules[i] = {
      seriesId: `s-${i}`,
      rruleString: `DTSTART:${dtIso}\nRRULE:${template}`,
    };
  }
  return { rules, windowStart: start, windowEnd: end };
}

const scenarios = ref<ScenarioRow[]>([
  {
    id: 'W1',
    description: '100 weekly × 1-week window',
    ruleCount: 100,
    ruleTemplate: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    windowStart: M_2024_06,
    windowEnd: M_2024_06 + 7 * 86400_000,
    syncMs: null, asyncMs: null, asyncExpansionMs: null, deltaMs: null,
    occurrenceCount: null, status: 'idle', error: null,
  },
  {
    id: 'W2',
    description: '1.000 weekly × 1-week window',
    ruleCount: 1000,
    ruleTemplate: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    windowStart: M_2024_06,
    windowEnd: M_2024_06 + 7 * 86400_000,
    syncMs: null, asyncMs: null, asyncExpansionMs: null, deltaMs: null,
    occurrenceCount: null, status: 'idle', error: null,
  },
  {
    id: 'W3',
    description: '1.000 daily × 1-month window',
    ruleCount: 1000,
    ruleTemplate: 'FREQ=DAILY',
    windowStart: M_2024_06,
    windowEnd: new Date('2024-07-01T00:00:00Z').getTime(),
    syncMs: null, asyncMs: null, asyncExpansionMs: null, deltaMs: null,
    occurrenceCount: null, status: 'idle', error: null,
  },
  {
    id: 'W4',
    description: '10.000 weekly × 1-week window',
    ruleCount: 10_000,
    ruleTemplate: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    windowStart: M_2024_06,
    windowEnd: M_2024_06 + 7 * 86400_000,
    syncMs: null, asyncMs: null, asyncExpansionMs: null, deltaMs: null,
    occurrenceCount: null, status: 'idle', error: null,
  },
]);

const isRunning = ref(false);
const workerWarmed = ref(false);
const warmupMs = ref<number | null>(null);

void Y_2024; // keep referenced for future scenarios

async function warmWorker(): Promise<void> {
  // Cold start both the worker AND the main-thread rrule-rust so
  // every per-scenario number reflects warm-path performance. The
  // first sync call is also cold (loads & inits WASM in the main
  // thread); pre-warming both makes the comparison fair.
  const t0 = performance.now();

  // Main-thread warm-up: trivial expansion to load WASM.
  expandSync({
    rules: [{ seriesId: 'warmup', rruleString: 'DTSTART:20240101T000000Z\nRRULE:FREQ=DAILY;COUNT=1' }],
    windowStart: Y_2024,
    windowEnd: Y_2024 + 86400_000,
  });

  // Worker warm-up: 30-second timeout (was 5s — too short for
  // cold-start WASM init in the worker context on a busy CI runner).
  try {
    await Promise.race([
      expandAsync({
        rules: [{ seriesId: 'warmup', rruleString: 'DTSTART:20240101T000000Z\nRRULE:FREQ=DAILY;COUNT=1' }],
        windowStart: Y_2024,
        windowEnd: Y_2024 + 86400_000,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Worker warm-up timed out after 30s')), 30_000),
      ),
    ]);
    warmupMs.value = Math.round(performance.now() - t0);
    workerWarmed.value = true;
  } catch (e) {
    warmupMs.value = -1;
    // eslint-disable-next-line no-console
    console.warn('[Spike E] Worker warm-up failed:', (e as Error).message);
  }
}

async function runScenario(row: ScenarioRow): Promise<void> {
  row.status = 'running';
  row.error = null;
  const req = buildRequest(row.ruleTemplate, row.ruleCount, row.windowStart, row.windowEnd);

  try {
    // Sync path. W4 (10k rules) is intentionally slow on the main
    // thread — the bench numbers will show it.
    const t0 = performance.now();
    const syncResult = expandSync(req);
    const t1 = performance.now();
    row.syncMs = Math.round((t1 - t0) * 100) / 100;

    // Brief idle so the main thread settles.
    await new Promise((r) => setTimeout(r, 50));

    // Async path. Per-scenario timeout so a hung worker doesn't
    // block the entire bench.
    const t2 = performance.now();
    const asyncResult = await Promise.race([
      expandAsync(req),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Worker timed out after 30s')), 30_000),
      ),
    ]);
    const t3 = performance.now();
    row.asyncMs = Math.round((t3 - t2) * 100) / 100;
    row.asyncExpansionMs = Math.round(asyncResult.expansionMs * 100) / 100;
    row.deltaMs = Math.round((row.asyncMs - row.syncMs) * 100) / 100;

    // Sanity: occurrence counts should match.
    const syncCount = syncResult.results.reduce((s, r) => s + r.timestamps.length, 0);
    const asyncCount = asyncResult.results.reduce((s, r) => s + r.timestamps.length, 0);
    if (syncCount !== asyncCount) {
      throw new Error(
        `Occurrence count mismatch: sync=${syncCount}, async=${asyncCount}`,
      );
    }
    row.occurrenceCount = syncCount;
    row.status = 'done';
  } catch (e) {
    row.status = 'error';
    row.error = (e as Error).message;
  }
}

async function runAll(): Promise<void> {
  if (isRunning.value) return;
  isRunning.value = true;
  for (const s of scenarios.value) {
    s.syncMs = null; s.asyncMs = null; s.asyncExpansionMs = null;
    s.deltaMs = null; s.occurrenceCount = null; s.status = 'idle'; s.error = null;
  }
  // The first scenario absorbs cold-start cost for both paths. We
  // run a brief pre-warm scenario (single trivial rule) to take the
  // edge off, then redo W1 so its numbers are warm-path. Putting the
  // pre-warm call inline (not via warmWorker which historically hung
  // on the first call's WASM-init handshake) avoids the timeout
  // dance — the first awaited expandAsync that comes back tells us
  // the worker is ready.
  await runScenario({
    id: 'prewarm', description: 'pre-warm', ruleCount: 1,
    ruleTemplate: 'FREQ=DAILY;COUNT=1',
    windowStart: Y_2024, windowEnd: Y_2024 + 86400_000,
    syncMs: null, asyncMs: null, asyncExpansionMs: null, deltaMs: null,
    occurrenceCount: null, status: 'idle', error: null,
  });
  workerWarmed.value = true;
  warmupMs.value = 0;

  for (const s of scenarios.value) {
    await runScenario(s);
    await new Promise((r) => setTimeout(r, 200)); // breathe between scenarios
  }
  isRunning.value = false;
}

const breakeven = computed(() => {
  // The auto-dispatch threshold sits between the highest scenario
  // where sync still wins and the lowest where async wins.
  const done = scenarios.value.filter((s) => s.status === 'done' && s.deltaMs !== null);
  if (done.length === 0) return null;
  // Lowest rule count where async is faster (delta < 0):
  const asyncWins = done.filter((s) => (s.deltaMs ?? 0) < 0).map((s) => s.ruleCount);
  if (asyncWins.length === 0) return null;
  return Math.min(...asyncWins);
});

onMounted(() => {
  void runAll();
});

import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  shutdownRecurrenceWorker();
});

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Recurrence worker boundary bench (Spike E)</h1>
      <p>
        Sync (main-thread <code>rrule-rust</code>) vs. async (worker
        with Transferable Float64Array). Each scenario expands the same
        request through both paths; lower is better. The auto-dispatch
        threshold is the smallest <strong>rule count</strong> where the
        async path wins.
      </p>
      <p>
        First call cold-starts the worker (~ 175 ms WASM init,
        amortised across the page session); after that, the worker
        round-trip is ~ 1 ms postMessage out + 1 ms reply.
      </p>
    </header>

    <div class="controls">
      <button class="btn" :disabled="isRunning" @click="runAll">
        {{ isRunning ? 'Running…' : 'Re-run' }}
      </button>
      <span v-if="warmupMs !== null" class="meta">
        Worker warm-up: {{ warmupMs }} ms
      </span>
      <span v-if="breakeven !== null" class="meta meta--decision">
        Async wins at ≥ {{ breakeven.toLocaleString('en-US') }} rules
      </span>
    </div>

    <table class="results">
      <thead>
        <tr>
          <th>ID</th>
          <th>Scenario</th>
          <th class="num">Rules</th>
          <th class="num">Occurrences</th>
          <th class="num">Sync (ms)</th>
          <th class="num">Async (ms)</th>
          <th class="num">Worker expand (ms)</th>
          <th class="num">Δ async-sync</th>
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in scenarios" :key="s.id">
          <td><code>{{ s.id }}</code></td>
          <td>{{ s.description }}</td>
          <td class="num">{{ s.ruleCount.toLocaleString('en-US') }}</td>
          <td class="num">{{ fmt(s.occurrenceCount) }}</td>
          <td
            class="num"
            :class="{
              'num--good': s.deltaMs !== null && s.deltaMs > 0,
              'num--bad': s.deltaMs !== null && s.deltaMs < 0 && s.syncMs !== null && s.syncMs > 50,
            }"
          >{{ fmt(s.syncMs) }}</td>
          <td class="num">{{ fmt(s.asyncMs) }}</td>
          <td class="num">{{ fmt(s.asyncExpansionMs) }}</td>
          <td
            class="num"
            :class="{
              'num--good': s.deltaMs !== null && s.deltaMs > 0,
              'num--bad': s.deltaMs !== null && s.deltaMs < 0,
            }"
          >{{ s.deltaMs !== null ? (s.deltaMs > 0 ? '+' : '') + fmt(s.deltaMs) : '—' }}</td>
          <td>
            <span v-if="s.status === 'error'" class="bad">ERROR: {{ s.error }}</span>
            <span v-else-if="s.deltaMs !== null && s.deltaMs > 0" class="good">sync</span>
            <span v-else-if="s.deltaMs !== null && s.deltaMs < 0" class="ok">async</span>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="legend">
      <p>
        <strong>Sync (ms)</strong>: full main-thread blocking time.
        Anything &gt; 50 ms is jank-territory for an interactive UI;
        &gt; 100 ms is a clear "drop a frame" signal.
      </p>
      <p>
        <strong>Async (ms)</strong>: postMessage round-trip from the
        consumer's perspective, including the <em>worker expansion
        time</em> column shown separately. The difference between the
        two is the transport cost (structured-clone of input +
        Transferable buffer of output).
      </p>
      <p>
        <strong>Δ async-sync</strong>: positive = sync wins, negative
        = async wins. The auto-dispatch threshold for Phase 1 is the
        smallest rule count where async is faster (and ideally also
        where sync exceeds the main-thread budget, ~ 16-50 ms).
      </p>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 { margin: 0 0 4px 0; font-size: 22px; }
.view__header p { margin: 0 0 8px 0; color: #4b5563; font-size: 14px; line-height: 1.5; }
.view__header code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }

.controls { display: flex; align-items: center; gap: 16px; }
.btn {
  padding: 6px 16px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: wait; }
.meta { font-size: 13px; color: #6c7280; }
.meta--decision {
  background: rgba(37, 99, 235, 0.08);
  border-radius: 4px;
  padding: 4px 10px;
  color: #1a1c1f;
  font-weight: 600;
}

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
  font-size: 13px;
}
.results th {
  background: #f6f7f9;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c7280;
}
.num { text-align: right; font-feature-settings: 'tnum'; }
.num--good { color: #16a34a; }
.num--bad { color: #dc2626; }
.good { color: #16a34a; }
.ok { color: #d97706; }
.bad { color: #dc2626; }

.legend p { font-size: 12px; color: #6c7280; margin: 4px 0; }
.legend strong { color: #1a1c1f; }
</style>
