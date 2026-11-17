// Deterministic data shared by the compact interaction scenes (`compact-interaction-*`).
// Synthetic; no clock, no randomness.
export const cityOptions = [
  { value: 'none', label: 'Kein Standort' },
  { value: 'vie', label: 'Wien', group: 'Österreich', icon: 'map-pin' },
  { value: 'grz', label: 'Graz', group: 'Österreich', icon: 'map-pin' },
  { value: 'lnz', label: 'Linz (geschlossen)', group: 'Österreich', icon: 'map-pin', disabled: true },
  { value: 'sbg', label: 'Salzburg', group: 'Österreich', icon: 'map-pin' },
  { value: 'ber', label: 'Berlin', group: 'Deutschland', icon: 'globe' },
  { value: 'muc', label: 'München', group: 'Deutschland', icon: 'globe' },
  { value: 'zrh', label: 'Zürich — Hauptsitz mit langem Namen', group: 'Schweiz', icon: 'globe' },
];

export const tagOptions = cityOptions
  .filter((option) => option.value !== 'none')
  .map(({ value, label, group, disabled }) => ({ value, label, group, disabled }));

/** The scene date of every picker scene; stories.json fixes the clock to the 10th. */
export const SCENE_CLOCK = '2026-03-10T09:00:00Z';
export const pickerDateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
