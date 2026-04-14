/**
 * Represents a selectable option in select components.
 */
export interface CoarSelectOption<T = unknown> {
  /** The value stored when this option is selected */
  value: T;
  /** The display label shown in the dropdown and selected state */
  label: string;
  /** Whether this option is disabled and cannot be selected */
  disabled?: boolean;
  /** Optional group this option belongs to */
  group?: string;
  /** Optional icon to display next to the label */
  icon?: string;
}

/** Controls sorting of groups. 'asc' = alphabetical, 'desc' = reverse, 'none' = input order, or custom comparator. */
export type CoarSelectSortGroups = 'asc' | 'desc' | 'none' | ((a: string, b: string) => number);

/** Controls sorting of options (within each group, or all if ungrouped). 'asc'/'desc' sort by label, 'none' = input order, or custom comparator. */
export type CoarSelectSortOptions<T = unknown> = 'asc' | 'desc' | 'none' | ((a: CoarSelectOption<T>, b: CoarSelectOption<T>) => number);
