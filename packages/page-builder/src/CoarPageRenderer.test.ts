import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarPageRenderer from './CoarPageRenderer.vue';
import type { PageNode } from './schema';

let warnSpy: MockInstance;
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe('CoarPageRenderer — tampered-schema robustness', () => {
  it('renders a tampered heading level as h2 instead of crashing the page', () => {
    const schema = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'h', type: 'heading', text: 'Still here', level: '1 onclick=alert(1)' },
        { id: 'p', type: 'paragraph', text: 'Sibling survives' },
      ],
    } as unknown as PageNode;

    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.find('h2').text()).toBe('Still here');
    expect(wrapper.text()).toContain('Sibling survives');
  });

  it('renders valid heading levels as the matching tag', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [{ id: 'h', type: 'heading', text: 'Five', level: 5 }],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.find('h5').exists()).toBe(true);
  });

  it('survives an invalid validation.pattern (rule turns inert, page still renders)', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 't',
          type: 'text-input',
          name: 'code',
          label: 'Code',
          defaultValue: 'anything',
          validation: { pattern: '[' },
        },
        { id: 'b', type: 'button', label: 'Send', action: 'send', validates: true },
      ],
    };

    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Send');
    // Inert rule → the field is valid → the validating button stays enabled.
    expect(wrapper.find('button.pb-button').attributes('disabled')).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid regular expression'));
  });

  it('applies pattern with FULL-STRING semantics (the documented contract)', () => {
    const schemaFor = (defaultValue: string): PageNode => ({
      id: 'r',
      type: 'page',
      children: [
        {
          id: 't',
          type: 'text-input',
          name: 'digits',
          defaultValue,
          validation: { pattern: '\\d+' },
        },
        { id: 'b', type: 'button', label: 'Send', action: 'send', validates: true },
      ],
    });

    const valid = mount(CoarPageRenderer, { props: { schema: schemaFor('12345') } });
    expect(valid.find('button.pb-button').attributes('disabled')).toBeUndefined();

    // '123a' CONTAINS digits — the old unanchored substring test wrongly accepted it.
    const invalid = mount(CoarPageRenderer, { props: { schema: schemaFor('123a') } });
    expect(invalid.find('button.pb-button').attributes('disabled')).toBeDefined();
  });

  it('tolerates a container whose children were tampered into a non-array', () => {
    const schema = {
      id: 'r',
      type: 'page',
      children: [
        { id: 's', type: 'stack', children: 'oops' },
        { id: 'b', type: 'button', label: 'Send', action: 'send', validates: true },
      ],
    } as unknown as PageNode;

    // The walkers (defaults/errors/touched) must not throw on it.
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Send');
  });
});
