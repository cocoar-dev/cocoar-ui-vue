# Tabs

Organize related content into separate panels that users switch between without leaving the page. Tabs are ideal for settings screens, detail views, and any layout where showing everything at once would feel overwhelming. The active tab is controlled via `v-model`, so you can read or set it programmatically.

```ts
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';
```

## Basic Tabs

Define your tabs inside a `CoarTabGroup` and render the matching panel content with `v-if` on the active tab ID. Users can click tabs or use the keyboard to switch between them.

<preview path="./tabs/demos/TabsBasic.vue" />

## Settings Pattern

Tabs shine in settings pages where each category has its own form section. This pattern keeps the page compact and scannable while giving each section room to breathe.

<preview path="./tabs/demos/TabsSettings.vue" />

## Disabled Tabs

Disable individual tabs to prevent access to sections that are not yet available, require a higher permission level, or depend on completing a previous step first.

<preview path="./tabs/demos/TabsDisabled.vue" />

## Actions in the Tab Bar

Use the `#actions` slot to put right-aligned controls on the same row as the tab labels — typical uses include undo/redo buttons, a refresh icon, filter toggles, or an overflow menu. The slot stays out of the way when unused: consumers that never populate it get the exact same layout as before.

<preview path="./tabs/demos/TabsWithActions.vue" />

## Fill-Height Tabs

By default `CoarTabGroup` is content-sized — the panel grows to fit whatever you put inside it. Settings panes, form sections, anything documentation-shaped wants that. For **editor / viewer / file-explorer** tabs, where the content is expected to stretch (Monaco, PDF viewer, anything VSCode-shaped), opt in with the `fill` prop.

<preview path="./tabs/demos/TabsFill.vue" />

The consumer is still responsible for sizing the tab-group root — `fill` only propagates the height **down** through the internal wrappers. Typical wiring:

```vue
<!-- Your view -->
<div class="my-view">
  <CoarTabGroup fill>
    <CoarTab id="editor">
      <template #content>
        <MonacoEditor />          <!-- now sees a flex parent that fills -->
      </template>
    </CoarTab>
  </CoarTabGroup>
</div>

<style scoped>
.my-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.my-view :deep(.coar-tab-group) {
  flex: 1;
  min-height: 0;
}
</style>
```

::: tip Why opt-in?
Without `fill`, the content wrapper is `display: block` — the active panel sizes to its children. That's the right default for the common case (form tabs, settings). Auto-fill would silently break every existing consumer whose tabs sit inside a taller container. Flipping it via a typed prop keeps the change additive and discoverable.
:::

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Left Arrow` / `Right Arrow` | Move between tabs |
| `Home` | First tab |
| `End` | Last tab |
| `Tab` | Move to panel content |

## API

### CoarTabGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `string` | first tab id | ID of the active tab |
| `fill` | `boolean` | `false` | Make the active panel fill the remaining vertical space below the tab bar. Opt-in for editor / viewer / file-explorer tabs. See [Fill-Height Tabs](#fill-height-tabs). |

### CoarTabGroup Slots

| Slot | Description |
|------|-------------|
| `default` | Contains one or more `CoarTab` children defining tabs and their panels. |
| `actions` | Optional right-aligned controls in the tab-list row. Rendered only when populated; empty-slot consumers see the standard layout. |

### CoarTab Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | Unique tab identifier (**required**) |
| `disabled` | `boolean` | `false` | Disable this tab |
| `loadingStrategy` | `'lazy' \| 'eager'` | `'lazy'` | `lazy`: content only rendered when active; `eager`: always in DOM |
