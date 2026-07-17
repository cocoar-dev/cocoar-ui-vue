---
description: "CoarSplitPane and CoarPanelLayout — resizable split panes and a VS-Code-style workbench shell with top/left/content/right/bottom/status regions"
---

# Panel Layout <Badge type="warning" text="Preview" />

A VS-Code-style workbench: named, resizable regions you fill with whatever you like. Two pieces:

- **`CoarSplitPane`** — the primitive: two panes with a draggable divider. Nestable.
- **`CoarPanelLayout`** — a ready-made shell with `top / left / content / right / bottom / status` regions, built on `CoarSplitPane` so every divider feels identical.

```ts
import { CoarSplitPane, CoarPanelLayout } from '@cocoar/vue-ui';
```

The layout owns the arrangement and the drag-to-resize; **you own the contents** of every slot. Resizing works by pointer drag or arrow keys (the dividers are real `role="separator"` widgets).

## Split pane

`CoarSplitPane` lays out two slots — `#first` and `#second` — with a divider between them. The `side` pane carries a controlled px `size` (`v-model:size`); the other flexes. `direction="row"` gives a vertical divider (left/right); `direction="column"` gives a horizontal one (top/bottom).

<preview path="./panel-layout/demos/SplitPaneBasic.vue" />

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

<preview path="./panel-layout/demos/PanelLayoutWorkbench.vue" />

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

This pairs naturally with the [file explorer](/components/file-explorer/)'s `selectedAsset` + `describeAsset` for a tree-over-details sidebar.

## Accessibility

Each divider is a `role="separator"` with `aria-orientation`, `aria-valuenow/valuemin/valuemax`, and an `aria-label`. It's in the tab order — focus it and use **Arrow keys** to resize, **Home/End** to jump to min/max. Clicking a divider focuses it too.

## Scope

Resize and collapse are in. Drag-to-rearrange panels, tab docking, and floating panels are intentionally **out** — compose those on top if you need them.
