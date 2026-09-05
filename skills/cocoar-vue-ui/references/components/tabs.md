<!-- Generated from apps/docs/components/tabs.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Tabs

Organize related content into separate panels that users switch between without leaving the page. Tabs are ideal for settings screens, detail views, and any layout where showing everything at once would feel overwhelming. The active tab is controlled via `v-model`, so you can read or set it programmatically.

```ts
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';
```

## Basic Tabs

Define your tabs inside a `CoarTabGroup` and render the matching panel content with `v-if` on the active tab ID. Users can click tabs or use the keyboard to switch between them.

**Demo — `tabs/demos/TabsBasic.vue`**

```vue
<template>
  <div>
    <CoarTabGroup v-model="activeTab">
      <CoarTab id="overview">Overview</CoarTab>
      <CoarTab id="features">Features</CoarTab>
      <CoarTab id="api">API</CoarTab>
      <CoarTab id="examples">Examples</CoarTab>
    </CoarTabGroup>
    <div style="padding: 16px; border: 1px solid var(--coar-border-neutral-secondary); border-top: none; border-radius: 0 0 8px 8px; min-height: 100px;">
      <div v-if="activeTab === 'overview'">
        <h4 style="margin: 0 0 8px;">Overview</h4>
        <p style="font-size: 13px;">This is the overview content. It provides a high-level introduction to the component.</p>
      </div>
      <div v-else-if="activeTab === 'features'">
        <h4 style="margin: 0 0 8px;">Features</h4>
        <ul style="padding-left: 16px; display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
          <li>Keyboard navigation (Arrow keys, Home, End)</li>
          <li>ARIA tab panel pattern</li>
          <li>Controlled and uncontrolled modes</li>
          <li>Custom content in each panel</li>
        </ul>
      </div>
      <div v-else-if="activeTab === 'api'">
        <h4 style="margin: 0 0 8px;">API</h4>
        <p style="font-size: 13px;">Use <code>v-model</code> on <code>CoarTabGroup</code> to control the active tab programmatically.</p>
      </div>
      <div v-else-if="activeTab === 'examples'">
        <h4 style="margin: 0 0 8px;">Examples</h4>
        <p style="font-size: 13px;">See the demos below for more usage patterns.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';

const activeTab = ref('overview');
</script>
```

## Settings Pattern

Tabs shine in settings pages where each category has its own form section. This pattern keeps the page compact and scannable while giving each section room to breathe.

**Demo — `tabs/demos/TabsSettings.vue`**

```vue
<template>
  <div>
    <CoarTabGroup v-model="settingsTab">
      <CoarTab id="general">General</CoarTab>
      <CoarTab id="security">Security</CoarTab>
      <CoarTab id="notifications">Notifications</CoarTab>
      <CoarTab id="billing">Billing</CoarTab>
    </CoarTabGroup>
    <div style="padding: 16px; border: 1px solid var(--coar-border-neutral-secondary); border-top: none; border-radius: 0 0 8px 8px; min-height: 100px;">
      <div v-if="settingsTab === 'general'">
        <h4 style="margin: 0 0 8px;">General Settings</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Display name</span>
            <input type="text" value="John Doe" style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;" />
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Email</span>
            <input type="email" value="john@example.com" style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;" />
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Language</span>
            <select style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;">
              <option>English</option>
              <option>German</option>
            </select>
          </div>
        </div>
      </div>
      <div v-else-if="settingsTab === 'security'">
        <h4 style="margin: 0 0 8px;">Security Settings</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Manage your password and two-factor authentication settings.</p>
      </div>
      <div v-else-if="settingsTab === 'notifications'">
        <h4 style="margin: 0 0 8px;">Notification Preferences</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Choose how you want to be notified about account activity.</p>
      </div>
      <div v-else-if="settingsTab === 'billing'">
        <h4 style="margin: 0 0 8px;">Billing & Plans</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Manage your subscription and payment methods.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';

const settingsTab = ref('general');
</script>
```

## Disabled Tabs

Disable individual tabs to prevent access to sections that are not yet available, require a higher permission level, or depend on completing a previous step first.

**Demo — `tabs/demos/TabsDisabled.vue`**

```vue
<template>
  <CoarTabGroup>
    <CoarTab id="active1">Active</CoarTab>
    <CoarTab id="disabled1" :disabled="true">Disabled</CoarTab>
    <CoarTab id="active2">Active</CoarTab>
    <CoarTab id="disabled2" :disabled="true">Disabled</CoarTab>
  </CoarTabGroup>
</template>

<script setup lang="ts">
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';
</script>
```

## Actions in the Tab Bar

Use the `#actions` slot to put right-aligned controls on the same row as the tab labels — typical uses include undo/redo buttons, a refresh icon, filter toggles, or an overflow menu. The slot stays out of the way when unused: consumers that never populate it get the exact same layout as before.

**Demo — `tabs/demos/TabsWithActions.vue`**

```vue
<template>
  <div>
    <CoarTabGroup v-model="activeTab">
      <CoarTab id="daily">Daily</CoarTab>
      <CoarTab id="weekly">Weekly</CoarTab>
      <CoarTab id="monthly">Monthly</CoarTab>

      <template #actions>
        <button type="button" class="demo-action" title="Refresh" @click="refresh">
          <CoarIcon name="refresh-cw" size="s" />
        </button>
        <button type="button" class="demo-action" title="Export" @click="lastAction = 'Export clicked'">
          <CoarIcon name="download" size="s" />
        </button>
      </template>
    </CoarTabGroup>
    <div class="demo-panel">
      <p style="font-size: 13px; margin: 0 0 8px;">
        Viewing <strong>{{ activeTab }}</strong> report.
      </p>
      <p style="font-size: 12px; color: var(--coar-text-neutral-secondary); margin: 0;">
        Last action: {{ lastAction }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab, CoarIcon } from '@cocoar/vue-ui';

const activeTab = ref('daily');
const lastAction = ref('(none)');

function refresh() {
  lastAction.value = `Refreshed ${activeTab.value} at ${new Date().toLocaleTimeString()}`;
}
</script>

<style scoped>
.demo-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
}
.demo-action:hover {
  background: var(--coar-surface-neutral-subtle);
  border-color: var(--coar-border-neutral);
  color: var(--coar-icon-neutral-primary);
}

.demo-panel {
  padding: 16px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-top: none;
  border-radius: 0 0 8px 8px;
  min-height: 60px;
}
</style>
```

## Fill-Height Tabs

By default `CoarTabGroup` is content-sized — the panel grows to fit whatever you put inside it. Settings panes, form sections, anything documentation-shaped wants that. For **editor / viewer / file-explorer** tabs, where the content is expected to stretch (Monaco, PDF viewer, anything VSCode-shaped), opt in with the `fill` prop.

**Demo — `tabs/demos/TabsFill.vue`**

```vue
<template>
  <!-- 320 px frame so the fill effect is visible. In a real app this is your
       grid row / flex column / view-router outlet — the tab-group fills
       whatever its parent gives it. -->
  <div class="fill-frame">
    <CoarTabGroup v-model="activeTab" fill>
      <CoarTab id="editor">
        <template #default>Editor</template>
        <template #content>
          <div class="filling">
            Active panel fills <strong>{{ panelHeight }} px</strong> of vertical space —
            the entire frame minus the tab bar. Try removing the
            <code>fill</code> prop on <code>CoarTabGroup</code> to see this
            collapse back to content size.
          </div>
        </template>
      </CoarTab>
      <CoarTab id="preview">
        <template #default>Preview</template>
        <template #content>
          <div class="filling alt">
            Same fill behaviour, different content. Switching tabs is free —
            the fill semantics are on the panel, not the content.
          </div>
        </template>
      </CoarTab>
    </CoarTabGroup>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';

const activeTab = ref('editor');
const panelHeight = ref(0);

let raf: number | null = null;
const measure = () => {
  const panel = document.querySelector('.fill-frame .coar-tab-panel.active');
  if (panel) panelHeight.value = Math.round(panel.getBoundingClientRect().height);
  raf = requestAnimationFrame(measure);
};
onMounted(() => {
  raf = requestAnimationFrame(measure);
});
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf);
});
</script>

<style scoped>
/* The frame plays the role the consumer's parent layout plays — a sized
   ancestor (here: explicit height). The tab-group itself is `flex: 1; min-height: 0`
   so it fills the frame, then `fill` mode propagates the height down through
   the internal wrappers. */
.fill-frame {
  display: flex;
  flex-direction: column;
  height: 320px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  overflow: hidden;
}
.fill-frame :deep(.coar-tab-group) {
  flex: 1;
  min-height: 0;
}

.filling {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
  background: var(--coar-bg-neutral-secondary);
}
.filling.alt {
  background: var(--coar-bg-accent-subtle, var(--coar-bg-neutral-secondary));
}
.filling code {
  background: var(--coar-bg-neutral-tertiary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
```

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

> **Tip: Why opt-in?**
>
> Without `fill`, the content wrapper is `display: block` — the active panel sizes to its children. That's the right default for the common case (form tabs, settings). Auto-fill would silently break every existing consumer whose tabs sit inside a taller container. Flipping it via a typed prop keeps the change additive and discoverable.

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
