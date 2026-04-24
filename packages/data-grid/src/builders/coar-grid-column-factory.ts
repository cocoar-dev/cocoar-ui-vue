import { CoarGridColumnBuilder } from './coar-grid-column-builder';
import { CoarGridWrapperColumnBuilder } from './coar-grid-wrapper-column-builder';
import TagCellRenderer from '../cell-renderers/TagCellRenderer.vue';
import IconCellRenderer from '../cell-renderers/IconCellRenderer.vue';
import DateCellRenderer from '../cell-renderers/DateCellRenderer.vue';
import NumberCellRenderer from '../cell-renderers/NumberCellRenderer.vue';
import CurrencyCellRenderer from '../cell-renderers/CurrencyCellRenderer.vue';
import TreeCellRenderer from '../cell-renderers/TreeCellRenderer.vue';
import type { TagCellRendererConfig } from '../cell-renderers/tag-cell-renderer.models';
import type { IconCellRendererConfig } from '../cell-renderers/icon-cell-renderer.models';
import type { DateCellRendererConfig } from '../cell-renderers/date-cell-renderer.models';
import type { NumberCellRendererConfig } from '../cell-renderers/number-cell-renderer.models';
import type { CurrencyCellRendererConfig } from '../cell-renderers/currency-cell-renderer.models';
import type { TreeCellRendererConfig } from '../cell-renderers/tree-cell-renderer.models';

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
   * @param config - Optional configuration (e.g. `{ decimals: 2 }`)
   */
  number(
    fieldName: keyof TData | string,
    config?: NumberCellRendererConfig
  ): CoarGridColumnBuilder<TData, number> {
    const builder = new CoarGridColumnBuilder<TData, number>(fieldName);
    builder.cellRendererConfig(NumberCellRenderer, config ?? {});
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
