import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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

  it('survives an invalid validation.pattern (rule turns inert, submit still works)', async () => {
    const send = vi.fn();
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

    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });
    expect(wrapper.text()).toContain('Send');

    // The inert rule must neither crash the submit path nor block the action.
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid regular expression'));
  });

  it('applies pattern with FULL-STRING semantics (the documented contract)', async () => {
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

    const send = vi.fn();
    const valid = mount(CoarPageRenderer, {
      props: { schema: schemaFor('12345'), actions: { send } },
    });
    await valid.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);

    // '123a' CONTAINS digits — the old unanchored substring test wrongly accepted it.
    const blocked = vi.fn();
    const invalid = mount(CoarPageRenderer, {
      props: { schema: schemaFor('123a'), actions: { send: blocked } },
    });
    await invalid.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(blocked).not.toHaveBeenCalled();
    expect(invalid.text()).toContain('Invalid format');
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

describe('CoarPageRenderer — validation contract', () => {
  const validatesButton: PageNode['children'][number] = {
    id: 'b', type: 'button', label: 'Send', action: 'send', validates: true,
  } as never;

  it('keeps the validating button clickable and reveals errors on click instead of running the action', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 's', type: 'select', name: 'plan', label: 'Plan',
          options: [{ value: 'a', label: 'A' }],
          validation: { required: true },
        },
        { id: 'c', type: 'checkbox', name: 'terms', label: 'Terms', validation: { required: true } },
        validatesButton,
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });

    const btn = wrapper.find('button.pb-button');
    expect(btn.attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).not.toContain('This field is required');

    await btn.trigger('click');
    await flushPromises();

    expect(send).not.toHaveBeenCalled();
    // Both the select's AND the checkbox's error can now surface.
    expect(wrapper.text()).toContain('This field is required');
  });

  it('awaits an async onValidate, maps its errors to fields, and blocks the action', async () => {
    const send = vi.fn();
    const onValidate = vi.fn().mockResolvedValue({ email: 'Already taken' });
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', label: 'Email', defaultValue: 'x@y.z' },
        validatesButton,
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send }, onValidate },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();

    expect(onValidate).toHaveBeenCalledWith({ email: 'x@y.z' });
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Already taken');

    // Editing the field clears the stale server error.
    await wrapper.find('input').setValue('new@y.z');
    expect(wrapper.text()).not.toContain('Already taken');
  });

  it('runs the action when the async onValidate comes back clean', async () => {
    const send = vi.fn();
    const onValidate = vi.fn().mockResolvedValue({});
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', defaultValue: 'x@y.z' },
        validatesButton,
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send }, onValidate },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();

    expect(send).toHaveBeenCalledWith({ email: 'x@y.z' });
  });

  it('disallowed subtrees neither contribute defaults nor veto validating buttons', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        // Disallowed AND invalid — must not block the button, must not leak a value.
        {
          id: 'hidden', type: 'text-input', name: 'secret', defaultValue: 'leak',
          validation: { required: true },
        },
        validatesButton,
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send }, config: { allowedElements: ['button'] } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).not.toHaveProperty('secret');
  });
});

describe('CoarPageRenderer — schema & config contract', () => {
  it('renders legacy column/row schemas by migrating on the fly', () => {
    const schema = {
      id: 'r',
      type: 'column',
      children: [{ id: 'p', type: 'paragraph', text: 'Legacy content' }],
    } as unknown as PageNode;

    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.find('.pb-stack').exists()).toBe(true);
    expect(wrapper.text()).toContain('Legacy content');
  });

  it('falls back to config.assetResolver when no assetResolver prop is given', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [{ id: 'i', type: 'image', assetId: 'a1', alt: 'pic' }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, config: { assetResolver: (id: string) => `/cdn/${id}` } },
    });
    expect(wrapper.find('img').attributes('src')).toBe('/cdn/a1');
  });

  it('wires inputType email through to the input element', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [{ id: 't', type: 'text-input', name: 'email', inputType: 'email' }],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('email');
    expect(input.attributes('autocomplete')).toBe('email');
  });
});
