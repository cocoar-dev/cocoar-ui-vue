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
        { id: 'h', type: 'heading', props: { text: 'Still here', level: '1 onclick=alert(1)' } },
        { id: 'p', type: 'paragraph', props: { text: 'Sibling survives' } },
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
      children: [{ id: 'h', type: 'heading', props: { text: 'Five', level: 5 } }],
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
          props: { label: 'Code' },
          defaultValue: 'anything',
          validation: { pattern: '[' },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
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
          props: {},
          defaultValue,
          validation: { pattern: '\\d+' },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
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
        { id: 's', type: 'stack', props: {}, children: 'oops' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    } as unknown as PageNode;

    // The walkers (defaults/errors/touched) must not throw on it.
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Send');
  });
});

describe('CoarPageRenderer — validation contract', () => {
  const validatesButton: PageNode['children'][number] = {
    id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true },
  } as never;

  it('keeps the validating button clickable and reveals errors on click instead of running the action', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 's', type: 'select', name: 'plan',
          props: { label: 'Plan', options: [{ value: 'a', label: 'A' }] },
          validation: { required: true },
        },
        {
          id: 'c', type: 'checkbox', name: 'terms', props: { label: 'Terms' },
          validation: { required: true },
        },
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
        {
          id: 't', type: 'text-input', name: 'email', props: { label: 'Email' },
          defaultValue: 'x@y.z',
        },
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
        { id: 't', type: 'text-input', name: 'email', props: {}, defaultValue: 'x@y.z' },
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
          id: 'hidden', type: 'text-input', name: 'secret', props: {}, defaultValue: 'leak',
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

describe('CoarPageRenderer — expanded element set', () => {
  it('collects typed values from all new named inputs into the action payload', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 'n1', type: 'number-input', name: 'amount', props: { label: 'Amount' },
          defaultValue: 42,
        },
        {
          id: 's1', type: 'switch', name: 'newsletter', props: { label: 'Newsletter' },
          defaultValue: true,
        },
        {
          id: 'rg', type: 'radio-group', name: 'plan', defaultValue: 'pro',
          props: {
            label: 'Plan',
            options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }],
          },
        },
        {
          id: 'ms', type: 'multi-select', name: 'topics', defaultValue: ['a'],
          props: {
            label: 'Topics',
            options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
          },
        },
        {
          id: 'otp', type: 'otp-input', name: 'code', props: { label: 'Code' },
          defaultValue: '123456',
        },
        {
          id: 'd1', type: 'date-input', name: 'from', props: { label: 'From' },
          defaultValue: '2026-01-15',
        },
        {
          id: 'dt1', type: 'datetime-input', name: 'meeting', props: { label: 'Meeting' },
          defaultValue: '2026-01-15T09:30:00',
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send' } },
      ],
    };

    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();

    expect(send).toHaveBeenCalledWith({
      amount: 42,
      newsletter: true,
      plan: 'pro',
      topics: ['a'],
      code: '123456',
      from: '2026-01-15',
      meeting: '2026-01-15T09:30:00',
    });
  });

  it('required multi-select (empty array) and incomplete otp block a validating button', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 'ms', type: 'multi-select', name: 'topics',
          props: { label: 'Topics', options: [{ value: 'a', label: 'A' }] },
          validation: { required: true },
        },
        {
          id: 'otp', type: 'otp-input', name: 'code', props: { label: 'Code' },
          defaultValue: '123', validation: { required: true },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };

    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('This field is required');
  });

  it('a complete otp and a non-empty multi-select pass the required gate', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        {
          id: 'ms', type: 'multi-select', name: 'topics', defaultValue: ['a'],
          props: { options: [{ value: 'a', label: 'A' }] }, validation: { required: true },
        },
        {
          id: 'otp', type: 'otp-input', name: 'code', props: { length: 4 }, defaultValue: '1234',
          validation: { required: true },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };

    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('renders note, radio options and survives an unparsable date defaultValue', () => {
    const schema = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'note', type: 'note', props: { text: 'Heads up!', variant: 'warning' } },
        {
          id: 'rg', type: 'radio-group', name: 'plan',
          props: { options: [{ value: 'x', label: 'Option X' }] },
        },
        { id: 'd', type: 'date-input', name: 'from', props: {}, defaultValue: 'not-a-date' },
      ],
    } as unknown as PageNode;

    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Heads up!');
    expect(wrapper.text()).toContain('Option X');
    expect(wrapper.find('input[type="radio"]').exists()).toBe(true);
  });

  it('renders a multiline text-input as a textarea when rows > 1', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [{ id: 't', type: 'text-input', name: 'bio', props: { rows: 4 } }],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.find('textarea').exists()).toBe(true);
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

  it('renders and submits a v1 FLAT schema identically (on-the-fly props-bag migration)', async () => {
    const send = vi.fn();
    const schema = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'h', type: 'heading', text: 'Legacy title', level: 3 },
        {
          id: 't', type: 'text-input', name: 'email', label: 'Email',
          defaultValue: 'x@y.z', validation: { required: true },
        },
        { id: 'b', type: 'button', label: 'Send', action: 'send', validates: true },
      ],
    } as unknown as PageNode;

    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });
    expect(wrapper.find('h3').text()).toBe('Legacy title');
    expect(wrapper.text()).toContain('Email');

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: 'x@y.z' });
  });

  it('falls back to config.assetResolver when no assetResolver prop is given', () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [{ id: 'i', type: 'image', props: { assetId: 'a1', alt: 'pic' } }],
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
      children: [{ id: 't', type: 'text-input', name: 'email', props: { inputType: 'email' } }],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('email');
    expect(input.attributes('autocomplete')).toBe('email');
  });
});

describe('CoarPageRenderer — initialValues', () => {
  const schema: PageNode = {
    id: 'r',
    type: 'page',
    children: [
      {
        id: 't', type: 'text-input', name: 'email', props: { label: 'Email' },
        defaultValue: 'default@y.z',
      },
      { id: 'n', type: 'number-input', name: 'amount', props: {}, defaultValue: 5 },
      { id: 'b', type: 'button', props: { label: 'Send', action: 'send' } },
    ],
  };

  it('seeds host values over schema defaults', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send }, initialValues: { email: 'host@y.z' } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    // Seeded key wins; untouched defaults stay.
    expect(send).toHaveBeenCalledWith({ email: 'host@y.z', amount: 5 });
  });

  it('ignores keys that match no named field', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema, actions: { send },
        initialValues: { email: 'host@y.z', stray: 'never-leaks' },
      },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: 'host@y.z', amount: 5 });
    expect(send.mock.calls[0][0]).not.toHaveProperty('stray');
  });

  it('re-initializes when the prop reference is replaced', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send }, initialValues: { email: 'first@y.z' } },
    });
    expect(wrapper.find('input').element.value).toBe('first@y.z');

    await wrapper.setProps({ initialValues: { email: 'second@y.z' } });
    expect(wrapper.find('input').element.value).toBe('second@y.z');

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: 'second@y.z', amount: 5 });
  });
});
