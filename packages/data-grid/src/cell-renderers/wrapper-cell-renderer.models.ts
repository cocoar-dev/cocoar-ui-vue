import type { Component } from 'vue';
import type { CoarIconSize } from '@cocoar/vue-ui';
import type { ICellRendererParams } from 'ag-grid-community';

/** Accessor that can be either a static value or a per-row function. */
export type WrapperSlotAccessor<TData, TValue> = TValue | ((row: TData) => TValue);

/** Icon-shorthand slot: renders a CoarIcon with optional click handler / tooltip. */
export interface WrapperIconSlotConfig<TData = unknown> {
  /** Icon name. Return `null`/empty string to hide for this row. */
  icon: WrapperSlotAccessor<TData, string | null | undefined>;
  /** Icon registry source (e.g. `'coar-builtin'`). */
  source?: string;
  /** Icon size (default: `'s'`). */
  size?: CoarIconSize;
  /** CSS color value (static or per-row). */
  color?: WrapperSlotAccessor<TData, string | undefined>;
  /** Tooltip text (static or per-row). */
  tooltip?: WrapperSlotAccessor<TData, string | undefined>;
  /** Click handler. When set, the slot becomes clickable and stops propagation. */
  onClick?: (row: TData, event: MouseEvent) => void;
  /** Optional visibility gate. Return `false` to hide the slot entirely (v-if). */
  show?: (row: TData) => boolean;
}

/** Component slot: mounts any Vue component with per-row props. */
export interface WrapperComponentSlotConfig<TData = unknown> {
  /** Vue component to mount. */
  component: Component;
  /** Build the component's props from the row (optional). */
  params?: (row: TData) => Record<string, unknown>;
  /** When set, the slot becomes clickable and stops propagation. */
  onClick?: (row: TData, event: MouseEvent) => void;
  /** Optional visibility gate. */
  show?: (row: TData) => boolean;
}

/** Text slot: renders plain text (static or per-row). */
export interface WrapperTextSlotConfig<TData = unknown> {
  /** Text content. */
  text: WrapperSlotAccessor<TData, string | null | undefined>;
  /** Tooltip text. */
  tooltip?: WrapperSlotAccessor<TData, string | undefined>;
  /** When set, the slot becomes clickable and stops propagation. */
  onClick?: (row: TData, event: MouseEvent) => void;
  /** Optional visibility gate. */
  show?: (row: TData) => boolean;
}

/** Union of all supported slot shapes. Discriminated by the presence of `icon` / `component` / `text`. */
export type WrapperSlotItem<TData = unknown> =
  | WrapperIconSlotConfig<TData>
  | WrapperComponentSlotConfig<TData>
  | WrapperTextSlotConfig<TData>;

/**
 * Slot config: a single item or an ordered list of items.
 * Use an array to stack multiple icons/badges/components next to each other
 * (e.g. `[{ icon: ..., show: (r) => r.isCritical }, { icon: ..., show: (r) => r.awaitingFeedback }]`).
 */
export type WrapperSlotConfig<TData = unknown> =
  | WrapperSlotItem<TData>
  | WrapperSlotItem<TData>[];

/** Runtime config consumed by `WrapperCellRenderer` (attached via `cellRendererParams.config`). */
export interface WrapperCellRendererConfig<TData = unknown> {
  left?: WrapperSlotConfig<TData>;
  right?: WrapperSlotConfig<TData>;
  /** Inner cell renderer to embed between the slots. Falls back to `valueFormatted` / `value` text. */
  innerRenderer?: Component | null;
  /** Params forwarded to the inner renderer (merged with AG Grid's `ICellRendererParams`). */
  innerRendererParams?: Record<string, unknown>;
}

/** Type guard: icon-shorthand slot. */
export function isIconSlot<T>(slot: WrapperSlotItem<T>): slot is WrapperIconSlotConfig<T> {
  return (slot as WrapperIconSlotConfig<T>).icon !== undefined;
}

/** Type guard: component slot. */
export function isComponentSlot<T>(slot: WrapperSlotItem<T>): slot is WrapperComponentSlotConfig<T> {
  return (slot as WrapperComponentSlotConfig<T>).component !== undefined;
}

/** Type guard: text slot. */
export function isTextSlot<T>(slot: WrapperSlotItem<T>): slot is WrapperTextSlotConfig<T> {
  return (slot as WrapperTextSlotConfig<T>).text !== undefined;
}

/** Normalize a slot config to an array of items. */
export function toSlotItems<T>(slot: WrapperSlotConfig<T> | undefined): WrapperSlotItem<T>[] {
  if (!slot) return [];
  return Array.isArray(slot) ? slot : [slot];
}

/** @internal — resolve an accessor against a row. */
export function resolveAccessor<TData, TValue>(
  accessor: WrapperSlotAccessor<TData, TValue> | undefined,
  row: TData,
): TValue | undefined {
  if (accessor === undefined) return undefined;
  return typeof accessor === 'function'
    ? (accessor as (r: TData) => TValue)(row)
    : accessor;
}

/** Re-exported for convenience in tests / consumers. */
export type { ICellRendererParams };
