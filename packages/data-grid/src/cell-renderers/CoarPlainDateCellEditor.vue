<script setup lang="ts">
/**
 * Cell editor backing `col.plainDate()`. Wraps `<CoarPlainDatePicker>` —
 * cell value is `Temporal.PlainDate | null`.
 *
 * Edit-mode lifecycle mirrors the other cell editors: focus the trigger on
 * mount so the picker handles its own keystrokes (Enter / Space opens the
 * panel, Escape closes); focus-preservation listener prevents AG Grid's
 * `stopEditingWhenCellsLoseFocus` from committing prematurely when the user
 * clicks inside the body-teleported panel.
 *
 * Commit happens via the standard focus-loss path — AG Grid pulls the final
 * value through `getValue()` on Tab / Enter (after selection) / click
 * outside.
 */
import { ref, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import type { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import type { CoarDateMarker, PlainDateCellEditorConfig } from './plain-date-cell-editor.models';
import { usePopupEditorFocusGuard } from './use-popup-editor-focus-guard';

/**
 * Cross-realm-safe Temporal type check. `instanceof Temporal.PlainDate` fails
 * when the picker (in @cocoar/vue-ui) constructs values against a different
 * polyfill copy than this package resolves under pnpm's isolated trees. The
 * `Symbol.toStringTag` is part of the Temporal spec and identical across
 * copies, so this check is robust.
 */
function isPlainDate(v: unknown): v is Temporal.PlainDate {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.PlainDate]';
}

const props = defineProps<{
  params: ICellEditorParams<unknown, Temporal.PlainDate | null> & {
    config?: PlainDateCellEditorConfig<unknown>;
  };
}>();

const config = props.params.config ?? {};

function resolveMarkers(): CoarDateMarker[] {
  const m = config.markers;
  if (typeof m === 'function') {
    const data = props.params.data as unknown;
    return data ? m(data) : [];
  }
  return m ?? [];
}

const value = ref<Temporal.PlainDate | null>(
  isPlainDate(props.params.value) ? props.params.value : null,
);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

usePopupEditorFocusGuard(rootRef);

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    // Focus the trigger so the picker's keyboard handlers (Enter/Space to
    // open, arrow keys to navigate) fire on keystrokes. Without focus, keys
    // bubble to the document.
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-plain-date-picker-trigger');
    trigger?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-plain-date-cell-editor">
    <CoarPlainDatePicker
      v-model="value"
      :size="config.size ?? 's'"
      :clearable="config.clearable ?? true"
      :min="config.min ?? null"
      :max="config.max ?? null"
      :show-week-numbers="config.showWeekNumbers ?? false"
      :highlight-weekends="config.highlightWeekends ?? false"
      :markers="resolveMarkers()"
      :locale="config.locale"
    />
  </div>
</template>

<style>
.coar-plain-date-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

/* Strip the picker's form-context border + radius so the AG Grid cell is the
   only edit-mode frame. Mirrors the pattern used by all other Coar cell
   editors. */
.coar-plain-date-cell-editor .coar-plain-date-picker-wrapper {
  width: 100%;
}
.coar-plain-date-cell-editor .coar-plain-date-picker-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
