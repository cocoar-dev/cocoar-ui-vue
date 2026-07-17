import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { h } from 'vue';
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

describe('CoarPageRenderer — submit lifecycle', () => {
  function deferred() {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  const emailField = {
    id: 't', type: 'text-input', name: 'email', props: { label: 'Email' }, defaultValue: 'x@y.z',
  };
  const submitButton = {
    id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true },
  };
  const pageWith = (...children: unknown[]): PageNode =>
    ({ id: 'r', type: 'page', children } as PageNode);

  let errorSpy: MockInstance;
  beforeEach(() => { errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  it('awaits an async action: the triggering button spins, others disable, reentry is blocked', async () => {
    const d = deferred();
    const send = vi.fn().mockReturnValue(d.promise);
    const other = vi.fn();
    const schema = pageWith(emailField, submitButton, {
      id: 'b2', type: 'button', props: { label: 'Other', action: 'other' },
    });
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send, other } } });

    const [submit, otherBtn] = wrapper.findAll('button.pb-button');
    await submit.trigger('click');
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(1);
    expect(submit.attributes('aria-busy')).toBe('true');
    expect(otherBtn.attributes('disabled')).toBeDefined();

    // Clicks during the flight window are ignored — on both buttons.
    await submit.trigger('click');
    await otherBtn.trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();

    d.resolve();
    await flushPromises();
    expect(submit.attributes('aria-busy')).toBeUndefined();
    expect(otherBtn.attributes('disabled')).toBeUndefined();

    await submit.trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('guards non-validating buttons against reentry while their action is pending', async () => {
    const d = deferred();
    const go = vi.fn().mockReturnValue(d.promise);
    const schema = pageWith({ id: 'b', type: 'button', props: { label: 'Go', action: 'go' } });
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { go } } });

    const btn = wrapper.find('button.pb-button');
    await btn.trigger('click');
    await btn.trigger('click');
    await flushPromises();
    expect(go).toHaveBeenCalledTimes(1);

    d.resolve();
    await flushPromises();
    await btn.trigger('click');
    await flushPromises();
    expect(go).toHaveBeenCalledTimes(2);
  });

  it('surfaces an action rejection in the form banner and clears it on edit', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageWith(emailField, submitButton), actions: { send } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.pb-form-error').text()).toContain('Invalid credentials');
    expect(wrapper.find('.pb-form-error').attributes('role')).toBe('alert');
    expect(errorSpy).toHaveBeenCalled();

    // The stale banner must not outlive the edit that addresses it.
    await wrapper.find('input').setValue('new@y.z');
    expect(wrapper.find('.pb-form-error').exists()).toBe(false);
  });

  it('shows a localized generic message for a non-Error rejection', async () => {
    const send = vi.fn().mockRejectedValue('boom');
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageWith(emailField, submitButton), actions: { send } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.pb-form-error').text()).toContain('Something went wrong');
  });

  it('routes the reserved _form key of onValidate to the banner and blocks the action', async () => {
    const send = vi.fn();
    const onValidate = vi.fn().mockResolvedValue({ _form: 'Try again later' });
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageWith(emailField, submitButton), actions: { send }, onValidate },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.find('.pb-form-error').text()).toContain('Try again later');
  });

  it('replaces the default banner via the form-error slot', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Nope'));
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageWith(emailField, submitButton), actions: { send } },
      slots: {
        'form-error': ({ error }: { error: string }) =>
          error ? h('div', { class: 'custom-banner' }, `custom: ${error}`) : null,
      },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.pb-form-error').exists()).toBe(false);
    expect(wrapper.find('.custom-banner').text()).toBe('custom: Nope');
  });
});

describe('CoarPageRenderer — payload & email format contract', () => {
  it('untouched named fields are PRESENT in the payload via definition defaults', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'c', type: 'text-input', name: 'comment', props: {} },
        { id: 'n', type: 'checkbox', name: 'newsletter', props: { label: 'News' } },
        { id: 'm', type: 'multi-select', name: 'topics', props: { options: [{ value: 'a', label: 'A' }] } },
        { id: 'a', type: 'number-input', name: 'age', props: {} },
        { id: 'p', type: 'select', name: 'plan', props: { options: [{ value: 'x', label: 'X' }] } },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send' } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({
      comment: '',
      newsletter: false,
      topics: [],
      age: null,
      plan: null,
    });
  });

  const emailSchema = (defaultValue: string): PageNode => ({
    id: 'r',
    type: 'page',
    children: [
      {
        id: 't', type: 'text-input', name: 'email',
        props: { label: 'Email', inputType: 'email' }, defaultValue,
      },
      { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
    ],
  });

  it('validates inputType email by default — no hand-written pattern needed', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: emailSchema('a'), actions: { send } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter a valid email address');

    await wrapper.find('input').setValue('x@y.z');
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: 'x@y.z' });
  });

  it('skips the email format check while the field is empty (required decides that)', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: emailSchema(''), actions: { send } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: '' });
  });

  it('a value-identical initialValues replacement does not wipe user input', async () => {
    const schema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', props: { label: 'Email' } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, initialValues: { email: 'host@y.z' } },
    });
    const input = wrapper.find('input');
    await input.setValue('typed@y.z');

    // Same values, new object — the inline-literal case. Must NOT re-init.
    await wrapper.setProps({ initialValues: { email: 'host@y.z' } });
    expect(input.element.value).toBe('typed@y.z');

    // Actually different values — re-init is the documented contract.
    await wrapper.setProps({ initialValues: { email: 'changed@y.z' } });
    expect(input.element.value).toBe('changed@y.z');
  });
});

describe('CoarPageRenderer — visibleWhen', () => {
  const conditional: PageNode = {
    id: 'r',
    type: 'page',
    children: [
      { id: 'biz', type: 'checkbox', name: 'business', props: { label: 'Business account' } },
      {
        id: 'company', type: 'text-input', name: 'companyName', props: { label: 'Company' },
        validation: { required: true }, visibleWhen: { field: 'business', equals: true },
      },
      { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
    ],
  };

  it('hides and shows the node reactively with the controlling value', async () => {
    const wrapper = mount(CoarPageRenderer, { props: { schema: conditional } });
    expect(wrapper.text()).not.toContain('Company');

    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(wrapper.text()).toContain('Company');

    await wrapper.find('input[type="checkbox"]').setValue(false);
    expect(wrapper.text()).not.toContain('Company');
  });

  it('hidden required fields neither veto a validating button nor ship values', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, { props: { schema: conditional, actions: { send } } });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({ business: false });
  });

  it('keeps values while hidden and enforces the rules again when re-shown', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, { props: { schema: conditional, actions: { send } } });

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('input[type="text"]').setValue('ACME');
    await wrapper.find('input[type="checkbox"]').setValue(false);

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send.mock.calls[0][0]).toEqual({ business: false });

    await wrapper.find('input[type="checkbox"]').setValue(true);
    expect(wrapper.find<HTMLInputElement>('input[type="text"]').element.value).toBe('ACME');
    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send.mock.calls[1][0]).toEqual({ business: true, companyName: 'ACME' });
  });

  it('supports the `in` form and hides whole subtrees, value model included', async () => {
    const schemaFor = (plan: string): PageNode => ({
      id: 'r',
      type: 'page',
      children: [
        {
          id: 'p', type: 'select', name: 'plan', defaultValue: plan,
          props: { options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
        },
        {
          id: 'card', type: 'card', props: { title: 'Billing' },
          visibleWhen: { field: 'plan', in: ['pro', 'team'] },
          children: [
            {
              id: 'vat', type: 'text-input', name: 'vatId', props: { label: 'VAT ID' },
              validation: { required: true },
            },
          ],
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    });

    const send = vi.fn();
    const hidden = mount(CoarPageRenderer, { props: { schema: schemaFor('free'), actions: { send } } });
    expect(hidden.text()).not.toContain('VAT ID');
    await hidden.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ plan: 'free' });

    const blocked = vi.fn();
    const shown = mount(CoarPageRenderer, { props: { schema: schemaFor('pro'), actions: { send: blocked } } });
    expect(shown.text()).toContain('VAT ID');
    await shown.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(blocked).not.toHaveBeenCalled(); // required VAT ID is now visible — and empty
  });

  it('malformed conditions fail open (node stays visible)', () => {
    const schema = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'h', type: 'heading', props: { text: 'Always here' }, visibleWhen: {} },
        { id: 'h2', type: 'heading', props: { text: 'Here too' }, visibleWhen: { field: 42 } },
      ],
    } as unknown as PageNode;
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Always here');
    expect(wrapper.text()).toContain('Here too');
  });
});

describe('CoarPageRenderer — host form API', () => {
  const schema: PageNode = {
    id: 'r',
    type: 'page',
    children: [
      { id: 't', type: 'text-input', name: 'email', props: { label: 'Email' }, defaultValue: 'a@y.z' },
      { id: 'c', type: 'checkbox', name: 'ok', props: { label: 'OK' } },
    ],
  };

  it('emits update:values on init and on every edit, with a safe snapshot', async () => {
    const wrapper = mount(CoarPageRenderer, { props: { schema } });

    const emitted = wrapper.emitted('update:values')!;
    expect(emitted[0][0]).toEqual({ email: 'a@y.z', ok: false });

    await wrapper.find('input[type="text"]').setValue('b@y.z');
    const last = emitted[emitted.length - 1][0] as Record<string, unknown>;
    expect(last).toEqual({ email: 'b@y.z', ok: false });

    // Mutating the emitted snapshot must not corrupt internal form state.
    (last as Record<string, unknown>).email = 'hacked';
    expect((wrapper.vm as unknown as { values: Record<string, unknown> }).values.email).toBe('b@y.z');
  });

  it('exposes values, isDirty and reset', async () => {
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    const vm = wrapper.vm as unknown as {
      values: Record<string, unknown>;
      isDirty: boolean;
      isFormValid: boolean;
      reset: () => void;
    };

    expect(vm.isDirty).toBe(false);
    expect(vm.values).toEqual({ email: 'a@y.z', ok: false });

    await wrapper.find('input[type="text"]').setValue('edited@y.z');
    expect(vm.isDirty).toBe(true);
    expect(vm.values.email).toBe('edited@y.z');

    vm.reset();
    await flushPromises();
    expect(vm.isDirty).toBe(false);
    expect(vm.values).toEqual({ email: 'a@y.z', ok: false });
    expect(wrapper.find<HTMLInputElement>('input[type="text"]').element.value).toBe('a@y.z');
  });

  it('focuses the first invalid control after a failed validating click', async () => {
    const send = vi.fn();
    const invalidSchema: PageNode = {
      id: 'r',
      type: 'page',
      children: [
        { id: 'h', type: 'heading', props: { text: 'Form' } },
        {
          id: 't', type: 'text-input', name: 'email', props: { label: 'Email' },
          validation: { required: true },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: invalidSchema, actions: { send } },
      attachTo: document.body,
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    wrapper.unmount();
  });
});

describe('CoarPageRenderer — enter to submit', () => {
  const emailField = {
    id: 't', type: 'text-input', name: 'email', props: { label: 'Email' }, defaultValue: 'x@y.z',
  };
  const validatingButton = {
    id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true },
  };
  const pageFor = (enterSubmits: boolean | undefined, children: unknown[]): PageNode =>
    ({ id: 'r', type: 'page', enterSubmits, children } as PageNode);

  it('plain Enter in a single-line input fires the first validating button', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageFor(true, [emailField, validatingButton]), actions: { send } },
    });

    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ email: 'x@y.z' });
  });

  it('does nothing without the page-level enterSubmits opt-in', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageFor(undefined, [emailField, validatingButton]), actions: { send } },
    });

    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
  });

  it('prefers the default: true button over the first validating one', async () => {
    const save = vi.fn();
    const login = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema: pageFor(true, [
          emailField,
          validatingButton,
          { id: 'b2', type: 'button', props: { label: 'Login', action: 'login', default: true } },
        ]),
        actions: { send: save, login },
      },
    });

    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(login).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('ignores Enter in a textarea and in elements that never declared eligibility', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema: pageFor(true, [
          { id: 'bio', type: 'text-input', name: 'bio', props: { rows: 4 } },
          { id: 'ok', type: 'checkbox', name: 'ok', props: { label: 'OK' } },
          validatingButton,
        ]),
        actions: { send },
      },
    });

    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' });
    await wrapper.find('input[type="checkbox"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores modified Enter and an Enter the element already consumed', async () => {
    const send = vi.fn();
    const wrapper = mount(CoarPageRenderer, {
      props: { schema: pageFor(true, [emailField, validatingButton]), actions: { send } },
    });

    const input = wrapper.find('input');
    await input.trigger('keydown', { key: 'Enter', shiftKey: true });
    await input.trigger('keydown', { key: 'Enter', ctrlKey: true });

    // A component that handles Enter itself (picker popover, autocomplete)
    // calls preventDefault — the host must not double-handle it.
    input.element.addEventListener('keydown', (e) => e.preventDefault());
    await input.trigger('keydown', { key: 'Enter' });

    await flushPromises();
    expect(send).not.toHaveBeenCalled();
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
