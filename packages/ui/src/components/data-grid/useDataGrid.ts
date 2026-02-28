import { ref, type Ref } from 'vue';
import { CoarGridBuilder } from './builders';

/**
 * Composable that creates a CoarGridBuilder for use with CoarDataGrid.
 *
 * @example
 * ```ts
 * const { builder } = useDataGrid<User>();
 *
 * builder.columns([
 *   col => col.field('name').header('Name').flex(1),
 *   col => col.field('email').header('Email').flex(1),
 * ]).rowDataRef(users);
 * ```
 *
 * @example
 * ```html
 * <CoarDataGrid :builder="builder" />
 * ```
 */
export function useDataGrid<TData = unknown>(): {
  builder: CoarGridBuilder<TData>;
  gridReady: Readonly<Ref<boolean>>;
} {
  const builder = CoarGridBuilder.create<TData>();

  return {
    builder,
    gridReady: builder.gridReady,
  };
}
