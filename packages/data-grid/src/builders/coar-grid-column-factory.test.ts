import { describe, it, expect } from 'vitest';
import { CoarGridColumnFactory } from './coar-grid-column-factory';
import { CoarGridColumnBuilder } from './coar-grid-column-builder';
import TagCellRenderer from '../cell-renderers/TagCellRenderer.vue';
import IconCellRenderer from '../cell-renderers/IconCellRenderer.vue';
import DateCellRenderer from '../cell-renderers/DateCellRenderer.vue';
import NumberCellRenderer from '../cell-renderers/NumberCellRenderer.vue';
import CurrencyCellRenderer from '../cell-renderers/CurrencyCellRenderer.vue';
import CoarCheckboxCellRenderer from '../cell-renderers/CoarCheckboxCellRenderer.vue';
import CoarCheckboxCellEditor from '../cell-renderers/CoarCheckboxCellEditor.vue';
import CoarTextCellEditor from '../cell-renderers/CoarTextCellEditor.vue';
import CoarNumberCellEditor from '../cell-renderers/CoarNumberCellEditor.vue';
import CoarSelectCellRenderer from '../cell-renderers/CoarSelectCellRenderer.vue';
import CoarSelectCellEditor from '../cell-renderers/CoarSelectCellEditor.vue';
import CoarMultiSelectCellRenderer from '../cell-renderers/CoarMultiSelectCellRenderer.vue';
import CoarMultiSelectCellEditor from '../cell-renderers/CoarMultiSelectCellEditor.vue';
import CoarTagSelectCellEditor from '../cell-renderers/CoarTagSelectCellEditor.vue';

interface TestRow {
  id: number;
  name: string;
  amount: number;
  date: string;
  status: 'active' | 'inactive';
  tags: string;
  icon: string;
  isEnabled: boolean;
}

describe('CoarGridColumnFactory', () => {
  describe('field', () => {
    it('should create a column builder for a field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.field('name');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should create a column with correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.field('name').build();

      expect(colDef.field).toBe('name');
    });
  });

  describe('date', () => {
    it('should create a date column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.date('date');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.date('date').build();

      expect(colDef.field).toBe('date');
    });

    it('should configure the date cell renderer component', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.date('date').build();

      expect(colDef.cellRenderer).toBe(DateCellRenderer);
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.date('date').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should pass config via cellRendererParams', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const config = { includeTime: true };
      const colDef = factory.date('date', config).build();

      expect(colDef.cellRendererParams?.config).toEqual(config);
    });

    it('should use empty config when none provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.date('date').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });
  });

  describe('number', () => {
    it('should create a number column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.number('amount');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount').build();

      expect(colDef.field).toBe('amount');
    });

    it('should configure the number cell renderer component', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount').build();

      expect(colDef.cellRenderer).toBe(NumberCellRenderer);
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should pass config via cellRendererParams', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const config = { decimals: 2 };
      const colDef = factory.number('amount', config).build();

      expect(colDef.cellRendererParams?.config).toEqual(config);
    });

    it('should use empty config when none provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });

    it('should NOT bundle the editor for legacy config-object form', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount', { decimals: 2 }).build();

      expect(colDef.cellEditor).toBeUndefined();
      expect(colDef.cellRendererParams?.config).toEqual({ decimals: 2 });
    });

    it('should bundle the editor when called with a configurator callback', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.number('amount', (n) => n.decimals(2).min(0).max(100)).build();

      expect(colDef.cellRenderer).toBe(NumberCellRenderer);
      expect(colDef.cellEditor).toBe(CoarNumberCellEditor);
      // Both renderer and editor receive the same config
      expect(colDef.cellRendererParams?.config).toEqual({ decimals: 2, min: 0, max: 100 });
      expect(colDef.cellEditorParams?.config).toEqual({ decimals: 2, min: 0, max: 100 });
    });

    it('should accept all NumberColumnConfigurator chains', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .number('amount', (n) =>
          n.decimals(2).min(0).max(100).step(0.5).stepperButtons('both').placeholder('—').size('s'),
        )
        .build();

      expect(colDef.cellEditorParams?.config).toEqual({
        decimals: 2, min: 0, max: 100, step: 0.5, stepperButtons: 'both', placeholder: '—', size: 's',
      });
    });
  });

  describe('text', () => {
    it('should create a text column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.text('name');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').build();

      expect(colDef.field).toBe('name');
    });

    it('should bundle CoarTextCellEditor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').build();

      expect(colDef.cellEditor).toBe(CoarTextCellEditor);
    });

    it('should NOT set a custom renderer (uses AG Grid default)', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').build();

      expect(colDef.cellRenderer).toBeUndefined();
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should use empty config when no configurator provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').build();

      expect(colDef.cellEditorParams?.config).toEqual({});
    });

    it('should pass placeholder + maxLength + size through configurator', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .text('name', (t) => t.placeholder('Type a name').maxLength(80).size('s'))
        .build();

      expect(colDef.cellEditorParams?.config).toEqual({
        placeholder: 'Type a name',
        maxLength: 80,
        size: 's',
      });
    });

    it('should accept prefix + suffix through configurator', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name', (t) => t.prefix('@').suffix('.com')).build();

      expect(colDef.cellEditorParams?.config).toEqual({ prefix: '@', suffix: '.com' });
    });

    it('should compose with .editable() on the outer chain', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.text('name').editable(true).build();

      expect(colDef.cellEditor).toBe(CoarTextCellEditor);
      expect(colDef.editable).toBe(true);
    });
  });

  describe('select', () => {
    const ROLES = [
      { value: 'eng', label: 'Engineer' },
      { value: 'des', label: 'Designer' },
      { value: 'mgr', label: 'Manager' },
    ];

    it('should create a select column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.select('status', (s) => s.options([]));

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should bundle CoarSelectCellRenderer + CoarSelectCellEditor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.select('status', (s) => s.options(ROLES)).build();

      expect(colDef.cellRenderer).toBe(CoarSelectCellRenderer);
      expect(colDef.cellEditor).toBe(CoarSelectCellEditor);
    });

    it('should pass the same config to both renderer and editor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .select('status', (s) => s.options(ROLES).clearable().searchable().placeholder('Pick…'))
        .build();

      expect(colDef.cellRendererParams?.config).toEqual({
        options: ROLES,
        clearable: true,
        searchable: true,
        placeholder: 'Pick…',
      });
      expect(colDef.cellEditorParams?.config).toEqual({
        options: ROLES,
        clearable: true,
        searchable: true,
        placeholder: 'Pick…',
      });
    });

    it('should accept a row-aware options function', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const fn = (row: TestRow) => (row.status === 'active' ? ROLES : []);
      const colDef = factory.select('status', (s) => s.options(fn)).build();

      expect((colDef.cellEditorParams?.config as { options: unknown }).options).toBe(fn);
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.select('status', (s) => s.options(ROLES)).build();

      expect(colDef.sortable).toBe(true);
    });

    it('should compose with .editable() on the outer chain', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.select('status', (s) => s.options(ROLES)).editable(true).build();

      expect(colDef.cellEditor).toBe(CoarSelectCellEditor);
      expect(colDef.editable).toBe(true);
    });

    it('should allow override of the editor via cellEditorConfig (escape-hatch)', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const customEditor = {} as unknown as Parameters<
        CoarGridColumnBuilder<TestRow>['cellEditorConfig']
      >[0];
      const colDef = factory
        .select('status', (s) => s.options(ROLES))
        .cellEditorConfig(customEditor, { foo: 'bar' })
        .build();

      expect(colDef.cellEditor).toBe(customEditor);
      expect(colDef.cellEditorParams).toEqual({ config: { foo: 'bar' } });
    });
  });

  describe('multiSelect', () => {
    const TAGS = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
    ];

    it('should create a multiSelect column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.multiSelect('tags', (s) => s.options(TAGS));

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should bundle CoarMultiSelectCellRenderer + CoarMultiSelectCellEditor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.multiSelect('tags', (s) => s.options(TAGS)).build();

      expect(colDef.cellRenderer).toBe(CoarMultiSelectCellRenderer);
      expect(colDef.cellEditor).toBe(CoarMultiSelectCellEditor);
    });

    it('should pass full config (options + flags + display) to both renderer and editor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .multiSelect('tags', (s) =>
          s.options(TAGS).searchable().showSelectAll().clearable().display('chips'),
        )
        .build();

      const expected = {
        options: TAGS,
        searchable: true,
        showSelectAll: true,
        clearable: true,
        display: 'chips' as const,
      };
      expect(colDef.cellRendererParams?.config).toEqual(expected);
      expect(colDef.cellEditorParams?.config).toEqual(expected);
    });

    it('should accept a row-aware options function', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const fn = (row: TestRow) => (row.status === 'active' ? TAGS : []);
      const colDef = factory.multiSelect('tags', (s) => s.options(fn)).build();

      expect((colDef.cellEditorParams?.config as { options: unknown }).options).toBe(fn);
    });

    it('should compose with .editable() on the outer chain', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.multiSelect('tags', (s) => s.options(TAGS)).editable(true).build();

      expect(colDef.cellEditor).toBe(CoarMultiSelectCellEditor);
      expect(colDef.editable).toBe(true);
    });
  });

  describe('tagSelect', () => {
    const SKILLS = [
      { value: 'ts', label: 'TypeScript' },
      { value: 'go', label: 'Go' },
    ];

    it('should create a tagSelect column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.tagSelect('tags', (s) => s.options(SKILLS));

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should bundle CoarMultiSelectCellRenderer + CoarTagSelectCellEditor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tagSelect('tags', (s) => s.options(SKILLS)).build();

      // Renderer is shared with multiSelect; editor is the tag-style variant.
      expect(colDef.cellRenderer).toBe(CoarMultiSelectCellRenderer);
      expect(colDef.cellEditor).toBe(CoarTagSelectCellEditor);
    });

    it('should pass allowCreate + display through the config', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .tagSelect('tags', (s) => s.options(SKILLS).allowCreate().display('chips'))
        .build();

      expect(colDef.cellEditorParams?.config).toEqual({
        options: SKILLS,
        allowCreate: true,
        display: 'chips',
      });
    });

    it('should compose with .editable() on the outer chain', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tagSelect('tags', (s) => s.options(SKILLS)).editable(true).build();

      expect(colDef.cellEditor).toBe(CoarTagSelectCellEditor);
      expect(colDef.editable).toBe(true);
    });
  });

  describe('checkbox', () => {
    it('should create a checkbox column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.checkbox('isEnabled');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.field).toBe('isEnabled');
    });

    it('should configure the CoarCheckboxCellRenderer', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.cellRenderer).toBe(CoarCheckboxCellRenderer);
    });

    it('should disable AG Grid auto-checkbox via cellDataType: false', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.cellDataType).toBe(false);
    });

    it('should bundle CoarCheckboxCellEditor for interactive edit-mode', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.cellEditor).toBe(CoarCheckboxCellEditor);
    });

    it('should pass the same config to both renderer and editor', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .checkbox('isEnabled', (c) => c.label('Enabled').size('s'))
        .build();

      expect(colDef.cellRendererParams?.config).toEqual({ label: 'Enabled', size: 's' });
      expect(colDef.cellEditorParams?.config).toEqual({ label: 'Enabled', size: 's' });
    });

    it('should allow override of the cellEditor via cellEditorConfig (escape-hatch)', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const customEditor = {} as unknown as Parameters<
        CoarGridColumnBuilder<TestRow>['cellEditorConfig']
      >[0];
      const colDef = factory
        .checkbox('isEnabled')
        .cellEditorConfig(customEditor, { foo: 'bar' })
        .build();

      expect(colDef.cellEditor).toBe(customEditor);
      expect(colDef.cellEditor).not.toBe(CoarCheckboxCellEditor);
      expect(colDef.cellEditorParams).toEqual({ config: { foo: 'bar' } });
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should use empty config when no configurator provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });

    it('should pass label config through configurator', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled', (c) => c.label('Enabled')).build();

      expect(colDef.cellRendererParams?.config).toEqual({ label: 'Enabled' });
    });

    it('should pass size config through configurator', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled', (c) => c.size('s')).build();

      expect(colDef.cellRendererParams?.config).toEqual({ size: 's' });
    });

    it('should pass indeterminate predicate through configurator', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const fn = (row: TestRow) => row.amount > 0;
      const colDef = factory.checkbox('isEnabled', (c) => c.indeterminate(fn)).build();

      expect(
        (colDef.cellRendererParams?.config as { indeterminate: typeof fn }).indeterminate,
      ).toBe(fn);
    });

    it('should chain multiple configurator calls', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .checkbox('isEnabled', (c) => c.label('Enabled').size('s'))
        .build();

      expect(colDef.cellRendererParams?.config).toEqual({ label: 'Enabled', size: 's' });
    });

    it('should not set editable by default (read-only checkbox)', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').build();

      expect(colDef.editable).toBeUndefined();
    });

    it('should compose with .editable() on the outer chain', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.checkbox('isEnabled').editable(true).build();

      expect(colDef.cellRenderer).toBe(CoarCheckboxCellRenderer);
      expect(colDef.editable).toBe(true);
    });
  });

  describe('currency', () => {
    it('should create a currency column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.currency('amount');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.currency('amount').build();

      expect(colDef.field).toBe('amount');
    });

    it('should configure the currency cell renderer component', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.currency('amount').build();

      expect(colDef.cellRenderer).toBe(CurrencyCellRenderer);
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.currency('amount').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should pass config via cellRendererParams', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const config = { currencyCode: 'EUR' };
      const colDef = factory.currency('amount', config).build();

      expect(colDef.cellRendererParams?.config).toEqual(config);
    });

    it('should use empty config when none provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.currency('amount').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });
  });

  describe('boolean', () => {
    it('should create a boolean column', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.boolean('isEnabled');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should disable cell data type inference to avoid checkbox rendering', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.boolean('isEnabled').build();

      expect(colDef.cellDataType).toBe(false);
    });

    it('should format true as Yes by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.boolean('isEnabled').build();
      const formatter = colDef.valueFormatter as (params: { value: boolean }) => string;

      expect(formatter({ value: true })).toBe('Yes');
    });

    it('should format false as No by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.boolean('isEnabled').build();
      const formatter = colDef.valueFormatter as (params: { value: boolean }) => string;

      expect(formatter({ value: false })).toBe('No');
    });

    it('should support custom true/false values', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory
        .boolean('isEnabled', { trueValue: 'Active', falseValue: 'Inactive' })
        .build();
      const formatter = colDef.valueFormatter as (params: { value: boolean }) => string;

      expect(formatter({ value: true })).toBe('Active');
      expect(formatter({ value: false })).toBe('Inactive');
    });

    it('should handle null/undefined values', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.boolean('isEnabled').build();
      const formatter = colDef.valueFormatter as (params: { value: boolean | null }) => string;

      expect(formatter({ value: null })).toBe('');
    });
  });

  describe('tag', () => {
    it('should create a tag column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.tag('tags');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();

      expect(colDef.field).toBe('tags');
    });

    it('should configure the tag cell renderer component', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();

      expect(colDef.cellRenderer).toBe(TagCellRenderer);
    });

    it('should pass config via cellRendererParams', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const config = { variantMap: { active: 'success' as const }, size: 's' as const };
      const colDef = factory.tag('tags', config).build();

      expect(colDef.cellRendererParams?.config).toEqual(config);
    });

    it('should enable sorting by default', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();

      expect(colDef.sortable).toBe(true);
    });

    it('should set a comparator for tag sorting', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();

      expect(colDef.comparator).toBeDefined();
    });

    it('should sort string tag values alphabetically', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();
      const comparator = colDef.comparator as (a: unknown, b: unknown) => number;

      expect(comparator('b,a', 'a,b')).toBe(0); // same tags, different order
      expect(comparator('alpha', 'beta')).toBeLessThan(0);
      expect(comparator('beta', 'alpha')).toBeGreaterThan(0);
    });

    it('should sort array tag values alphabetically', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();
      const comparator = colDef.comparator as (a: unknown, b: unknown) => number;

      expect(comparator(['b', 'a'], ['a', 'b'])).toBe(0);
      expect(comparator(['alpha'], ['beta'])).toBeLessThan(0);
    });

    it('should use empty config when none provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.tag('tags').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });
  });

  describe('icon', () => {
    it('should create an icon column builder', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const builder = factory.icon('icon');

      expect(builder).toBeInstanceOf(CoarGridColumnBuilder);
    });

    it('should set the correct field', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.icon('icon').build();

      expect(colDef.field).toBe('icon');
    });

    it('should configure the icon cell renderer component', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.icon('icon').build();

      expect(colDef.cellRenderer).toBe(IconCellRenderer);
    });

    it('should pass config via cellRendererParams', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const config = { size: 's' as const, color: 'red' };
      const colDef = factory.icon('icon', config).build();

      expect(colDef.cellRendererParams?.config).toEqual(config);
    });

    it('should use empty config when none provided', () => {
      const factory = new CoarGridColumnFactory<TestRow>();
      const colDef = factory.icon('icon').build();

      expect(colDef.cellRendererParams?.config).toEqual({});
    });
  });

});
