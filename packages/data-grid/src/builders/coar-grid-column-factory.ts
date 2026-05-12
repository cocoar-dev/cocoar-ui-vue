import { CoarGridColumnBuilder } from './coar-grid-column-builder';
import { CoarGridWrapperColumnBuilder } from './coar-grid-wrapper-column-builder';
import TagCellRenderer from '../cell-renderers/TagCellRenderer.vue';
import IconCellRenderer from '../cell-renderers/IconCellRenderer.vue';
import DateCellRenderer from '../cell-renderers/DateCellRenderer.vue';
import NumberCellRenderer from '../cell-renderers/NumberCellRenderer.vue';
import CurrencyCellRenderer from '../cell-renderers/CurrencyCellRenderer.vue';
import TreeCellRenderer from '../cell-renderers/TreeCellRenderer.vue';
import CoarCheckboxCellRenderer from '../cell-renderers/CoarCheckboxCellRenderer.vue';
import CoarCheckboxCellEditor from '../cell-renderers/CoarCheckboxCellEditor.vue';
import CoarTextCellEditor from '../cell-renderers/CoarTextCellEditor.vue';
import CoarNumberCellEditor from '../cell-renderers/CoarNumberCellEditor.vue';
import CoarSelectCellRenderer from '../cell-renderers/CoarSelectCellRenderer.vue';
import CoarSelectCellEditor from '../cell-renderers/CoarSelectCellEditor.vue';
import CoarMultiSelectCellRenderer from '../cell-renderers/CoarMultiSelectCellRenderer.vue';
import CoarMultiSelectCellEditor from '../cell-renderers/CoarMultiSelectCellEditor.vue';
import CoarTagSelectCellEditor from '../cell-renderers/CoarTagSelectCellEditor.vue';
import type { TagCellRendererConfig } from '../cell-renderers/tag-cell-renderer.models';
import type { IconCellRendererConfig } from '../cell-renderers/icon-cell-renderer.models';
import type { DateCellRendererConfig } from '../cell-renderers/date-cell-renderer.models';
import type { NumberCellRendererConfig } from '../cell-renderers/number-cell-renderer.models';
import type { CurrencyCellRendererConfig } from '../cell-renderers/currency-cell-renderer.models';
import type { TreeCellRendererConfig } from '../cell-renderers/tree-cell-renderer.models';
import { CheckboxColumnConfigurator } from '../configurators/CheckboxColumnConfigurator';
import { TextColumnConfigurator } from '../configurators/TextColumnConfigurator';
import { NumberColumnConfigurator } from '../configurators/NumberColumnConfigurator';
import { SelectColumnConfigurator } from '../configurators/SelectColumnConfigurator';
import { MultiSelectColumnConfigurator } from '../configurators/MultiSelectColumnConfigurator';
import { TagSelectColumnConfigurator } from '../configurators/TagSelectColumnConfigurator';

/**
 * Factory for creating typed column builders.
 * Provides convenient methods for common column types.
 *
 * @example
 * ```ts
 * // In column definitions:
 * CoarGridBuilder.create<User>()
 *   .columns([
 *     col => col.field('name').header('Name').flex(1),
 *     col => col.field('createdAt').header('Created').width(150),
 *     col => col.tag('status', { variantMap: { active: 'success' } }),
 *     col => col.icon('type', { size: 's' }),
 *   ])
 * ```
 */
export class CoarGridColumnFactory<TData = unknown> {
  /**
   * Create a column builder for the given field
   */
  field<TValue = unknown>(fieldName: keyof TData | string): CoarGridColumnBuilder<TData, TValue> {
    return new CoarGridColumnBuilder<TData, TValue>(fieldName);
  }

  /**
   * Create a date column with locale-aware rendering.
   *
   * Uses the localization system (`useL10n().fmtDate()`) for formatting,
   * so the display updates reactively on language change.
   *
   * @param config - Optional configuration (e.g. `{ includeTime: true }`)
   */
  date(
    fieldName: keyof TData | string,
    config?: DateCellRendererConfig
  ): CoarGridColumnBuilder<TData, Date | string> {
    const builder = new CoarGridColumnBuilder<TData, Date | string>(fieldName);
    builder.cellRendererConfig(DateCellRenderer, config ?? {});
    builder.sortable();
    return builder;
  }

  /**
   * Create a number column with locale-aware rendering.
   *
   * Uses the localization system (`useL10n().fmtNumber()`) for formatting,
   * so the display updates reactively on locale change.
   *
   * Two forms — both work, no breaking change:
   * - **Config-object** (legacy): `col.number('amount', { decimals: 2 })`
   * - **Configurator callback** (new): `col.number('amount', n => n.decimals(2).min(0).max(100))`
   *
   * The callback form bundles `CoarNumberCellEditor` automatically, so adding
   * `.editable(true)` on the outer chain enables Coar-styled in-cell editing.
   * The config-object form keeps current behavior (renderer only).
   *
   * @param configOrCallback - Plain config object or a configurator callback
   */
  number(
    fieldName: keyof TData | string,
    configOrCallback?: NumberCellRendererConfig | ((n: NumberColumnConfigurator) => NumberColumnConfigurator),
  ): CoarGridColumnBuilder<TData, number> {
    const builder = new CoarGridColumnBuilder<TData, number>(fieldName);
    if (typeof configOrCallback === 'function') {
      const config = configOrCallback(new NumberColumnConfigurator()).build();
      builder.cellRendererConfig(NumberCellRenderer, config);
      builder.cellEditorConfig(CoarNumberCellEditor, config);
    } else {
      builder.cellRendererConfig(NumberCellRenderer, configOrCallback ?? {});
    }
    builder.sortable();
    return builder;
  }

  /**
   * Create a text column.
   *
   * Uses AG Grid's default text rendering for display. When chained with
   * `.editable(true)` (or a row-predicate), opens `CoarTextCellEditor` on
   * double-click / Enter / F2 — visual consistency with form text inputs,
   * plus AG Grid's standard Tab-through-edit-mode navigation.
   *
   * @example
   * ```ts
   * // simple editable text column
   * col.text('name').editable(true)
   *
   * // with editor config
   * col.text('email', t => t.placeholder('user@example.com').maxLength(120))
   *    .editable(true)
   *
   * // gated by row state
   * col.text('comment', t => t.maxLength(500)).editable(row => !row.locked)
   * ```
   */
  text(
    fieldName: keyof TData | string,
    configurator?: (t: TextColumnConfigurator) => TextColumnConfigurator,
  ): CoarGridColumnBuilder<TData, string> {
    const config = configurator ? configurator(new TextColumnConfigurator()).build() : {};
    const builder = new CoarGridColumnBuilder<TData, string>(fieldName);
    builder.cellEditorConfig(CoarTextCellEditor, config);
    builder.sortable();
    return builder;
  }

  /**
   * Create a currency column with locale-aware rendering.
   *
   * Uses the localization system (`useL10n().fmtCurrency()`) for formatting,
   * so the display updates reactively on locale change.
   *
   * @param config - Optional configuration (e.g. `{ currencyCode: 'EUR' }`)
   */
  currency(
    fieldName: keyof TData | string,
    config?: CurrencyCellRendererConfig
  ): CoarGridColumnBuilder<TData, number> {
    const builder = new CoarGridColumnBuilder<TData, number>(fieldName);
    builder.cellRendererConfig(CurrencyCellRenderer, config ?? {});
    builder.sortable();
    return builder;
  }

  /**
   * Create a boolean column (displays Yes/No or custom values)
   */
  boolean(
    fieldName: keyof TData | string,
    options: { trueValue?: string; falseValue?: string } = {}
  ): CoarGridColumnBuilder<TData, boolean> {
    const { trueValue = 'Yes', falseValue = 'No' } = options;
    const builder = new CoarGridColumnBuilder<TData, boolean>(fieldName);

    // AG Grid infers `cellDataType: 'boolean'` by default, which uses a checkbox renderer.
    // For this factory we want the formatted label (Yes/No) to be displayed instead.
    builder.option('cellDataType', false);

    builder.valueFormatter((params) => {
      if (params.value === null || params.value === undefined) return '';
      return params.value ? trueValue : falseValue;
    });

    return builder;
  }

  /**
   * Create a select column.
   *
   * Renderer displays the LABEL of the option matching the cell value (falls
   * back to the raw value if no option matches). Editor opens a `<CoarSelect>`
   * dropdown on double-click / Enter / F2 — selecting an option auto-commits
   * via `cellValueChanged` and exits edit-mode.
   *
   * Whether the column is editable is gated by the column-level `editable()`
   * chain — same pattern as text/number/checkbox.
   *
   * @example
   * ```ts
   * const ROLES = [
   *   { value: 'eng', label: 'Engineer' },
   *   { value: 'des', label: 'Designer' },
   *   { value: 'mgr', label: 'Manager' },
   * ];
   *
   * col.select('role', s => s.options(ROLES)).editable(true)
   *
   * // dynamic options
   * col.select('parent', s => s.options(row => allowedParents(row))).editable(true)
   *
   * // searchable + clearable
   * col.select('country', s => s.options(COUNTRIES).searchable().clearable())
   *    .editable(true)
   * ```
   */
  select<T = unknown>(
    fieldName: keyof TData | string,
    configurator: (
      s: SelectColumnConfigurator<TData, T>,
    ) => SelectColumnConfigurator<TData, T>,
  ): CoarGridColumnBuilder<TData, T> {
    const config = configurator(new SelectColumnConfigurator<TData, T>()).build();
    const builder = new CoarGridColumnBuilder<TData, T>(fieldName);
    builder.cellRendererConfig(CoarSelectCellRenderer, config);
    builder.cellEditorConfig(CoarSelectCellEditor, config);
    builder.sortable();
    return builder;
  }

  /**
   * Create a multi-select column with a checkbox-list dropdown editor.
   *
   * Cell value is `T[]`. The renderer looks up labels from `options` and shows
   * them comma-separated by default; opt into chips via `.display('chips')`.
   * The editor opens a `<CoarMultiSelect>` dropdown that stays open while the
   * user toggles checkboxes — focus-preservation prevents AG Grid from
   * committing prematurely. Commit happens via the standard focus-loss path
   * (click outside / Tab / Enter), AG Grid pulls the final array via
   * `getValue()`.
   *
   * Whether the column is editable is gated by the column-level `.editable()`
   * chain — same pattern as text/number/select/checkbox.
   *
   * @example
   * ```ts
   * col.multiSelect('tags', s => s
   *   .options([{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }])
   *   .searchable()
   *   .showSelectAll()
   *   .display('chips')
   * ).editable(true)
   *
   * // row-aware options
   * col.multiSelect('perms', s => s.options(row => permsFor(row.role)))
   *    .editable(true)
   * ```
   */
  multiSelect<T = unknown>(
    fieldName: keyof TData | string,
    configurator: (
      s: MultiSelectColumnConfigurator<TData, T>,
    ) => MultiSelectColumnConfigurator<TData, T>,
  ): CoarGridColumnBuilder<TData, T[]> {
    const config = configurator(new MultiSelectColumnConfigurator<TData, T>()).build();
    const builder = new CoarGridColumnBuilder<TData, T[]>(fieldName);
    builder.cellRendererConfig(CoarMultiSelectCellRenderer, config);
    builder.cellEditorConfig(CoarMultiSelectCellEditor, config);
    builder.sortable();
    return builder;
  }

  /**
   * Create a tag-style multi-select column. Cell value is `T[]`.
   *
   * Same renderer as `col.multiSelect()` (comma-separated by default,
   * chips opt-in). The editor uses `<CoarTagSelect>` — selected values render
   * as removable chips inside the trigger, and the dropdown only lists
   * not-yet-selected options. With `.allowCreate()`, the user can type
   * free-form values that aren't in `options`; those round-trip into the cell
   * array verbatim, and the renderer falls back to `String(value)` for
   * unknown labels.
   *
   * @example
   * ```ts
   * col.tagSelect('skills', s => s
   *   .options([{ value: 'ts', label: 'TypeScript' }, { value: 'go', label: 'Go' }])
   *   .allowCreate()
   *   .display('chips')
   * ).editable(true)
   * ```
   */
  tagSelect<T = unknown>(
    fieldName: keyof TData | string,
    configurator: (
      s: TagSelectColumnConfigurator<TData, T>,
    ) => TagSelectColumnConfigurator<TData, T>,
  ): CoarGridColumnBuilder<TData, T[]> {
    const config = configurator(new TagSelectColumnConfigurator<TData, T>()).build();
    const builder = new CoarGridColumnBuilder<TData, T[]>(fieldName);
    builder.cellRendererConfig(CoarMultiSelectCellRenderer, config);
    builder.cellEditorConfig(CoarTagSelectCellEditor, config);
    builder.sortable();
    return builder;
  }

  /**
   * Create a checkbox column.
   *
   * The renderer is **always read-only** (`<CoarCheckbox>` with pointer-events
   * disabled) — the same pattern as text/number/select columns. To allow editing,
   * chain `.editable(true)` or `.editable(row => …)` on the outer column builder.
   * AG Grid then opens `<CoarCheckboxCellEditor>` on double-click / Enter / F2.
   * Inside edit-mode, Space toggles, Tab commits and moves to the next editable
   * cell (opening its editor), Enter commits, Escape cancels — standard AG Grid
   * keyboard navigation.
   *
   * Toggles fire `cellValueChanged` like any other editor commit, so a single
   * `gridBuilder.onCellValueChanged()` handler covers all column types.
   *
   * @example
   * ```ts
   * // readonly indicator
   * col.checkbox('done')
   *
   * // interactive (double-click → toggle → Tab to next editable cell)
   * col.checkbox('done').editable(true)
   *
   * // gated by row state
   * col.checkbox('done').editable(row => !row.locked)
   *
   * // with configurator (label / indeterminate / size)
   * col.checkbox('done', c => c.label('Done').size('s')).editable(true)
   * ```
   */
  checkbox(
    fieldName: keyof TData | string,
    configurator?: (c: CheckboxColumnConfigurator<TData>) => CheckboxColumnConfigurator<TData>,
  ): CoarGridColumnBuilder<TData, boolean> {
    const config = configurator
      ? configurator(new CheckboxColumnConfigurator<TData>()).build()
      : {};
    const builder = new CoarGridColumnBuilder<TData, boolean>(fieldName);
    // AG Grid auto-renders booleans as a native checkbox via cellDataType inference.
    // Disable that so our renderer + editor are the sole authority on display + edit.
    builder.option('cellDataType', false);
    builder.cellRendererConfig(CoarCheckboxCellRenderer, config);
    // Bundle the editor — only instantiated when AG Grid enters edit-mode (i.e. when
    // the user chained .editable(...)). Override via .cellEditorConfig(...) if needed.
    builder.cellEditorConfig(CoarCheckboxCellEditor, config);
    builder.sortable();
    return builder;
  }

  /**
   * Create a tag column that renders values as `<CoarTag>` elements.
   *
   * Supports string (split by separator), array, and object array values.
   *
   * @param config - Tag rendering configuration (variantMap, size, i18nPrefix, etc.)
   */
  tag(
    fieldName: keyof TData | string,
    config?: TagCellRendererConfig
  ): CoarGridColumnBuilder<TData, string | string[]> {
    const builder = new CoarGridColumnBuilder<TData, string | string[]>(fieldName);
    builder.cellRendererConfig(TagCellRenderer, config ?? {});
    builder.sortable();

    // Alphabetical comparator on joined tag labels
    const separator = config?.separator ?? ',';
    builder.comparator((valueA, valueB) => {
      const normalize = (v: unknown): string => {
        if (Array.isArray(v)) return v.map(String).sort().join(',');
        if (typeof v === 'string')
          return v
            .split(separator)
            .map((s) => s.trim())
            .sort()
            .join(',');
        return String(v ?? '');
      };
      return normalize(valueA).localeCompare(normalize(valueB));
    });

    return builder;
  }

  /**
   * Create an icon column that renders values as `<CoarIcon>` elements.
   *
   * The cell value is used as the icon name.
   *
   * @param config - Icon rendering configuration (size, source, color, onClick)
   */
  icon(
    fieldName: keyof TData | string,
    config?: IconCellRendererConfig
  ): CoarGridColumnBuilder<TData, string> {
    const builder = new CoarGridColumnBuilder<TData, string>(fieldName);
    builder.cellRendererConfig(IconCellRenderer, config ?? {});
    return builder;
  }


  /**
   * Create a tree column with expand/collapse toggle, indentation, and optional child count.
   *
   * Requires `builder.treeData()` and `builder.openRows()` to be configured.
   *
   * @param config - Tree cell renderer configuration
   *
   * @example
   * ```ts
   * .columns([
   *   col => col.tree('name').header('Name').flex(1),
   * ])
   * ```
   */
  tree<TValue = unknown>(
    fieldName: keyof TData | string,
    config?: TreeCellRendererConfig
  ): CoarGridColumnBuilder<TData, TValue> {
    const builder = new CoarGridColumnBuilder<TData, TValue>(fieldName);
    builder.cellRendererConfig(TreeCellRenderer, config ?? {});
    return builder;
  }

  /**
   * Wrap an existing column builder with left/right decoration slots.
   *
   * The inner builder's ColDef is preserved in full — sort, filter, edit,
   * valueFormatter, comparator, quickFilter, cellRenderer etc. all continue
   * to work. Only the `cellRenderer` is replaced by a wrapper that renders
   * `left` slot → inner renderer → `right` slot in a flex row.
   *
   * Slot click handlers call `event.stopPropagation()` automatically so they
   * don't trigger row-click / cell-click events on the grid.
   *
   * @example
   * ```ts
   * col.wrap(col.field('name').header('Name').flex(1).sortable())
   *    .left({ icon: (r) => r.starred ? 'star-filled' : 'star-outline' })
   *    .right({ component: UnreadBadge, params: (r) => ({ count: r.unread }) })
   * ```
   */
  wrap<TValue = unknown>(
    inner: CoarGridColumnBuilder<TData, TValue>,
  ): CoarGridWrapperColumnBuilder<TData, TValue> {
    return new CoarGridWrapperColumnBuilder<TData, TValue>(inner);
  }
}
