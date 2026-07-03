<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '@cocoar/vue-ui';
import type { PageNode, NodeStyle } from '../schema';
import { BUILDER_API, BUILDER_VALIDATION } from './builderContext';
import type { NodePath } from './operations';
import { PROPS_REGISTRY } from './props/registry';
import StyleProps from './props/StyleProps.vue';

defineOptions({ name: 'BuilderPropsPanel' });

const { t } = useI18n();

const builder = inject(BUILDER_API)!;
const validation = inject(BUILDER_VALIDATION);

const node = computed(() => builder.selectedNode.value);
const path = computed(() => builder.selectedPath.value ?? []);

const entry = computed(() => (node.value ? PROPS_REGISTRY[node.value.type] : undefined));

const nodeIssues = computed(() =>
  node.value ? validation?.byNodeId.value.get(node.value.id) ?? [] : [],
);

function patch(update: Partial<PageNode>) {
  if (!path.value) return;
  builder.patch(path.value as NodePath, update);
}

function patchStyle(update: Partial<NodeStyle>) {
  if (!node.value) return;
  patch({ style: { ...(node.value.style ?? {}), ...update } } as Partial<PageNode>);
}
</script>

<template>
  <aside class="pb-props">
    <header class="pb-props__header">
      <CoarIcon name="settings" size="s" />
      <span class="pb-props__title">{{ t('coar.pageBuilder.props.panelTitle', undefined, 'Properties') }}</span>
    </header>

    <div v-if="!node" class="pb-props__empty">
      <CoarIcon name="settings" size="l" />
      <p class="pb-props__empty-title">{{ t('coar.pageBuilder.props.emptyTitle', undefined, 'No node selected') }}</p>
      <p class="pb-props__empty-hint">{{ t('coar.pageBuilder.props.emptyHint', undefined, 'Click a node in the outline or canvas to edit it.') }}</p>
    </div>

    <div v-else class="pb-props__body">
      <!-- ── Validation issues (warnings + errors for this node) ─────────── -->
      <ul v-if="nodeIssues.length > 0" class="pb-props__issues">
        <li
          v-for="(issue, i) in nodeIssues"
          :key="i"
          class="pb-props__issue"
          :class="`pb-props__issue--${issue.severity}`"
        >
          <CoarIcon
            :name="issue.severity === 'error' ? 'circle-alert' : 'triangle-alert'"
            size="s"
          />
          <span>{{ issue.message }}</span>
        </li>
      </ul>

      <!-- ── Element-specific section (delegated to per-type component) ─── -->
      <section v-if="entry" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t(entry.sectionTitleKey, undefined, entry.sectionTitleFallback) }}</h4>
        <component :is="entry.component" :node="node" :patch="patch" />
      </section>

      <!-- ── Universal style section ─────────────────────────────────────── -->
      <section
        v-if="node.type !== 'spacer'"
        class="pb-props__section"
        :class="{ 'pb-props__section--separated': !!entry }"
      >
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.style', undefined, 'Style') }}</h4>
        <StyleProps :node="node" :patch-style="patchStyle" />
      </section>
    </div>
  </aside>
</template>

<style scoped>
.pb-props {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--coar-surface-default, #fff);
  font-family: var(--coar-body-base-family, sans-serif);
}

.pb-props__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-props__title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-props__body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.pb-props__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pb-props__section--separated {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--coar-border-neutral-subtle, #eeeef0);
}

.pb-props__section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-props__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 16px;
  color: var(--coar-icon-neutral-disabled, #b0b0b6);
  text-align: center;
}

.pb-props__empty-title {
  margin: 8px 0 0;
  font-size: var(--coar-body-small-base-size, 14px);
  font-weight: 500;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-props__empty-hint {
  margin: 0;
  font-size: var(--coar-body-caption-size, 12px);
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-props__issues {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pb-props__issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.pb-props__issue--warning {
  background: var(--coar-surface-semantic-warning-subtle, #fef3c7);
  color: var(--coar-text-semantic-warning-bold, #92400e);
}

.pb-props__issue--error {
  background: var(--coar-surface-semantic-error-subtle, #fde8e4);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}
</style>
