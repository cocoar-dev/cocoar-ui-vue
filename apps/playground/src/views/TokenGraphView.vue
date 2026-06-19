<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

import {
  parseTokenDeclarations,
  buildTokenGraph,
  collectConnected,
  extractConsumers,
  addConsumerNodes,
} from '../../../../packages/ui/src/components/theme-editor/internal/token-graph';
import { graphToFlow } from './token-graph/graph-to-flow';

// ── load token CSS (light/base values only) ────────────────────
const rawTokens = import.meta.glob(
  '../../../../packages/ui/styles/tokens/*.css',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
const css = Object.entries(rawTokens)
  .filter(([p]) => !/colors-primitives-dark|theme-none/.test(p))
  .map(([, c]) => c)
  .join('\n');

// ── load component SFCs → consumer nodes ───────────────────────
const rawComponents = import.meta.glob(
  '../../../../packages/ui/src/components/*/Coar*.vue',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
const consumerSources = Object.entries(rawComponents).map(([p, source]) => ({
  name: p.split('/').pop()!.replace('.vue', ''),
  source,
}));

const graph = buildTokenGraph(parseTokenDeclarations(css));
addConsumerNodes(graph, extractConsumers(consumerSources));

const nodeNames = [...graph.nodes.keys()].sort(); // datalist: everything searchable
const consumerCount = [...graph.nodes.values()].filter((n) => n.layer === 'consumer').length;

const nodes = ref<ReturnType<typeof graphToFlow>['nodes']>([]);
const edges = ref<ReturnType<typeof graphToFlow>['edges']>([]);

const { fitView, onNodeClick } = useVueFlow();

// ── exploration: a start node + a depth per direction ──────────
// Only this bounded subgraph is rendered — nothing else — so the heavy full
// graph is never drawn. dependsOn = ancestors (what the node derives from);
// affects = descendants (what would change if you edit it).
const start = ref('CoarTextInput');
const query = ref('CoarTextInput');
const upDepth = ref(6); // dependsOn
const downDepth = ref(3); // affects
// Family keys shown expanded. Default empty → scales (component-*-height,
// color-red-*, radius-*, …) collapse to a single node.
const expandedFamilies = ref(new Set<string>());

function subgraphNames(): Set<string> {
  if (!graph.nodes.has(start.value)) return new Set();
  const up = collectConnected(graph, [start.value], { ancestors: true, descendants: false, maxDepth: upDepth.value });
  const down = collectConnected(graph, [start.value], { ancestors: false, descendants: true, maxDepth: downDepth.value });
  return new Set<string>([...up, ...down]);
}

function rebuild() {
  const flow = graphToFlow(graph, subgraphNames(), { expanded: expandedFamilies.value });
  for (const n of flow.nodes) if (n.id === start.value) n.class = 'tg-sel';
  for (const e of flow.edges) e.style = { stroke: '#94a3b8', strokeWidth: 1.5 }; // static, no animation
  nodes.value = flow.nodes;
  edges.value = flow.edges;
  nextTick(() => fitView({ padding: 0.15, duration: 300 }));
}

function setStart(id: string) {
  if (graph.nodes.has(id)) start.value = id; // clicking a node re-roots the view
}

function toggleFamily(key: string) {
  const next = new Set(expandedFamilies.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedFamilies.value = next;
}

watch([start, upDepth, downDepth, expandedFamilies], rebuild);
watch(start, (v) => { query.value = v; }); // keep the search box in sync on click
// Group node → expand/collapse the family; any other node → re-root.
onNodeClick(({ node }) => (node.data?.isGroup ? toggleFamily(node.id) : setStart(node.id)));

// ── URL ⇄ state sync, so browser back/forward navigate the exploration ──
const route = useRoute();
const router = useRouter();
let syncing = false;

function writeUrl(asNavigation: boolean) {
  if (syncing) return;
  const q: Record<string, string> = {
    start: start.value, up: String(upDepth.value), down: String(downDepth.value),
  };
  if (expandedFamilies.value.size) q.exp = [...expandedFamilies.value].join(',');
  (asNavigation ? router.push : router.replace)({ query: q }).catch(() => {});
}

function readUrl() {
  syncing = true;
  const q = route.query;
  const s = typeof q.start === 'string' ? q.start : '';
  if (s && s !== start.value && graph.nodes.has(s)) start.value = s;
  if (q.up != null && Number(q.up) !== upDepth.value) upDepth.value = Number(q.up);
  if (q.down != null && Number(q.down) !== downDepth.value) downDepth.value = Number(q.down);
  const exp = typeof q.exp === 'string' && q.exp ? q.exp : '';
  if (exp !== [...expandedFamilies.value].join(',')) {
    expandedFamilies.value = new Set(exp ? exp.split(',') : []);
  }
  nextTick(() => { syncing = false; });
}

// Re-root + expand/collapse make history entries; depth tweaks just replace the
// current URL (no history flood while dragging the slider).
watch([start, upDepth, downDepth, expandedFamilies], (n, o) => writeUrl(n[0] !== o[0] || n[3] !== o[3]));
// Back/forward (or a shared link) → apply the URL to the view.
watch(() => route.query, readUrl);

onMounted(() => {
  if (route.query.start) readUrl();
  else writeUrl(false);
  rebuild();
});

function onSearch() {
  setStart(query.value);
}

const info = computed(() => {
  if (!graph.nodes.has(start.value)) return null;
  const n = graph.nodes.get(start.value)!;
  // Totals are unbounded (full reachable set) so you see how much the depth
  // sliders are currently hiding.
  const totalUp = collectConnected(graph, [start.value], { ancestors: true, descendants: false }).size - 1;
  const totalDown = collectConnected(graph, [start.value], { ancestors: false, descendants: true }).size - 1;
  return { name: n.name, value: n.value, totalUp, totalDown };
});
</script>

<template>
  <div class="tg-view">
    <header class="tg-toolbar">
      <strong>Token Graph</strong>
      <span class="tg-sep">·</span>
      <span class="tg-count">{{ nodes.length }} shown · {{ consumerCount }} components</span>
      <span class="tg-sep">·</span>
      <label>
        Start
        <input
          v-model="query"
          list="tg-node-list"
          placeholder="e.g. CoarTextInput"
          class="tg-search"
          @change="onSearch"
          @keyup.enter="onSearch"
        />
        <datalist id="tg-node-list" v-once>
          <option v-for="name in nodeNames" :key="name" :value="name" />
        </datalist>
      </label>
      <label class="tg-depth">depends on
        <input type="range" min="0" max="8" v-model.number="upDepth" /> {{ upDepth }}
      </label>
      <label class="tg-depth">affects
        <input type="range" min="0" max="8" v-model.number="downDepth" /> {{ downDepth }}
      </label>

      <span v-if="info" class="tg-focusinfo">
        <strong>{{ info.name }}</strong>
        — depends on <b>{{ info.totalUp }}</b> · affects <b>{{ info.totalDown }}</b>
        <code v-if="info.value">{{ info.value }}</code>
      </span>

      <span class="tg-legend">
        <i class="tg-dot tg-dot--brand" /> brand
        <i class="tg-dot tg-dot--primitive" /> primitive
        <i class="tg-dot tg-dot--semantic" /> semantic
        <i class="tg-dot tg-dot--component" /> component
        <i class="tg-dot tg-dot--consumer" /> consumer
      </span>
    </header>

    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :min-zoom="0.04"
      :max-zoom="2.5"
      fit-view-on-init
      class="tg-flow"
    >
      <Background :gap="18" pattern-color="#d8dde3" />
      <Controls />

      <template #node-token="{ data }">
        <Handle type="target" :position="Position.Left" />
        <div class="tg-node" :class="`tg-node--${data.layer}`" :title="`${data.full}${data.value ? ': ' + data.value : ''}`">
          <span v-if="data.swatch" class="tg-swatch" :style="{ background: data.swatch }" />
          <span class="tg-node-name">{{ data.short }}</span>
          <span class="tg-node-type">{{ data.type }}</span>
        </div>
        <Handle type="source" :position="Position.Right" />
      </template>

      <!-- Collapsible family container -->
      <template #node-tokengroup="{ data }">
        <Handle type="target" :position="Position.Left" />
        <div
          class="tg-group"
          :class="[`tg-group--${data.layer}`, { 'tg-group--collapsed': data.collapsed }]"
          :title="`${data.full} — ${data.count} variants`"
        >
          <div class="tg-group-header">
            <span class="tg-chevron">{{ data.collapsed ? '▸' : '▾' }}</span>
            <span class="tg-node-name">{{ data.short }}</span>
            <span class="tg-node-count">×{{ data.count }}</span>
          </div>
        </div>
        <Handle type="source" :position="Position.Right" />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.tg-view { display: flex; flex-direction: column; height: 100vh; font-family: system-ui, sans-serif; }
.tg-toolbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 14px; border-bottom: 1px solid #e2e6ea; background: #fafbfc; font-size: 13px;
}
.tg-toolbar label { display: inline-flex; align-items: center; gap: 5px; }
.tg-search { font: inherit; padding: 3px 7px; border: 1px solid #cbd2d9; border-radius: 6px; min-width: 200px; }
.tg-reset { font: inherit; cursor: pointer; border: 1px solid #cbd2d9; background: #fff; border-radius: 6px; padding: 3px 9px; }
.tg-sep { color: #c0c6cc; }
.tg-count { color: #6b7280; }
.tg-focusinfo { color: #374151; }
.tg-focusinfo code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 11px; margin-left: 6px; }
.tg-legend { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: #6b7280; font-size: 12px; }
.tg-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.tg-dot--brand { background: #f59e0b; }
.tg-dot--primitive { background: #3b82f6; }
.tg-dot--semantic { background: #22c55e; }
.tg-dot--component { background: #a855f7; }
.tg-dot--consumer { background: #0f766e; }

.tg-flow { flex: 1; background: #fff; }

.tg-node {
  display: flex; align-items: center; gap: 7px;
  width: 230px; height: 46px; box-sizing: border-box;
  padding: 0 10px; border-radius: 8px; border: 1.5px solid; background: #fff;
  font-size: 12px; overflow: hidden; transition: opacity .15s;
}
.tg-node-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.tg-node-type {
  font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
  color: #6b7280; background: #f3f4f6; padding: 1px 5px; border-radius: 99px; flex-shrink: 0;
}
.tg-swatch { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }

.tg-node--brand { border-color: #f59e0b; background: #fffbeb; }
.tg-node--primitive { border-color: #3b82f6; background: #eff6ff; }
.tg-node--semantic { border-color: #22c55e; background: #f0fdf4; }
.tg-node--component { border-color: #a855f7; background: #faf5ff; }
.tg-node--consumer { border-color: #0f766e; background: #f0fdfa; }
.tg-node--other { border-color: #9ca3af; background: #f9fafb; }

/* collapsible family container (Vue Flow group node) */
.tg-group {
  width: 100%; height: 100%; box-sizing: border-box;
  border: 1.5px dashed #94a3b8; border-radius: 10px;
  background: rgba(148, 163, 184, 0.06); cursor: pointer; overflow: hidden;
}
.tg-group--collapsed { background: #fff; }
.tg-group-header {
  display: flex; align-items: center; gap: 7px;
  height: 34px; padding: 0 10px;
  font-size: 12px; font-weight: 600; color: #334155;
  border-bottom: 1px dashed #cbd5e1;
}
.tg-group--collapsed .tg-group-header { height: 100%; border-bottom: none; }
.tg-group--brand { border-color: #f59e0b; }
.tg-group--primitive { border-color: #3b82f6; }
.tg-group--semantic { border-color: #22c55e; }
.tg-group--component { border-color: #a855f7; }
.tg-group--consumer { border-color: #0f766e; }
.tg-chevron { font-size: 11px; color: #6b7280; flex-shrink: 0; }
.tg-node-count {
  font-size: 10px; font-weight: 700; color: #475569;
  background: #e2e8f0; padding: 1px 6px; border-radius: 99px; flex-shrink: 0;
}

/* focus / dim states (applied to the Vue Flow node wrapper via node.class) */
:deep(.vue-flow__node.tg-dim) { opacity: 0.1; }
:deep(.vue-flow__node.tg-sel) .tg-node { box-shadow: 0 0 0 3px #2563eb55; border-width: 2px; }
:deep(.vue-flow__edge.tg-dim) { opacity: 0.07; }
</style>
