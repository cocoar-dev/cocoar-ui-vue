/** Shared option-mapping helper for the select-family element renderers. */
import type { CoarSelectOption } from '@cocoar/vue-ui';
import type { OptionItem } from '../schema';

export function toSelectOptions(options?: OptionItem[]): CoarSelectOption<string>[] {
  return (options ?? []).map((o) => ({ value: o.value, label: o.label }));
}
