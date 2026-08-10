import { describe, it, expect } from 'vitest';
import { defineComponent, ref } from 'vue';
import { useAuthoringFindings } from './useAuthoringFindings';
import type { PageConfig, PageNode } from '../schema';
import { elementNameBase } from './nodeDefaults';

function validate(schema: PageNode, config?: PageConfig) {
  return useAuthoringFindings(ref(schema), ref(config)).findings.value;
}

function addMissingNames(node: PageNode): PageNode {
  if (node.type === 'page') return { ...node, children: node.children.map(addMissingNames) };
  return {
    ...node,
    name: node.name || elementNameBase(node.id),
    ...('children' in node && Array.isArray(node.children)
      ? { children: node.children.map(addMissingNames) }
      : {}),
  } as PageNode;
}

const page = (children: PageNode[]): PageNode => ({
  id: 'root',
  type: 'page',
  children: children.map(addMissingNames),
});

describe('useAuthoringFindings', () => {
  it('reports nothing for a clean schema', () => {
    const issues = validate(page([
      { id: 'h', type: 'heading', props: { text: 'Hi', level: 2 } },
      { id: 'b', type: 'button', props: { label: 'Go', action: 'go' } },
    ]));
    expect(issues).toEqual([]);
  });

  it('warns that a size on the page root is ignored', () => {
    // The renderer drops these, and Page Root Code can still assign them, so
    // the author must be told rather than left wondering why nothing happens.
    const issues = validate({
      id: 'root',
      type: 'page',
      style: { height: '500px', maxHeight: '900px', padding: '24px' },
      children: [],
    });
    const sizing = issues.filter((i) => /Page size is owned/i.test(i.message));
    expect(sizing).toHaveLength(1);
    expect(sizing[0].severity).toBe('warning');
    expect(sizing[0].message).toContain('height');
    expect(sizing[0].message).toContain('maxHeight');
    // Padding is legitimate styling and must not be reported.
    expect(sizing[0].message).not.toContain('padding');
  });

  it('stays quiet when the page root carries no size', () => {
    const issues = validate({
      id: 'root',
      type: 'page',
      style: { padding: '24px', surface: 'subtle' },
      children: [],
    });
    expect(issues.filter((i) => /Page size is owned/i.test(i.message))).toHaveLength(0);
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

  it('validates the shared action contract for consumer action elements', () => {
    const issues = validate(
      page([{
        id: 'chip', type: 'acme-action', name: 'chip',
        props: {
          action: 'run',
          actionValues: [] as unknown as Record<string, unknown>,
          actionValueField: '__proto__',
          actionValue: new Date(),
        },
      }]),
      {
        elementTypes: {
          'acme-action': {
            renderer: defineComponent({ template: '<button />' }),
            action: true,
            builder: { label: { key: 'acme.action', fallback: 'Action chip' }, defaults: () => ({}) },
          },
        },
      },
    );

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'chip', field: 'actionValues', severity: 'error' }),
      expect.objectContaining({ nodeId: 'chip', field: 'actionValueField', severity: 'error' }),
      expect.objectContaining({ nodeId: 'chip', field: 'actionValue', severity: 'error' }),
    ]));
  });

  // Style presets are gone. A document written against an older version still
  // carries the key, and the rule is to report rather than strip it.
  it('reports a leftover stylePreset instead of silently ignoring it', () => {
    const schema = page([{ id: 'card', type: 'card', name: 'card', stylePreset: 'page-only', props: {}, children: [] }] as never);
    const issues = validate(schema, {});
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'card', field: 'stylePreset', severity: 'warning' }),
    ]));
  });

  it('validates field and selection bindings page-wide and item/index bindings in their Repeat', () => {
    const schema = page([
      { id: 'email', type: 'text-input', name: 'email', props: {} },
      {
        id: 'repeat', type: 'repeat', name: 'scopes',
        props: {
          contextPath: 'scopes', keyPath: 'id',
          selection: { name: 'approvedScopes', valuePath: 'id' },
        },
        children: [{
          id: 'inside', type: 'button', name: 'inside', props: { label: 'Inside', action: 'go' },
          bindings: {
            'actionValues.scopeId': { source: 'item', path: 'id' },
            'actionValues.scopeIndex': { source: 'index' },
          },
        }],
      },
      {
        id: 'outside', type: 'button', name: 'outside', props: { label: 'Outside', action: 'go' },
        bindings: {
          'actionValues.email': { source: 'field', path: 'email' },
          'actionValues.approvedScopes': { source: 'selection', path: 'approvedScopes' },
        },
      },
    ]);
    expect(validate(schema, {
      contextFields: [{ path: 'scopes', type: 'array', itemFields: [{ path: 'id', type: 'string' }] }],
    })).toEqual([]);

    const invalid = page([{
      id: 'outside', type: 'button', name: 'outside', props: { label: 'Outside', action: 'go' },
      bindings: {
        title: { source: 'index' },
        label: { source: 'selection', path: 'missingSelection' },
        disabled: { source: 'field', path: 'missingField' },
      },
    }]);
    const issues = validate(invalid);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'bindings.title', severity: 'error' }),
      expect.objectContaining({ field: 'bindings.label', severity: 'error' }),
      expect.objectContaining({ field: 'bindings.disabled', severity: 'error' }),
    ]));
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

  it('requires unique names for non-value elements too', () => {
    const issues = validate(page([
      { id: 'first', type: 'heading', name: 'title', props: { text: 'One' } },
      { id: 'second', type: 'paragraph', name: 'title', props: { text: 'Two' } },
    ]));
    expect(issues.filter((issue) => issue.field === 'name')).toHaveLength(2);
    expect(issues.every((issue) => issue.message.includes('Duplicate name'))).toBe(true);
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

  it('warns on containment loops — a field controlling its own ancestor container', () => {
    const issues = validate(page([
      {
        id: 'card', type: 'card', props: {},
        visibleWhen: { field: 'agree', equals: true },
        children: [
          { id: 'cb', type: 'checkbox', props: { label: 'Agree' }, name: 'agree' },
        ],
      },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'cb', field: 'visibleWhen', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('circular');
  });

  it('does not flag shared controllers or plain container gating as circular', () => {
    const issues = validate(page([
      { id: 'mode', type: 'select', props: { options: [{ value: 'a', label: 'A' }] }, name: 'mode' },
      {
        id: 'x', type: 'text-input', props: {}, name: 'x',
        visibleWhen: { field: 'mode', equals: 'a' },
      },
      {
        id: 'card', type: 'card', props: {}, visibleWhen: { field: 'mode', equals: 'a' },
        children: [{ id: 'y', type: 'text-input', props: {}, name: 'y' }],
      },
    ]));
    expect(issues).toEqual([]);
  });

  it('warns when equals targets a multi-value (string[]) controller', () => {
    const issues = validate(page([
      {
        id: 'ms', type: 'multi-select', props: { options: [{ value: 'a', label: 'A' }] },
        name: 'tags',
      },
      {
        id: 'h', type: 'heading', props: { text: 'Hi' },
        visibleWhen: { field: 'tags', equals: 'a' },
      },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'h', field: 'visibleWhen', severity: 'warning' }),
    ]);
    expect(issues[0].message).toContain('never match');
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
    const { byNodeId } = useAuthoringFindings(
      ref(page([{ id: 'b', type: 'button', props: { label: 'Go' } }])),
      ref(undefined),
    );
    expect(byNodeId.value.get('b')).toHaveLength(1);
    expect(byNodeId.value.get('root')).toBeUndefined();
  });
});

describe('useAuthoringFindings — field contract', () => {
  const CONTRACT: PageConfig = {
    dataContract: [
      { name: 'username', valueType: 'string', required: true },
      { name: 'rememberMe', valueType: 'boolean' },
    ],
  };

  it('errors on names outside the contract (allowCustomFields off)', () => {
    const issues = validate(
      page([{ id: 't', type: 'text-input', name: 'nickname', props: {} }]),
      { ...CONTRACT, dataContract: [...CONTRACT.dataContract!] },
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
