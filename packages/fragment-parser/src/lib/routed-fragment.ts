/**
 * Base interface for all routed fragments.
 * Extend this interface to create custom fragment types in your application.
 *
 * @example
 * ```typescript
 * export interface ModalFragment extends RoutedFragmentBase<ModalOptions> {
 *   type: 'modal';
 *   component: () => Promise<Component>;
 * }
 * ```
 */
export interface RoutedFragmentBase<TOptions = unknown> {
  type: string;
  path: string | string[];
  options?: TOptions;
}
