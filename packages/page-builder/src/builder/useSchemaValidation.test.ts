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

  it('errors on an invalid validation.pattern', () => {
    const issues = validate(page([
      { id: 't', type: 'text-input', props: {}, name: 'x', validation: { pattern: '[' } },
    ]));
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 't', field: 'validation', severity: 'error' }),
    ]);
  });

  it('errors on unknown element types (runtime skips them silently)', () => {
    const schema = page([{ id: 'x', type: 'wat' } as unknown as PageNode]);
    const issues = validate(schema);
    expect(issues).toEqual([
      expect.objectContaining({ nodeId: 'x', field: 'type', severity: 'error' }),
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
