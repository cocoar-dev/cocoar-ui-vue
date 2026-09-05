<!-- Generated from apps/docs/components/panel-layout.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Panel Layout (Preview)

A VS-Code-style workbench: named, resizable regions you fill with whatever you like. Two pieces:

- **`CoarSplitPane`** — the primitive: two panes with a draggable divider. Nestable.
- **`CoarPanelLayout`** — a ready-made shell with `top / left / content / right / bottom / status` regions, built on `CoarSplitPane` so every divider feels identical.

```ts
import { CoarSplitPane, CoarPanelLayout } from '@cocoar/vue-ui';
```

The layout owns the arrangement and the drag-to-resize; **you own the contents** of every slot. Resizing works by pointer drag or arrow keys (the dividers are real `role="separator"` widgets).

## Split pane

`CoarSplitPane` lays out two slots — `#first` and `#second` — with a divider between them. The `side` pane carries a controlled px `size` (`v-model:size`); the other flexes. `direction="row"` gives a vertical divider (left/right); `direction="column"` gives a horizontal one (top/bottom).

**Demo — `panel-layout/demos/SplitPaneBasic.vue`**

```vue
<template>
  <div class="sp-frame">
    <CoarSplitPane v-model:size="size" :min="120" :max="420">
      <template #first>
        <div class="sp-pane sp-pane--a">
          <strong>Sidebar</strong>
          <span>{{ size }}px — drag the divider →</span>
        </div>
      </template>
      <template #second>
        <div class="sp-pane sp-pane--b">
          <strong>Content</strong>
          <span>flexes to fill the rest</span>
        </div>
      </template>
    </CoarSplitPane>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSplitPane } from '@cocoar/vue-ui';

const size = ref(200);
</script>

<style scoped>
.sp-frame {
  height: 220px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.sp-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.sp-pane span {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.sp-pane--a {
  background: var(--vp-c-bg-soft);
}
.sp-pane--b {
  background: var(--vp-c-bg);
}
</style>
```

```vue
<CoarSplitPane v-model:size="width" :min="120" :max="420">
  <template #first>…sidebar…</template>
  <template #second>…content…</template>
</CoarSplitPane>
```

| Prop | Default | Notes |
|---|---|---|
| `direction` | `'row'` | `'row'` = side by side (vertical divider); `'column'` = stacked (horizontal divider). |
| `side` | `'first'` | Which pane carries the controlled `size`. Use `'second'` for a right sidebar or bottom panel. |
| `size` (`v-model`) | — | Controlled px size of the `side` pane. Omit for uncontrolled (seeded by `defaultSize`). |
| `defaultSize` | `240` | Initial size when uncontrolled. |
| `min` / `max` | `0` / `∞` | Clamp for the `side` pane (also clamped to the container). |
| `resizable` | `true` | `false` hides the divider and fixes the split. |

Panes clip overflow (`overflow: hidden`) — put a scroll container inside if the content can exceed the pane.

## Workbench

`CoarPanelLayout` arranges the canonical regions. An **empty slot renders no region** (and no divider), so you take only what you need; `#default` (content) always fills the centre. Sidebars and the bottom panel are resizable and collapsible (`:left-open` …). Toggle the buttons and drag the dividers:

**Demo — `panel-layout/demos/PanelLayoutWorkbench.vue`**

```vue
<template>
  <div class="wb-frame">
    <CoarPanelLayout
      v-model:left-width="leftW"
      v-model:right-width="rightW"
      v-model:bottom-height="botH"
      :left-open="leftOpen"
      :right-open="rightOpen"
      :bottom-open="botOpen"
      :left-min="160"
      :left-max="360"
      :right-min="140"
      :right-max="320"
      :bottom-min="60"
      :bottom-max="220"
    >
      <template #top>
        <div class="wb-bar">
          <strong>Workbench</strong>
          <span class="wb-spacer" />
          <button class="wb-btn" :class="{ 'wb-btn--on': leftOpen }" @click="leftOpen = !leftOpen">Left</button>
          <button class="wb-btn" :class="{ 'wb-btn--on': botOpen }" @click="botOpen = !botOpen">Bottom</button>
          <button class="wb-btn" :class="{ 'wb-btn--on': rightOpen }" @click="rightOpen = !rightOpen">Right</button>
        </div>
      </template>

      <template #left>
        <!-- left sidebar = vertical split: tree (top) + details (bottom) -->
        <CoarSplitPane direction="column" side="second" v-model:size="detailsH" :min="64" :max="220">
          <template #first>
            <section class="wb-pane">
              <header class="wb-title">Explorer</header>
              <div class="wb-body wb-scroll">
                <CoarTree
                  :nodes="nodes"
                  :get-id="(n) => n.id"
                  :get-children="(n) => n.children"
                  :get-label="(n) => n.name"
                  :is-expandable="(n) => !!n.children"
                  v-model:expanded="expanded"
                  v-model:selected="selected"
                >
                  <template #default="{ node }">
                    <CoarTreeNodeLabel :label="node.name" />
                  </template>
                </CoarTree>
              </div>
            </section>
          </template>
          <template #second>
            <section class="wb-pane">
              <header class="wb-title">Details</header>
              <div class="wb-body">
                <p class="wb-muted">Selected: <strong>{{ selectedName }}</strong></p>
              </div>
            </section>
          </template>
        </CoarSplitPane>
      </template>

      <template #default>
        <div class="wb-content">Content / editor area</div>
      </template>

      <template #right>
        <section class="wb-pane">
          <header class="wb-title">Outline</header>
          <div class="wb-body"><p class="wb-muted">Any panel you like.</p></div>
        </section>
      </template>

      <template #bottom>
        <section class="wb-pane">
          <header class="wb-title">Problems</header>
          <div class="wb-body"><p class="wb-muted">No problems detected.</p></div>
        </section>
      </template>

      <template #status>
        <div class="wb-status"><span>Ready</span><span class="wb-spacer" /><span>UTF-8</span></div>
      </template>
    </CoarPanelLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarPanelLayout, CoarSplitPane, CoarTree, CoarTreeNodeLabel } from '@cocoar/vue-ui';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

const nodes: Node[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      { id: 'app', name: 'App.vue' },
      { id: 'main', name: 'main.ts' },
    ],
  },
  { id: 'readme', name: 'README.md' },
];

const expanded = ref(new Set<string>(['src']));
const selected = ref<string | null>('app');
const selectedName = computed(() => {
  const find = (list: Node[]): Node | undefined =>
    list.flatMap((n) => [n, ...(n.children ?? [])]).find((n) => n.id === selected.value);
  return find(nodes)?.name ?? 'nothing';
});

// Layout state — consumer-owned.
const leftW = ref(220);
const rightW = ref(180);
const botH = ref(110);
const detailsH = ref(96);
const leftOpen = ref(true);
const rightOpen = ref(true);
const botOpen = ref(true);
</script>

<style scoped>
.wb-frame {
  height: 420px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}
.wb-bar,
.wb-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--vp-c-bg-soft);
}
.wb-bar {
  height: 40px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.wb-status {
  height: 26px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-spacer {
  flex: 1;
}
.wb-btn {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--coar-text-neutral-secondary, #475569);
  font-size: 12px;
  cursor: pointer;
}
.wb-btn--on {
  background: var(--coar-color-accent, #3b82f6);
  border-color: var(--coar-color-accent, #3b82f6);
  color: #fff;
}
.wb-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--vp-c-bg-soft);
}
.wb-title {
  flex: 0 0 auto;
  height: 26px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-body {
  flex: 1 1 0;
  min-height: 0;
  padding: 4px 0;
}
.wb-scroll {
  overflow: auto;
}
.wb-muted {
  margin: 0;
  padding: 4px 12px;
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
.wb-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  color: var(--coar-text-neutral-tertiary, #6b7280);
}
</style>
```

```vue
<CoarPanelLayout v-model:left-width="leftW" :left-min="160" :left-max="360">
  <template #top>…toolbar…</template>
  <template #left>…sidebar…</template>
  <template #default>…content…</template>
  <template #right>…inspector…</template>
  <template #bottom>…panel…</template>
  <template #status>…status bar…</template>
</CoarPanelLayout>
```

```
┌───────────────────────────────────────┐
│  #top            (fixed, full width)   │
├────────┬────────────────────┬──────────┤
│ #left  │     #default        │  #right  │
│        ├────────────────────┤          │
│        │     #bottom         │          │
├────────┴────────────────────┴──────────┤
│  #status         (fixed, full width)   │
└───────────────────────────────────────┘
```

| Prop | Default | Notes |
|---|---|---|
| `leftWidth` / `rightWidth` / `bottomHeight` (`v-model`) | `240` / `280` / `200` | Controlled px sizes. Two-way, so persisting them (localStorage, user prefs) is a one-liner. |
| `leftOpen` / `rightOpen` / `bottomOpen` | `true` | Collapse a region without unmounting the rest. Render your own toggle button. |
| `leftMin/Max`, `rightMin/Max`, `bottomMin/Max` | `0` / `∞` | Per-region clamps. |
| `leftResizable` / `rightResizable` / `bottomResizable` | `true` | `false` fixes that region (no divider). |
| `contentMinWidth` / `contentMinHeight` | `120` / `80` | Floor the content region keeps — sidebars / the bottom panel can never be dragged (or a shrinking window squeeze them) past it, so **content is never crushed to 0**. Set to `0` to opt out. |

The `#bottom` panel sits **under the content, between the sidebars** (VS-Code default). `#top` and `#status` are fixed-height, full-width, and not resizable. Content is **protected by default**: a divider stops before the content region would drop below `contentMinWidth` / `contentMinHeight`, and that floor also holds as the window shrinks (the over-constrained edge clips rather than collapsing the content).

## Nesting — a panel within a region

Need a split *inside* a region — say a file tree above a details panel in the left sidebar? Nest a `CoarSplitPane`. Same divider, same behaviour:

```vue
<CoarPanelLayout :left-width="leftW">
  <template #left>
    <CoarSplitPane direction="column" side="second" v-model:size="detailsHeight" :min="80">
      <template #first><CoarTree … /></template>      <!-- tree fills -->
      <template #second>…details panel…</template>     <!-- sized, draggable -->
    </CoarSplitPane>
  </template>
  <template #default>…editor…</template>
</CoarPanelLayout>
```

This pairs naturally with the [file explorer](./file-explorer/index.md)'s `selectedAsset` + `describeAsset` for a tree-over-details sidebar.

## Accessibility

Each divider is a `role="separator"` with `aria-orientation`, `aria-valuenow/valuemin/valuemax`, and an `aria-label`. It's in the tab order — focus it and use **Arrow keys** to resize, **Home/End** to jump to min/max. Clicking a divider focuses it too.

## Scope

Resize and collapse are in. Drag-to-rearrange panels, tab docking, and floating panels are intentionally **out** — compose those on top if you need them.
