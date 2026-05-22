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
