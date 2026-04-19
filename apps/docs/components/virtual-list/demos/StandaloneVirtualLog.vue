<template>
  <div>
    <div class="toolbar">
      <button type="button" @click="scrollToMiddle">Scroll to 25,000</button>
      <button type="button" @click="scrollToEnd">Scroll to end</button>
      <span class="muted">Rendered: {{ virtualRows.length }} / {{ logs.length.toLocaleString() }} rows</span>
    </div>
    <div ref="scrollRef" class="log">
      <!-- Spacer provides the full virtual height so the browser's native scrollbar is accurate. -->
      <div class="spacer" :style="{ height: totalSize + 'px' }">
        <div
          v-for="row in virtualRows"
          :key="row.index"
          class="line"
          :class="`line--${logs[row.index].level}`"
          :style="{ transform: `translateY(${row.start}px)`, height: row.size + 'px' }"
        >
          <span class="idx">{{ String(row.index + 1).padStart(5, '0') }}</span>
          <span class="lvl">{{ logs[row.index].level.toUpperCase() }}</span>
          <span class="msg">{{ logs[row.index].message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useVirtualList } from '@cocoar/vue-ui';

interface LogLine { level: 'info' | 'warn' | 'error'; message: string }

const LEVELS: LogLine['level'][] = ['info', 'info', 'info', 'info', 'warn', 'error'];
const MSG_POOL = [
  'Served GET /api/principals in 14ms',
  'Cache miss on token-introspect; re-fetching',
  'Scheduled cleanup tick — no candidates',
  'POST /teams/42/members (batch 12)',
  'Upstream 502 — retry 2/3 queued',
  'Rate limit 4/sec threshold reached',
  'Invalidated cache segment users:42',
  'WS heartbeat latency 83ms',
  'Released connection back to pool (id=17)',
  'User alice.mueller logged in from 10.0.3.22',
];

const logs: LogLine[] = Array.from({ length: 50_000 }, (_, i) => ({
  level: LEVELS[i % LEVELS.length],
  message: `${MSG_POOL[i % MSG_POOL.length]} — seq ${i}`,
}));

const scrollRef = useTemplateRef<HTMLElement>('scrollRef');

const { virtualRows, totalSize, scrollToIndex } = useVirtualList({
  count: logs.length,
  itemSize: 22,
  overscan: 8,
  scrollElement: scrollRef,
});

function scrollToMiddle() { scrollToIndex(25000, 'start'); }
function scrollToEnd() { scrollToIndex(logs.length - 1, 'end'); }
</script>

<style scoped>
.toolbar {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; font-size: 12px;
}
.toolbar button {
  border: 1px solid #d1d5db; background: white;
  padding: 4px 10px; border-radius: 3px; cursor: pointer;
  font-size: 12px;
}
.toolbar button:hover { background: #f3f4f6; }
.muted { color: #64748b; margin-left: auto; }
.log {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #0f172a;
  color: #cbd5e1;
  font-family: 'Cascadia Code', Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 22px;
}
.spacer { position: relative; }
.line {
  position: absolute;
  left: 0; right: 0;
  display: flex; gap: 10px; padding: 0 10px;
  white-space: nowrap;
  overflow: hidden;
}
.idx { color: #475569; flex-shrink: 0; }
.lvl { flex-shrink: 0; font-weight: 600; width: 48px; }
.line--info .lvl { color: #60a5fa; }
.line--warn .lvl { color: #fbbf24; }
.line--error .lvl { color: #f87171; }
.msg { overflow: hidden; text-overflow: ellipsis; }
</style>
