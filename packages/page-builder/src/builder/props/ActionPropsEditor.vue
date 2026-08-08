<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarButton,
  CoarFormField,
  CoarSelect,
  CoarTextInput,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { ActionProps, ElementNode, PageNode } from '../../schema';
import { isBindableActionValueField, isJsonSafeActionValue, isSafeActionValueField } from '../../actionValues';
import { BUILDER_CONFIG } from '../builderContext';
import BuilderFxButton from '../BuilderFxButton.vue';

type ActionNode = ElementNode<string, ActionProps>;

const props = defineProps<{
  node: ActionNode;
  patch: (update: Partial<PageNode>) => void;
}>();

const { t } = useI18n();
const config = inject(BUILDER_CONFIG);

const actionOptions = computed<CoarSelectOption<string>[] | null>(() => {
  const list = config?.value?.availableActions;
  if (!list?.length) return null;
  const seen = new Set<string>();
  const options: CoarSelectOption<string>[] = [
    { value: '', label: t('coar.pageBuilder.props.none', undefined, '— none') },
  ];
  for (const action of list) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    options.push({ value: action.id, label: action.label });
  }
  const current = props.node.props.action;
  if (current && !seen.has(current)) {
    options.push({
      value: current,
      label: t('coar.pageBuilder.props.notConfigured', { id: current }, '{id} (not configured)'),
    });
  }
  return options;
});

interface ValueRow {
  id: number;
  key: string;
  value: string;
  error?: string;
}

let nextRowId = 1;
const rows = ref<ValueRow[]>([]);
let lastCommittedStatic = '';

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 0) ?? 'null';
}

function rowStaticValue(row: ValueRow): unknown {
  try {
    return JSON.parse(row.value || 'null') as unknown;
  } catch {
    return undefined;
  }
}

function staticSignature(value: unknown): string {
  return JSON.stringify(value ?? {}) ?? '{}';
}

function rebuildRows(values: Record<string, unknown> | undefined) {
  rows.value = Object.entries(values ?? {}).map(([key, value]) => ({
    id: nextRowId++,
    key,
    value: formatJson(value),
  }));
}

watch(
  () => props.node.props.actionValues,
  (values) => {
    const signature = staticSignature(values);
    if (signature === lastCommittedStatic) return;
    lastCommittedStatic = signature;
    rebuildRows(values);
  },
  { immediate: true, deep: true },
);

function commitRows(bindingChange?: { remove?: string; renameFrom?: string; renameTo?: string }) {
  const next: Record<string, unknown> = Object.create(null);
  const seen = new Set<string>();
  let valid = true;
  for (const row of rows.value) {
    row.error = undefined;
    if (!isSafeActionValueField(row.key)) {
      row.error = row.key
        ? t('coar.pageBuilder.props.actionValueKeyReserved', undefined, 'This key is reserved.')
        : t('coar.pageBuilder.props.actionValueKeyRequired', undefined, 'Enter a key.');
      valid = false;
      continue;
    }
    if (seen.has(row.key)) {
      row.error = t('coar.pageBuilder.props.actionValueKeyDuplicate', undefined, 'This key is duplicated.');
      valid = false;
      continue;
    }
    seen.add(row.key);
    try {
      const value = JSON.parse(row.value) as unknown;
      if (!isJsonSafeActionValue(value)) {
        throw new TypeError(t('coar.pageBuilder.props.actionValueNotJsonSafe', undefined, 'Value is not JSON-safe.'));
      }
      next[row.key] = value;
    } catch (error) {
      row.error = error instanceof Error
        ? error.message
        : t('coar.pageBuilder.props.actionValueJsonRequired', undefined, 'Enter a JSON value.');
      valid = false;
    }
  }
  if (!valid) return;
  lastCommittedStatic = staticSignature(next);
  const bindings = { ...(props.node.bindings ?? {}) };
  let bindingsChanged = false;
  if (bindingChange?.remove && Object.hasOwn(bindings, `actionValues.${bindingChange.remove}`)) {
    delete bindings[`actionValues.${bindingChange.remove}`];
    bindingsChanged = true;
  }
  if (
    bindingChange?.renameFrom
    && bindingChange.renameTo
    && bindingChange.renameFrom !== bindingChange.renameTo
    && Object.hasOwn(bindings, `actionValues.${bindingChange.renameFrom}`)
  ) {
    bindings[`actionValues.${bindingChange.renameTo}`] = bindings[`actionValues.${bindingChange.renameFrom}`];
    delete bindings[`actionValues.${bindingChange.renameFrom}`];
    bindingsChanged = true;
  }
  props.patch({
    props: { actionValues: rows.value.length ? next : undefined },
    ...(bindingsChanged ? { bindings: Object.keys(bindings).length ? bindings : undefined } : {}),
  } as Partial<PageNode>);
}

function addRow() {
  rows.value.push({ id: nextRowId++, key: '', value: '""' });
}

function removeRow(index: number) {
  const key = rows.value[index]?.key;
  rows.value.splice(index, 1);
  commitRows(key ? { remove: key } : undefined);
}

function updateKey(row: ValueRow, value: string) {
  const previous = row.key;
  row.key = value;
  commitRows(
    previous && isBindableActionValueField(previous) && isBindableActionValueField(value)
      ? { renameFrom: previous, renameTo: value }
      : undefined,
  );
}

function updateValue(row: ValueRow, value: string) {
  row.value = value;
  commitRows();
}

const dynamicValueDraft = ref('null');
const dynamicValueError = ref('');
let lastCommittedDynamic = '';

watch(
  () => props.node.props.actionValue,
  (value) => {
    const signature = formatJson(value);
    if (signature === lastCommittedDynamic) return;
    lastCommittedDynamic = signature;
    dynamicValueDraft.value = signature;
    dynamicValueError.value = '';
  },
  { immediate: true, deep: true },
);

function updateDynamicValue(value: string) {
  dynamicValueDraft.value = value;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isJsonSafeActionValue(parsed)) {
      throw new TypeError(t('coar.pageBuilder.props.actionValueNotJsonSafe', undefined, 'Value is not JSON-safe.'));
    }
    dynamicValueError.value = '';
    lastCommittedDynamic = formatJson(parsed);
    props.patch({ props: { actionValue: parsed } } as Partial<PageNode>);
  } catch (error) {
    dynamicValueError.value = error instanceof Error
      ? error.message
      : t('coar.pageBuilder.props.actionValueJsonRequired', undefined, 'Enter a JSON value.');
  }
}

const dynamicFieldDraft = ref('');
const dynamicFieldError = ref('');

watch(
  () => props.node.props.actionValueField,
  (value) => {
    dynamicFieldDraft.value = value ?? '';
    dynamicFieldError.value = '';
  },
  { immediate: true },
);

function updateDynamicField(value: string) {
  dynamicFieldDraft.value = value;
  if (!value) {
    dynamicFieldError.value = '';
    props.patch({ props: { actionValueField: undefined } } as Partial<PageNode>);
    return;
  }
  if (!isSafeActionValueField(value)) {
    dynamicFieldError.value = t('coar.pageBuilder.props.actionValueKeyReserved', undefined, 'This key is reserved.');
    return;
  }
  dynamicFieldError.value = '';
  props.patch({ props: { actionValueField: value } } as Partial<PageNode>);
}
</script>

<template>
  <div class="pb-action-values" data-testid="action-props-editor">
    <CoarFormField
      :label="t('coar.pageBuilder.props.action', undefined, 'Action')"
      :hint="t('coar.pageBuilder.props.actionHint', undefined, 'Matched against the actions map at render time')"
    >
      <CoarSelect
        v-if="actionOptions"
        size="s"
        :model-value="props.node.props.action ?? ''"
        :options="actionOptions"
        @update:model-value="(value) => props.patch({ props: { action: (value as string) || undefined } } as Partial<PageNode>)"
      />
      <CoarTextInput
        v-else
        data-testid="action-id"
        size="s"
        :model-value="props.node.props.action ?? ''"
        placeholder="e.g. auth:set-language"
        @update:model-value="(value) => props.patch({ props: { action: value || undefined } } as Partial<PageNode>)"
      />
    </CoarFormField>

    <div class="pb-action-values__heading">
      <div>
        <strong>{{ t('coar.pageBuilder.props.staticActionValues', undefined, 'Static action values') }}</strong>
        <p>{{ t('coar.pageBuilder.props.staticActionValuesHint', undefined, 'Optional JSON values sent only by this element.') }}</p>
      </div>
      <CoarButton data-testid="add-action-value" size="s" variant="secondary" @click="addRow">
        {{ t('coar.pageBuilder.props.addActionValue', undefined, '+ Value') }}
      </CoarButton>
    </div>

    <p v-if="rows.length === 0" class="pb-action-values__empty">
      {{ t('coar.pageBuilder.props.noStaticActionValues', undefined, 'No static action values.') }}
    </p>
    <div v-for="(row, index) in rows" :key="row.id" class="pb-action-values__row">
      <CoarFormField :label="t('coar.pageBuilder.props.key', undefined, 'Key')">
        <CoarTextInput
          data-testid="action-value-key"
          size="s"
          :model-value="row.key"
          placeholder="language"
          @update:model-value="(value) => updateKey(row, value)"
        />
      </CoarFormField>
      <BuilderFxButton
        v-if="isBindableActionValueField(row.key)"
        :node="props.node"
        :target="`actionValues.${row.key}`"
        :label="t('coar.pageBuilder.props.valueJson', undefined, 'Value (JSON)')"
        :static-value="rowStaticValue(row)"
        :patch="props.patch"
      >
        <CoarTextInput
          data-testid="action-value-json"
          size="s"
          :model-value="row.value"
          placeholder='"de", 42, true, null, {…}'
          @update:model-value="(value) => updateValue(row, value)"
        />
      </BuilderFxButton>
      <CoarFormField v-else :label="t('coar.pageBuilder.props.valueJson', undefined, 'Value (JSON)')">
        <CoarTextInput
          data-testid="action-value-json"
          size="s"
          :model-value="row.value"
          placeholder='"de", 42, true, null, {…}'
          @update:model-value="(value) => updateValue(row, value)"
        />
      </CoarFormField>
      <p v-if="row.error" class="pb-action-values__error">{{ row.error }}</p>
      <button type="button" class="pb-action-values__remove" @click="removeRow(index)">
        {{ t('coar.pageBuilder.common.remove', undefined, 'Remove') }}
      </button>
    </div>

    <div class="pb-action-values__dynamic">
      <strong>{{ t('coar.pageBuilder.props.dynamicActionValue', undefined, 'Dynamic action value') }}</strong>
      <p>{{ t('coar.pageBuilder.props.dynamicActionValueHint', undefined, 'Optional single value. Bind actionValue with fx; the key stays static.') }}</p>
      <CoarFormField :label="t('coar.pageBuilder.props.key', undefined, 'Key')">
        <CoarTextInput
          data-testid="dynamic-action-value-key"
          size="s"
          :model-value="dynamicFieldDraft"
          placeholder="language"
          @update:model-value="updateDynamicField"
        />
      </CoarFormField>
      <p v-if="dynamicFieldError" class="pb-action-values__error">{{ dynamicFieldError }}</p>
      <BuilderFxButton
        :node="props.node"
        target="actionValue"
        :label="t('coar.pageBuilder.props.valueJson', undefined, 'Value (JSON)')"
        :static-value="props.node.props.actionValue"
        :patch="props.patch"
      >
        <CoarTextInput
          data-testid="dynamic-action-value-json"
          size="s"
          :model-value="dynamicValueDraft"
          placeholder='"de"'
          @update:model-value="updateDynamicValue"
        />
      </BuilderFxButton>
      <p v-if="dynamicValueError" class="pb-action-values__error">{{ dynamicValueError }}</p>
    </div>

    <p class="pb-action-values__precedence">
      {{ t('coar.pageBuilder.props.actionValuePrecedence', undefined, 'On key collisions, explicit action values override form values. A dynamic value overrides the same static action-value key.') }}
    </p>
  </div>
</template>

<style scoped>
.pb-action-values { display: flex; flex-direction: column; gap: 8px; }
.pb-action-values__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-top: 8px; }
.pb-action-values__heading strong,
.pb-action-values__dynamic strong { font-size: 12px; }
.pb-action-values__heading p,
.pb-action-values__dynamic p,
.pb-action-values__empty,
.pb-action-values__precedence { margin: 2px 0 0; color: var(--coar-text-neutral-secondary, #666); font-size: 11px; line-height: 1.4; }
.pb-action-values__row { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 6px; padding: 8px; border: 1px solid var(--coar-border-neutral-tertiary, #ddd); border-radius: 6px; }
.pb-action-values__error { grid-column: 1 / -1; margin: 0; color: var(--coar-text-semantic-error-bold, #b42318); font-size: 11px; }
.pb-action-values__remove { grid-column: 1 / -1; justify-self: end; padding: 0; border: 0; background: transparent; color: var(--coar-text-semantic-error-bold, #b42318); cursor: pointer; font-size: 11px; }
.pb-action-values__dynamic { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--coar-border-neutral-tertiary, #ddd); }
.pb-action-values__dynamic code { font-size: 10px; }
.pb-action-values__precedence { padding: 7px; border-radius: 5px; background: var(--coar-background-neutral-secondary, #f7f7f9); }
</style>
