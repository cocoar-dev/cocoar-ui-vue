<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/node-resizer/dist/style.css';

import {
  parseTokenDeclarations,
  buildTokenGraph,
  collectConnected,
  extractConsumers,
  addConsumerNodes,
} from '../../../../packages/ui/src/components/theme-editor/internal/token-graph';
import { graphToFlow } from './token-graph/graph-to-flow';
import { previewFor } from './token-graph/preview-registry';

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

const { fitView, onNodeClick, onPaneClick, onNodeContextMenu } = useVueFlow();

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

function rebuild(refit = true) {
  const flow = graphToFlow(graph, subgraphNames(), {
    expanded: expandedFamilies.value,
    activeNodes: activeNodes.value,
    sizes: sizes.value,
  });
  for (const n of flow.nodes) {
    const cls: string[] = [];
    if (n.id === start.value) cls.push('tg-sel');
    if (activeNodes.value.has(n.id)) cls.push('tg-active');
    if (cls.length) n.class = cls.join(' ');
  }
  for (const e of flow.edges) e.style = { stroke: '#94a3b8', strokeWidth: 1.5 }; // static, no animation
  nodes.value = flow.nodes;
  edges.value = flow.edges;
  // Only re-centre on structural changes (start/depth/family) — NOT on select.
  if (refit) nextTick(() => fitView({ padding: 0.15, duration: 300 }));
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

// ── live editing: token value overrides applied as CSS vars on the view ──
// Setting `--coar-x` on the wrapper makes every component inside (incl. the
// in-node previews) resolve it fresh — the browser restyles live, no rebuild.
const overrides = ref<Record<string, string>>({});
const activeNodes = ref<Set<string>>(new Set()); // open nodes — stay open until clicked again
const sizes = ref<Record<string, { w: number; h: number }>>({}); // user-resized nodes
const viewRef = ref<HTMLElement | null>(null);

// CSS substitutes `--a: var(--b)` at the element where --a is DECLARED (:root)
// and inherits the finished value — so overriding a primitive on a wrapper does
// NOT ripple through intermediate tokens declared at :root. Fix: re-declare the
// edited token's whole `affects` subtree (each dependent's authored value) on
// the wrapper, so the chain re-resolves there against the override.
const overrideStyle = computed<Record<string, string>>(() => {
  const dirty = Object.keys(overrides.value);
  if (!dirty.length) return {};
  const affected = collectConnected(graph, dirty, { ancestors: false, descendants: true });
  const out: Record<string, string> = {};
  for (const name of affected) {
    out[name] = overrides.value[name] ?? graph.nodes.get(name)?.value ?? '';
  }
  return out;
});

function setOverride(name: string, value: string) {
  overrides.value = { ...overrides.value, [name]: value };
}
function resetOverrides() {
  overrides.value = {};
}
function resetOne(name: string) {
  const next = { ...overrides.value };
  delete next[name];
  overrides.value = next;
}
function setActive(id: string) {
  // Toggle: a click opens a node and it stays open; clicking it again closes it.
  // Clicking the pane / another node does NOT close it.
  const next = new Set(activeNodes.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  activeNodes.value = next;
}

// ── value resolution for editors (reflects overrides; works for derived
// tokens too by reading the live computed value at the wrapper / a probe) ──
let probe: HTMLSpanElement | null = null;
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+(?:\.\d+)?/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('');
}
function colorVal(name: string): string {
  const ov = overrides.value[name];
  if (ov && /^#[0-9a-fA-F]{6}$/.test(ov)) return ov;
  if (ov && /^#[0-9a-fA-F]{3}$/.test(ov)) return '#' + ov.slice(1).split('').map((c) => c + c).join('');
  if (!probe) return '#000000';
  probe.style.color = `var(${name})`;
  return rgbToHex(getComputedStyle(probe).color);
}
const DIM_RE = /^(-?[\d.]+)(px|rem|em|%)?$/;
function resolveDim(name: string) {
  const src = overrides.value[name]
    ?? (viewRef.value ? getComputedStyle(viewRef.value).getPropertyValue(name).trim() : '');
  const m = DIM_RE.exec(src.trim());
  return { num: Number(m?.[1] ?? 0), unit: m?.[2] ?? 'px' };
}
const dimNum = (name: string) => resolveDim(name).num;
const dimUnit = (name: string) => resolveDim(name).unit;
const dimMax = (name: string) => (['rem', 'em'].includes(dimUnit(name)) ? 4 : dimUnit(name) === '%' ? 100 : 64);
const dimStep = (name: string) => (['rem', 'em'].includes(dimUnit(name)) ? 0.25 : 1);
function onEditColor(name: string, e: Event) {
  setOverride(name, (e.target as HTMLInputElement).value);
}
function onEditDim(name: string, e: Event) {
  setOverride(name, `${(e.target as HTMLInputElement).value}${dimUnit(name)}`);
}

// resize: NodeResizer mutates the live node; persist the final size so it
// survives the next rebuild.
function onResize(name: string, ev: { params?: { width: number; height: number } }) {
  if (ev.params) sizes.value = { ...sizes.value, [name]: { w: ev.params.width, h: ev.params.height } };
}

// context menu — re-root lives here so a plain click no longer re-centers.
const menu = ref<{ x: number; y: number; node: string } | null>(null);
function closeMenu() { menu.value = null; }
function rerootTo(name: string) { setStart(name); closeMenu(); }

// Structural changes re-centre; selecting a node does not.
watch([start, upDepth, downDepth, expandedFamilies], () => rebuild(true));
watch(activeNodes, () => rebuild(false));
watch(start, (v) => { query.value = v; }); // keep the search box in sync

// Plain click = select (open editor/preview); group click = expand family.
onNodeClick(({ node }) => {
  closeMenu();
  if (node.data?.isGroup) toggleFamily(node.id);
  else setActive(node.id);
});
onPaneClick(() => { closeMenu(); }); // outside click closes the menu, NOT open nodes
// Right-click = context menu (re-root lives here now).
onNodeContextMenu(({ event, node }) => {
  event.preventDefault();
  const e = event as MouseEvent;
  menu.value = { x: e.clientX, y: e.clientY, node: node.id };
});

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
  if (viewRef.value) {
    probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
    viewRef.value.appendChild(probe);
  }
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
  <div ref="viewRef" class="tg-view" :style="overrideStyle">
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

      <button
        v-if="Object.keys(overrides).length"
        class="tg-reset"
        @click="resetOverrides"
      >↺ reset {{ Object.keys(overrides).length }} edit(s)</button>

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
      :nodes-connectable="false"
      :elements-selectable="false"
      :edges-updatable="false"
      :connect-on-click="false"
      :delete-key-code="null"
      :selection-key-code="null"
      :multi-selection-key-code="null"
      :zoom-on-double-click="false"
      class="tg-flow"
    >
      <Background :gap="18" pattern-color="#d8dde3" />
      <Controls />

      <template #node-token="{ data }">
        <Handle type="target" :position="Position.Left" :connectable="false" />
        <div
          class="tg-node"
          :class="[`tg-node--${data.layer}`, { 'tg-node--editable': data.editable }]"
          :title="`${data.full}${data.value ? ': ' + data.value : ''}`"
        >
          <span class="tg-drag" title="Drag to move">⠿</span>
          <span v-if="data.swatch" class="tg-swatch" :style="{ background: data.swatch }" />
          <span class="tg-node-name">{{ data.short }}</span>
          <!-- value editor: only when this node is selected (click to open) -->
          <input
            v-if="data.active && data.editable && data.type === 'color'"
            type="color" class="tg-edit-color" :value="colorVal(data.full)"
            @input.stop="onEditColor(data.full, $event)" @pointerdown.stop @mousedown.stop @click.stop
          />
          <template v-else-if="data.active && data.editable && data.type === 'dimension'">
            <input
              type="range" class="tg-edit-range"
              :min="0" :max="dimMax(data.full)" :step="dimStep(data.full)" :value="dimNum(data.full)"
              @input.stop="onEditDim(data.full, $event)" @pointerdown.stop @mousedown.stop @click.stop
            />
            <span class="tg-edit-val">{{ dimNum(data.full) }}{{ dimUnit(data.full) }}</span>
          </template>
          <span v-else class="tg-node-type">{{ data.type }}</span>
        </div>
        <Handle type="source" :position="Position.Right" :connectable="false" />
      </template>

      <!-- Consumer node: click to select → live preview; resizable when open -->
      <template #node-consumer="{ data }">
        <NodeResizer
          v-if="data.active"
          :min-width="200" :min-height="80"
          @resize="onResize(data.full, $event)"
        />
        <Handle type="target" :position="Position.Left" :connectable="false" />
        <div class="tg-node tg-node--consumer tg-consumer">
          <div class="tg-consumer-head">
            <span class="tg-drag" title="Drag to move">⠿</span>
            <span class="tg-node-name">{{ data.short }}</span>
            <span v-if="data.hasPreview" class="tg-node-type">{{ data.active ? '▾' : '▸' }} preview</span>
            <span v-else class="tg-node-type">component</span>
          </div>
          <div v-if="data.active && previewFor(data.full)" class="tg-preview">
            <component :is="previewFor(data.full).component" v-bind="previewFor(data.full).props || {}">
              {{ previewFor(data.full).slot }}
            </component>
          </div>
        </div>
        <Handle type="source" :position="Position.Right" :connectable="false" />
      </template>

      <!-- Collapsible family container -->
      <template #node-tokengroup="{ data }">
        <Handle type="target" :position="Position.Left" :connectable="false" />
        <div
          class="tg-group"
          :class="[`tg-group--${data.layer}`, { 'tg-group--collapsed': data.collapsed }]"
          :title="`${data.full} — ${data.count} variants`"
        >
          <div class="tg-group-header">
            <span class="tg-drag" title="Drag to move">⠿</span>
            <span class="tg-chevron">{{ data.collapsed ? '▸' : '▾' }}</span>
            <span class="tg-node-name">{{ data.short }}</span>
            <span class="tg-node-count">×{{ data.count }}</span>
          </div>
        </div>
        <Handle type="source" :position="Position.Right" :connectable="false" />
      </template>
    </VueFlow>

    <ul v-if="menu" class="tg-menu" :style="{ left: menu.x + 'px', top: menu.y + 'px' }">
      <li @click="rerootTo(menu.node)">⌖ Fokus ab hier (Re-Root)</li>
      <li v-if="overrides[menu.node]" @click="resetOne(menu.node); closeMenu()">↺ Wert zurücksetzen</li>
      <li class="tg-menu-dismiss" @click="closeMenu()">Schließen</li>
    </ul>
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

/* inline value editors (on editable leaf token nodes) */
.tg-edit-color { width: 26px; height: 22px; padding: 0; border: 1px solid #cbd5e1; border-radius: 5px; background: none; cursor: pointer; flex-shrink: 0; }
.tg-edit-range { flex: 1; min-width: 56px; accent-color: #2563eb; cursor: pointer; }
.tg-edit-val { font-size: 10px; font-family: ui-monospace, monospace; color: #475569; flex-shrink: 0; min-width: 40px; text-align: right; }

/* consumer node with live in-node preview */
.tg-consumer { flex-direction: column; align-items: stretch; gap: 0; padding: 0; height: 100%; box-sizing: border-box; }
.tg-consumer-head { display: flex; align-items: center; gap: 7px; padding: 0 10px; height: 44px; flex-shrink: 0; }
.tg-preview-toggle {
  border: none; background: #ccfbf1; color: #0f766e; cursor: pointer; font-size: 11px;
  width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.tg-preview {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 10px; border-top: 1px dashed #99f6e4; background: #fff; overflow: hidden;
  pointer-events: none; /* preview is display-only; clicks fall through to re-root */
}

/* toolbar reset */
.tg-reset { font: inherit; font-size: 12px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 3px 9px; color: #b45309; }

/* focus / dim states (applied to the Vue Flow node wrapper via node.class) */
:deep(.vue-flow__node.tg-dim) { opacity: 0.1; }
:deep(.vue-flow__node.tg-sel) .tg-node { box-shadow: 0 0 0 3px #2563eb55; border-width: 2px; }
:deep(.vue-flow__node.tg-active) .tg-node,
:deep(.vue-flow__node.tg-active) .tg-group { box-shadow: 0 0 0 3px #2563eb88; }
:deep(.vue-flow__edge.tg-dim) { opacity: 0.07; }

/* connection handles: invisible + non-interactive — edges still anchor to
   their position, but users can't drag new connections. */
:deep(.vue-flow__handle) { opacity: 0; pointer-events: none; }

/* drag handle — the only grab area now (nodes aren't draggable elsewhere) */
.tg-drag { cursor: grab; color: #b8c0c8; font-size: 12px; line-height: 1; flex-shrink: 0; user-select: none; letter-spacing: -1px; }
.tg-drag:active { cursor: grabbing; }

/* context menu (right-click) */
.tg-menu {
  position: fixed; z-index: 50; min-width: 190px; margin: 0; padding: 4px; list-style: none;
  background: #fff; border: 1px solid #d8dde3; border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16); font-size: 13px;
}
.tg-menu li { padding: 6px 10px; border-radius: 5px; cursor: pointer; white-space: nowrap; color: #1f2937; }
.tg-menu li:hover { background: #eff4f9; }
.tg-menu .tg-menu-dismiss { color: #6b7280; border-top: 1px solid #eef1f4; margin-top: 2px; }
</style>
