<script setup lang="ts">
import { computed, ref, watch, type VNode } from 'vue';
import CoarTab from './CoarTab.vue';

const props = withDefaults(
  defineProps<{
    /** Currently active tab id (controlled mode) */
    modelValue?: string;
  }>(),
  { modelValue: undefined },
);

const emit = defineEmits<{
  (e: 'update:modelValue', tabId: string): void;
}>();

const slots = defineSlots<{
  default?(): VNode[];
}>();

interface TabDef {
  id: string;
  disabled: boolean;
  loadingStrategy: 'lazy' | 'eager';
  labelSlot: VNode[];
  contentSlot: VNode[];
}

const tabs = computed<TabDef[]>(() => {
  const children = slots.default?.() ?? [];
  const result: TabDef[] = [];

  for (const vnode of flattenFragments(children)) {
    if (vnode.type === CoarTab) {
      const vnodeProps = (vnode.props ?? {}) as Record<string, unknown>;
      const id = String(vnodeProps.id ?? '');
      if (!id) continue;

      const disabled =
        vnodeProps.disabled === true ||
        vnodeProps.disabled === '' ||
        vnodeProps.disabled === 'true';
      const loadingStrategy =
        (vnodeProps.loadingStrategy as string) ??
        (vnodeProps['loading-strategy'] as string) ??
        'lazy';

      const vnodeChildren = vnode.children as Record<
        string,
        (...args: unknown[]) => VNode[]
      > | null;
      const labelSlot = vnodeChildren?.default?.() ?? [];
      const contentSlot = vnodeChildren?.content?.() ?? [];

      result.push({
        id,
        disabled,
        loadingStrategy: loadingStrategy as 'lazy' | 'eager',
        labelSlot,
        contentSlot,
      });
    }
  }

  return result;
});

function flattenFragments(vnodes: VNode[]): VNode[] {
  const result: VNode[] = [];
  for (const vnode of vnodes) {
    if (
      vnode.type === Symbol.for('v-fgt') ||
      (vnode.type as unknown as symbol) === Symbol.for('v-fgt')
    ) {
      // Fragment — recurse into children
      if (Array.isArray(vnode.children)) {
        result.push(...flattenFragments(vnode.children as VNode[]));
      }
    } else {
      result.push(vnode);
    }
  }
  return result;
}

// Track which tabs have been activated (for lazy rendering)
const activatedTabs = ref(new Set<string>());

const internalActive = ref('');

const activeTabId = computed(() => {
  return props.modelValue ?? internalActive.value;
});

// Auto-select first non-disabled tab when none is active
watch(
  tabs,
  (tabList) => {
    if (!activeTabId.value && tabList.length > 0) {
      const first = tabList.find((t) => !t.disabled) ?? tabList[0];
      selectTab(first.id);
    }
  },
  { immediate: true },
);

// Track activated tabs for lazy rendering
watch(
  activeTabId,
  (id) => {
    if (id) activatedTabs.value.add(id);
  },
  { immediate: true },
);

function selectTab(tabId: string) {
  const tab = tabs.value.find((t) => t.id === tabId);
  if (!tab || tab.disabled) return;

  internalActive.value = tabId;
  emit('update:modelValue', tabId);
}

function shouldRender(tab: TabDef): boolean {
  if (tab.loadingStrategy === 'eager') return true;
  // Lazy: render only if this tab has been activated at some point
  return activatedTabs.value.has(tab.id);
}

function onKeydown(event: KeyboardEvent) {
  const enabledTabs = tabs.value.filter((t) => !t.disabled);
  const currentIndex = enabledTabs.findIndex((t) => t.id === activeTabId.value);
  let newIndex: number;

  switch (event.key) {
    case 'ArrowLeft':
      newIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
      event.preventDefault();
      break;
    case 'ArrowRight':
      newIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
      event.preventDefault();
      break;
    case 'Home':
      newIndex = 0;
      event.preventDefault();
      break;
    case 'End':
      newIndex = enabledTabs.length - 1;
      event.preventDefault();
      break;
    default:
      return;
  }

  if (newIndex !== currentIndex) {
    const newTab = enabledTabs[newIndex];
    selectTab(newTab.id);
    // Focus the button
    const el = document.getElementById(newTab.id);
    el?.focus();
  }
}
</script>

<template>
  <div class="coar-tab-group">
    <div class="coar-tab-list" role="tablist">
      <button
        v-for="tab in tabs"
        :id="tab.id"
        :key="tab.id"
        type="button"
        role="tab"
        class="coar-tab-button"
        :class="{
          active: activeTabId === tab.id,
          disabled: tab.disabled,
        }"
        :aria-selected="activeTabId === tab.id"
        :aria-controls="'panel-' + tab.id"
        :data-tab-id="tab.id"
        :tabindex="activeTabId === tab.id ? 0 : -1"
        :disabled="tab.disabled"
        @click="selectTab(tab.id)"
        @keydown="onKeydown"
      >
        <span class="coar-tab-label">
          <component :is="() => tab.labelSlot" />
        </span>
      </button>
    </div>

    <div class="coar-tab-content">
      <div
        v-for="tab in tabs"
        :id="'panel-' + tab.id"
        :key="tab.id"
        role="tabpanel"
        class="coar-tab-panel"
        :class="{ active: activeTabId === tab.id }"
        :aria-labelledby="tab.id"
        :hidden="activeTabId !== tab.id"
      >
        <template v-if="shouldRender(tab)">
          <component :is="() => tab.contentSlot" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-tab-group {
  display: flex;
  flex-direction: column;
}

.coar-tab-list {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-tab-button {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-m) var(--coar-spacing-l);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: 500;
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    border-color var(--coar-duration-fast) var(--coar-ease-out);
  white-space: nowrap;
}

.coar-tab-label {
  display: inline-block;
}

.coar-tab-button:hover:not(.disabled) {
  color: var(--coar-text-accent-primary);
}

.coar-tab-button:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
  border-radius: var(--coar-radius-xs) var(--coar-radius-xs) 0 0;
}

.coar-tab-button.active {
  color: var(--coar-text-accent-primary);
  border-bottom-color: var(--coar-border-accent-primary);
}

.coar-tab-button.disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-tab-panel {
  display: none;
}

.coar-tab-panel.active {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .coar-tab-button {
    transition-duration: 0s;
  }
}
</style>
