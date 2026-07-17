import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSchemaValidation } from './useSchemaValidation';
import type { PageConfig, PageNode } from '../schema';

function validate(schema: PageNode, config?: PageConfig) {
  return useSchemaValidation(ref(schema), ref(config)).issues.value;
}

const page = (children: PageNode[]): PageNode => ({ id: 'root', type: 'page', children });

describe('useSchemaValidation', () => {
  it('reports nothing for a clean schema', () => {
    const issues = validate(page([
      { id: 'h', type: 'heading', props: { text: 'Hi', level: 2 } },
      { id: 'b', type: 'button', props: { label: 'Go', action: 'go' } },
    ]));
    expect(issues).toEqual([]);
  });

  it('warns about buttons and links without an action', () => {
    const issues = validate(page([
      { id: 'b', type: 'button', props: { label: 'Go' } },
      { id: 'l', type: 'link', props: { label: 'There' } },
    ]));
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === 'warning' && i.field === 'action')).toBe(true);
  });

  it('warns about actions outside config.availableActions', () => {
    const issues = validate(
      page([{ id: 'b', type: 'button', props: { label: 'Go', action: 'nope' } }]),
      { availableActions: [{ id: 'go', label: 'Go' }] },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('"nope"');
  });

  it('errors on images without an asset id', () => {
    const issues = validate(page([{ id: 'i', type: 'image', props: { assetId: '' } }]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'i', severity: 'error', field: 'assetId' }),
    ]);
  });

  it('errors on duplicate field names (both nodes flagged)', () => {
    const issues = validate(page([
      { id: 't1', type: 'text-input', props: {}, name: 'email' },
      { id: 't2', type: 'text-input', props: {}, name: 'email' },
    ]));
    expect(issues.map((i) => i.nodeId).sort()).toEqual(['t1', 't2']);
    expect(issues.every((i) => i.severity === 'error')).toBe(true);
  });

  it('warns when optionsSourceId is set without config.optionsSource', () => {
    const schema = page([
      { id: 's', type: 'select', props: { optionsSourceId: 'countries' }, name: 'c' },
    ]);
    expect(validate(schema)).toEqual([
      expect.objectContaining({ nodeId: 's', field: 'optionsSourceId', severity: 'warning' }),
    ]);
    expect(validate(schema, { optionsSource: () => Promise.resolve([]) })).toEqual([]);
  });

  it('warns when visibleWhen references a field that is not on the page', () => {
    const issues = validate(page([
      { id: 'ok', type: 'checkbox', props: { label: 'OK' }, name: 'consent' },
      {
        id: 'h', type: 'heading', props: { text: 'Details' },
        visibleWhen: { field: 'missing', equals: true },
      },
      {
        id: 'h2', type: 'heading', props: { text: 'Fine' },
        visibleWhen: { field: 'consent', equals: true },
      },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'h', field: 'visibleWhen', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('"missing"');
  });

  it('warns on circular visibleWhen chains including self-references', () => {
    const selfRef = validate(page([
      {
        id: 'a', type: 'checkbox', props: { label: 'A' }, name: 'a',
        visibleWhen: { field: 'a', equals: true },
      },
    ]));
    expect(selfRef).toEqual([
      expect.objectContaining({ nodeId: 'a', field: 'visibleWhen', severity: 'warning' }),
    ]);
    expect(selfRef[0].message).toContain('circular');

    const mutual = validate(page([
      {
        id: 'a', type: 'checkbox', props: { label: 'A' }, name: 'a',
        visibleWhen: { field: 'b', equals: true },
      },
      {
        id: 'b', type: 'checkbox', props: { label: 'B' }, name: 'b',
        visibleWhen: { field: 'a', equals: true },
      },
    ]));
    expect(mutual.map((i) => i.nodeId).sort()).toEqual(['a', 'b']);
    expect(mutual.every((i) => i.message.includes('circular'))).toBe(true);
  });

  it('warns when multiple buttons claim default', () => {
    const issues = validate(page([
      { id: 'b1', type: 'button', props: { label: 'One', action: 'x', default: true } },
      { id: 'b2', type: 'button', props: { label: 'Two', action: 'y', default: true } },
    ]));
    const defaults = issues.filter((i) => i.field === 'default');
    expect(defaults.map((i) => i.nodeId).sort()).toEqual(['b1', 'b2']);
    expect(defaults.every((i) => i.severity === 'warning')).toBe(true);
  });

  it('errors on reserved field names', () => {
    const issues = validate(page([
      { id: 't', type: 'text-input', props: {}, name: '__proto__' },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 't', field: 'name', severity: 'error' }),
    ]);
    expect(issues[0].message).toContain('reserved');
  });

  it('warns on a malformed visibleWhen', () => {
    const issues = validate(page([
      { id: 'h', type: 'heading', props: { text: 'Hi' }, visibleWhen: {} as never },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'h', field: 'visibleWhen', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('malformed');
  });

  it('errors on an invalid validation.pattern', () => {
    const issues = validate(page([
      { id: 't', type: 'text-input', props: {}, name: 'x', validation: { pattern: '[' } },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 't', field: 'validation', severity: 'error' }),
    ]);
  });

  it('warns on unregistered element types (lossless — runtime skips them)', () => {
    const schema = page([{ id: 'x', type: 'wat' } as unknown as PageNode]);
    const issues = validate(schema);
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'x', field: 'type', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('"wat"');
  });

  it('errors on types excluded by config.allowedElements', () => {
    const issues = validate(
      page([{ id: 'i', type: 'image', props: { assetId: 'a1' } }]),
      { allowedElements: ['heading', 'button'] },
    );
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'i', field: 'type', severity: 'error' }),
    ]);
    expect(issues[0].message).toContain('allowedElements');
  });

  it('groups issues by node id', () => {
    const { byNodeId } = useSchemaValidation(
      ref(page([{ id: 'b', type: 'button', props: { label: 'Go' } }])),
      ref(undefined),
    );
    expect(byNodeId.value.get('b')).toHaveLength(1);
    expect(byNodeId.value.get('root')).toBeUndefined();
  });
});

describe('useSchemaValidation — field contract', () => {
  const CONTRACT: PageConfig = {
    fields: [
      { name: 'username', valueType: 'string', required: true },
      { name: 'rememberMe', valueType: 'boolean' },
    ],
  };

  it('errors on names outside the contract (allowCustomFields off)', () => {
    const issues = validate(
      page([{ id: 't', type: 'text-input', name: 'nickname', props: {} }]),
      { ...CONTRACT, fields: [...CONTRACT.fields!] },
    );
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 't', field: 'name', severity: 'error' }),
    ]));
    expect(issues.find((i) => i.nodeId === 't')!.message).toContain('"nickname"');
  });

  it('allows custom names when allowCustomFields is set', () => {
    const issues = validate(
      page([{ id: 't', type: 'text-input', name: 'nickname', props: {} }]),
      { ...CONTRACT, allowCustomFields: true },
    );
    expect(issues.filter((i) => i.nodeId === 't')).toEqual([]);
  });

  it('errors on type-incompatible bindings', () => {
    const issues = validate(
      page([{ id: 's', type: 'switch', name: 'username', props: { label: 'U' } }]),
      CONTRACT,
    );
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 's', field: 'name', severity: 'error' }),
    ]));
    expect(issues.find((i) => i.nodeId === 's')!.message).toContain('(string)');
  });

  it('warns (on the root) while a required contract field is unbound', () => {
    const issues = validate(
      page([{ id: 'r1', type: 'checkbox', name: 'rememberMe', props: { label: 'R' } }]),
      CONTRACT,
    );
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'root', field: 'fields', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('"username"');
  });

  it('is silent when every required field is bound compatibly', () => {
    const issues = validate(
      page([
        { id: 't', type: 'text-input', name: 'username', props: {}, validation: { required: true } },
        { id: 'c', type: 'checkbox', name: 'rememberMe', props: { label: 'R' } },
      ]),
      CONTRACT,
    );
    expect(issues).toEqual([]);
  });
});
