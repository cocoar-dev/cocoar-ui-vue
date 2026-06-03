<script setup lang="ts">
/**
 * Interactive lazy-loading demo. Folders fetch their children on first expand
 * via `loadChildren`. The simulator dials in latency + a failure rate so you can
 * actually SEE the loading spinner, the error + Retry path, and the
 * load-once-then-cache behaviour (collapse + re-expand never re-fetches).
 *
 * The spinner here replaces the row ICON (not the chevron): `hide-loading-spinner`
 * turns off the tree's built-in chevron spinner, and we render our own from the
 * `isLoading` slot prop. `hasError` drives the inline Retry button via
 * `api.reloadChildren`.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, CoarSegmentedControl, useTree } from '@cocoar/vue-ui';

interface Node {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  children?: Node[];
}

const roots = (): Node[] => [
  { id: 'src', name: 'src', kind: 'folder' },
  { id: 'docs', name: 'docs', kind: 'folder' },
  { id: 'assets', name: 'assets', kind: 'folder' },
];

const tree = ref<Node[]>(roots());
const expanded = ref(new Set<string>());

// ─── simulator knobs ───
const latency = ref(700);
const failurePct = ref(0);
const fetches = ref(0);

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Deterministic children for any folder — folders for the first two levels, then
// files, so you can drill in and watch each level lazy-load on its own.
function childrenFor(node: Node): Node[] {
  const depth = node.id.split('/').length;
  if (depth >= 3) {
    return [
      { id: `${node.id}/index.ts`, name: 'index.ts', kind: 'file' },
      { id: `${node.id}/styles.css`, name: 'styles.css', kind: 'file' },
    ];
  }
  return [
    { id: `${node.id}/components`, name: 'components', kind: 'folder' },
    { id: `${node.id}/lib`, name: 'lib', kind: 'folder' },
    { id: `${node.id}/index.ts`, name: 'index.ts', kind: 'file' },
    { id: `${node.id}/README.md`, name: 'README.md', kind: 'file' },
  ];
}

// Attach fetched children to the node, deep in the tree (reactive via the ref).
function attach(id: string, kids: Node[]) {
  const visit = (list: Node[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        n.children = kids;
        return true;
      }
      if (n.children && visit(n.children)) return true;
    }
    return false;
  };
  visit(tree.value);
  tree.value = [...tree.value];
}

const { builder, api } = useTree<Node>();
builder
  .nodes(tree)
  .getId((n) => n.id)
  .getChildren((n) => n.children)
  .getLabel((n) => n.name)
  .isExpandable((n) => n.kind === 'folder')
  .expanded(expanded)
  .hideLoadingSpinner(true) // we render our own icon-position spinner from `isLoading`
  .loadChildren(async (node) => {
    fetches.value += 1;
    await delay(latency.value);
    if (Math.random() * 100 < failurePct.value) throw new Error('Simulated network error');
    attach(node.id, childrenFor(node));
  });

function reset() {
  expanded.value = new Set();
  tree.value = roots();
  fetches.value = 0;
}
</script>

<template>
  <div class="lz">
    <div class="lz__bar">
      <label class="lz__knob">
        <span class="lz__knob-label">Latency</span>
        <CoarSegmentedControl
          v-model="latency"
          size="xs"
          :options="[
            { value: 0, label: 'Instant' },
            { value: 700, label: '700ms' },
            { value: 1800, label: 'Slow' },
          ]"
        />
      </label>
      <label class="lz__knob">
        <span class="lz__knob-label">Failure</span>
        <CoarSegmentedControl
          v-model="failurePct"
          size="xs"
          :options="[
            { value: 0, label: '0%' },
            { value: 30, label: '30%' },
            { value: 100, label: 'Always' },
          ]"
        />
      </label>
      <button type="button" class="lz__reset" @click="reset">Reset</button>
      <span class="lz__stat">{{ fetches }} fetch{{ fetches === 1 ? '' : 'es' }}</span>
    </div>

    <div class="lz__frame">
      <CoarTree :builder="builder">
        <template #default="{ node, isLoading, hasError }">
          <span class="lz__row">
            <span v-if="isLoading" class="lz__spinner lz__icon" aria-hidden="true" />
            <CoarIcon
              v-else
              :name="node.kind === 'folder' ? 'folder' : 'file-text'"
              size="xs"
              class="lz__icon"
              :class="{ 'lz__icon--error': hasError }"
            />
            <span class="lz__label" :class="{ 'lz__label--error': hasError }">{{ node.name }}</span>
            <button
              v-if="hasError"
              type="button"
              class="lz__retry"
              @click.stop="api.reloadChildren(node.id)"
            >
              Retry
            </button>
          </span>
        </template>
      </CoarTree>
    </div>

    <p class="hint">
      Expand a folder → it fetches its children. Try <strong>Slow</strong> to watch the spinner, bump
      <strong>Failure</strong> and hit <strong>Retry</strong> on the red row, and drill in to see each
      level load on its own. Loaded folders cache — collapse + re-expand never re-fetches;
      <strong>Reset</strong> clears everything.
    </p>
  </div>
</template>

<style scoped>
.lz {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lz__bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.lz__knob {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lz__knob-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary);
}
.lz__reset {
  border: 1px solid var(--coar-border-neutral-secondary);
  background: transparent;
  color: var(--coar-text-neutral-secondary);
  border-radius: var(--coar-radius-xs, 3px);
  font: inherit;
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}
.lz__reset:hover {
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
}
.lz__stat {
  margin-left: auto;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-variant-numeric: tabular-nums;
}
.lz__frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  max-width: 400px;
  height: 300px;
  /* Non-virtualized trees don't own a scroll viewport — the consumer's
     container does. Without this, expanded rows overflow the frame. */
  overflow: auto;
}
/* The exact border-ring spinner from the file-explorer demo. No
   prefers-reduced-motion guard on purpose — a frozen loading indicator reads as
   "stuck", and this matches the file-explorer POC's spinner 1:1. */
.lz__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--coar-border-neutral-tertiary);
  border-top-color: var(--coar-text-accent-primary);
  flex-shrink: 0;
  /* `!important` overrides VitePress's global prefers-reduced-motion reset
     (`*, ::before, ::after { animation-duration: 1ms !important }`), which would
     otherwise freeze this spinner into a static ring for reduced-motion users.
     A loading indicator that doesn't move reads as "stuck" — keep it spinning. */
  animation: lz-spin 700ms linear infinite !important;
}
@keyframes lz-spin {
  to {
    transform: rotate(360deg);
  }
}
.lz__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.lz__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.lz__icon--error {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}
.lz__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lz__label--error {
  color: var(--coar-text-semantic-error-bold, #dc2626);
}
.lz__retry {
  flex-shrink: 0;
  border: 1px solid var(--coar-border-semantic-error, #dc2626);
  color: var(--coar-text-semantic-error-bold, #dc2626);
  background: transparent;
  border-radius: var(--coar-radius-xs, 2px);
  font-size: 11px;
  padding: 1px 6px;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
