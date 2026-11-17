import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { Component } from 'vue';
import CoarSelect from './select/CoarSelect.vue';
import CoarMultiSelect from './select/CoarMultiSelect.vue';
import CoarTagSelect from './select/CoarTagSelect.vue';
import CoarPlainDatePicker from './date-time/plain-date-picker/CoarPlainDatePicker.vue';
import CoarPlainDateTimePicker from './date-time/plain-date-time-picker/CoarPlainDateTimePicker.vue';
import CoarZonedDateTimePicker from './date-time/zoned-date-time-picker/CoarZonedDateTimePicker.vue';

/**
 * The mobile presentation (`.coar-mobile`, styles/tokens/mobile.css) is geometry, which
 * happy-dom does not lay out: the sizes themselves are checked in the playground
 * (apps/playground/e2e/mobile-controls.spec.ts). Here: the fields opt into the mobile
 * size scale, and the styles honour the invariant that nothing changes outside
 * `.coar-mobile` — every mobile token read outside such a rule carries a fallback.
 */

const fields: [string, Component, Record<string, unknown>][] = [
  ['CoarSelect', CoarSelect, { options: [{ value: 1, label: 'One' }] }],
  ['CoarMultiSelect', CoarMultiSelect, { options: [{ value: 1, label: 'One' }], modelValue: [] }],
  ['CoarTagSelect', CoarTagSelect, { options: [{ value: 1, label: 'One' }], modelValue: [] }],
  ['CoarPlainDatePicker', CoarPlainDatePicker, {}],
  ['CoarPlainDateTimePicker', CoarPlainDateTimePicker, {}],
  ['CoarZonedDateTimePicker', CoarZonedDateTimePicker, {}],
];

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('mobile size scale of the fields', () => {
  it.each(fields)('%s opts its frame into the mobile size scale', (_, component, props) => {
    wrapper = mount(component, { props });
    const frame = wrapper.find('.coar-input-frame');
    expect(frame.exists()).toBe(true);
    expect(frame.classes()).toContain('coar-input-frame--mobile-sizing');
  });
});

// Vitest blanks style blocks, so read the sources from disk. A non-literal specifier
// keeps @types/node out of the package typecheck (as in CoarOverlayOutlet.test.ts).
async function readSource(path: string): Promise<string> {
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  // A plain path from the file: URL — happy-dom's URL does not resolve file: URLs.
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  return fs.readFileSync(`${dir}/${path}`, 'utf8');
}

/** The innermost rules of a style block: selector and declarations, comments removed. */
function rulesOf(source: string): { selector: string; body: string }[] {
  const style = source.slice(source.indexOf('<style'));
  const css = style.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), (m) => ({
    selector: m[1].trim(),
    body: m[2],
  }));
}

/** What each component must read, by file: the wiring of its mobile floors. */
const expectations: Record<string, string[]> = {
  'input-frame/CoarInputFrameButton.vue': ['--coar-control-min-target-size'],
  'select/CoarSelect.vue': [
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
    '--coar-control-clear-opacity',
  ],
  'select/CoarMultiSelect.vue': [
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
    '--coar-control-clear-opacity',
  ],
  'select/CoarTagSelect.vue': ['--coar-control-min-font-size', '--coar-control-min-target-size'],
  'select/CoarSelectDropdownPanel.vue': [
    '--coar-control-row-min-height',
    '--coar-control-min-font-size',
  ],
  'select/CoarMultiSelectDropdownPanel.vue': [
    '--coar-control-row-min-height',
    '--coar-control-min-font-size',
  ],
  'select/CoarTagSelectDropdownPanel.vue': [
    '--coar-control-row-min-height',
    '--coar-control-min-font-size',
  ],
  'date-time/plain-date-picker/CoarPlainDatePicker.vue': [
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
    '--coar-control-clear-opacity',
  ],
  'date-time/plain-date-time-picker/CoarPlainDateTimePicker.vue': [
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
    '--coar-control-clear-opacity',
  ],
  'date-time/zoned-date-time-picker/CoarZonedDateTimePicker.vue': [
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
    '--coar-control-clear-opacity',
  ],
  'menu/CoarMenuItem.vue': ['--coar-control-row-min-height', '--coar-control-min-font-size'],
  'menu/CoarSubFlyout.vue': ['--coar-control-row-min-height', '--coar-control-min-font-size'],
  'menu/CoarSubExpand.vue': ['--coar-control-row-min-height', '--coar-control-min-font-size'],
  'listbox/CoarListbox.vue': ['--coar-control-row-min-height', '--coar-control-min-font-size'],
  'segmented-control/CoarSegmentedControl.vue': [
    '--coar-control-xs-height',
    '--coar-control-s-height',
    '--coar-control-m-height',
    '--coar-control-l-height',
    '--coar-control-min-font-size',
    '--coar-control-min-target-size',
  ],
  'tabs/CoarTabGroup.vue': ['--coar-control-min-target-size', '--coar-control-min-font-size'],
  'otp-input/CoarOtpInput.vue': [
    '--coar-control-xs-height',
    '--coar-control-s-height',
    '--coar-control-m-height',
    '--coar-control-l-height',
    '--coar-control-min-font-size',
  ],
  'pagination/CoarPagination.vue': [
    '--coar-control-min-target-size',
    '--coar-control-min-font-size',
  ],
  'tag/CoarTag.vue': ['--coar-control-min-target-size'],
};

describe('mobile floors in the styles', () => {
  it.each(Object.entries(expectations))('%s reads its mobile tokens', async (file, tokens) => {
    const source = await readSource(file);
    for (const token of tokens) expect(source, token).toContain(`var(${token}`);
  });

  it.each(Object.keys(expectations))(
    '%s reads mobile tokens outside .coar-mobile only with a fallback',
    async (file) => {
      const unguarded = rulesOf(await readSource(file))
        .filter((rule) => !rule.selector.includes('.coar-mobile'))
        .flatMap((rule) =>
          Array.from(rule.body.matchAll(/var\((--coar-control-[\w-]+)\s*([,)])/g))
            .filter((m) => m[2] === ')')
            .map((m) => `${rule.selector}: ${m[1]}`),
        );
      expect(unguarded).toEqual([]);
    },
  );

  it('the list rows reach the row floor with their padding counted', async () => {
    for (const file of [
      'select/CoarSelectDropdownPanel.vue',
      'select/CoarMultiSelectDropdownPanel.vue',
      'select/CoarTagSelectDropdownPanel.vue',
    ]) {
      const rules = rulesOf(await readSource(file));
      expect(
        rules.some(
          (r) =>
            r.selector.split(',').some((selector) => selector.trim() === '.coar-mobile .coar-select-option') &&
            /box-sizing:\s*border-box/.test(r.body),
        ),
        file,
      ).toBe(true);
    }
  });

  it('the listbox keeps the row floor out of virtual mode, whose rows the itemHeight prop positions', async () => {
    const rules = rulesOf(await readSource('listbox/CoarListbox.vue'));
    const floors = rules.filter((r) => r.body.includes('--coar-control-row-min-height'));
    expect(floors.length).toBeGreaterThan(0);
    for (const rule of floors) expect(rule.selector).toContain(':not(.coar-listbox-list--virtual)');
  });

  it.each([
    ['tag/CoarTag.vue', '.coar-mobile .coar-tag__close::after'],
    ['select/CoarTagSelect.vue', '.coar-mobile .coar-tag-select-tag-remove::after'],
  ])('%s enlarges the remove target with a hit area only', async (file, selector) => {
    const rule = rulesOf(await readSource(file)).find((r) => r.selector === selector);
    expect(rule, selector).toBeDefined();
    expect(rule!.body).toContain('position: absolute');
    expect(rule!.body).toContain('var(--coar-control-min-target-size)');
  });
});
