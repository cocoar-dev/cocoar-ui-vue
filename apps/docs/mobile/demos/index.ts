// The demos of the mobile docs. Adding one: a .vue file in this folder and an entry here; the
// docs show it with <PhoneFrame src="<id>" title="…" />. Groups appear on the home screen in the
// order of GROUPS.
import type { Component } from 'vue';

export const GROUPS = ['Forms', 'Sheets', 'Controls'] as const;

export interface MobileDemo {
  /** The address: #/<id>, and the `src` of a PhoneFrame. */
  id: string;
  title: string;
  /** One line under the title on the home screen. */
  description: string;
  group: (typeof GROUPS)[number];
  component: () => Promise<Component>;
  /** Site path of the matching docs page, e.g. `/components/select` or `/guide/mobile#x`. */
  docs?: string;
}

export const DEMOS: MobileDemo[] = [
  {
    id: 'form',
    title: 'Form',
    description: 'Inputs, selects, date, switch, dialog',
    group: 'Forms',
    component: () => import('./FormDemo.vue'),
    docs: '/components/form-field',
  },
  {
    id: 'sheet',
    title: 'Bottom sheet',
    description: 'A confirmation and a long form as sheets',
    group: 'Sheets',
    component: () => import('./SheetDemo.vue'),
    docs: '/components/dialog#sheet',
  },
  {
    id: 'controls',
    title: 'Control sizes',
    description: 'Buttons and inputs, xs to l',
    group: 'Controls',
    component: () => import('./ControlsDemo.vue'),
    docs: '/guide/mobile#supported-controls',
  },
];

export function findDemo(id: string) {
  return DEMOS.find((demo) => demo.id === id);
}
