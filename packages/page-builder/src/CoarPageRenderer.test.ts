import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CoarPageRenderer from './CoarPageRenderer.vue';
import type { ActionProps, ElementNode, PageNode } from './schema';
import { usePageElement } from './elements/usePageElement';

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

  it('resolves host style presets for the page root and safely ignores disallowed presets', () => {
    const schema: PageNode = {
      id: 'r', type: 'page', stylePreset: 'app-shell', children: [{
        id: 'stack', type: 'stack', name: 'content', stylePreset: 'app-shell', props: {}, children: [],
      }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        config: {
          stylePresets: [{
            id: 'app-shell', label: 'Application shell', className: 'application-shell', allowedOn: ['page'],
          }],
        },
      },
    });

    expect(wrapper.find('.pb-page').classes()).toContain('application-shell');
    expect(wrapper.find('.pb-stack').classes()).not.toContain('application-shell');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('style preset'));
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

  it('honours an explicit disabled button state', async () => {
    const send = vi.fn();
    const schema = pageWith({
      id: 'b', type: 'button', props: { label: 'Send', action: 'send', disabled: true },
    });
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });

    const button = wrapper.find('button.pb-button');
    expect(button.attributes('disabled')).toBeDefined();
    await button.trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
  });

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
  it('merges static action values identically for buttons and links, with explicit values winning collisions', async () => {
    const buttonAction = vi.fn();
    const linkAction = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', children: [
        { id: 'language', type: 'text-input', name: 'language', props: {}, defaultValue: 'en' },
        {
          id: 'button', type: 'button',
          props: { label: 'Deutsch', action: 'button-action', actionValues: { language: 'de', source: 'button' } },
        },
        {
          id: 'link', type: 'link',
          props: { label: 'English', action: 'link-action', actionValues: { language: 'en-GB', source: 'link' } },
        },
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { 'button-action': buttonAction, 'link-action': linkAction } },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(buttonAction).toHaveBeenCalledWith({ language: 'de', source: 'button' });

    await wrapper.find('button.pb-link').trigger('click');
    await flushPromises();
    expect(linkAction).toHaveBeenCalledWith({ language: 'en-GB', source: 'link' });
  });

  it('resolves a dynamic actionValue binding before invoking the shared link action path', async () => {
    const setLanguage = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', children: [{
        id: 'link', type: 'link',
        props: {
          label: 'Use preferred language',
          action: 'auth:set-language',
          actionValueField: 'language',
          actionValue: 'en',
        },
        bindings: { actionValue: { source: 'context', path: 'preferredLanguage' } },
      }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        actions: { 'auth:set-language': setLanguage },
        config: { contextFields: [{ path: 'preferredLanguage', type: 'string' }] },
        runtimeContext: { preferredLanguage: 'de' },
      },
    });

    await wrapper.find('button.pb-link').trigger('click');
    await flushPromises();
    expect(setLanguage).toHaveBeenCalledWith({ language: 'de' });
  });

  it('passes a Repeat selection through a nested actionValues binding', async () => {
    const approve = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', children: [
        {
          id: 'scopes', type: 'repeat', name: 'scopes',
          props: {
            source: 'scopes', keyPath: 'id',
            selection: {
              name: 'approvedScopes', valuePath: 'id', requiredPath: 'required',
              defaultSelection: 'all',
            },
          },
          children: [{
            id: 'scope-check', type: 'checkbox', name: '$selection', props: { label: 'Scope' },
          }],
        },
        {
          id: 'approve', type: 'button', name: 'approve',
          props: { label: 'Approve', action: 'approve', actionValues: { approvedScopes: [] } },
          bindings: {
            'actionValues.approvedScopes': { source: 'selection', path: 'approvedScopes' },
          },
        },
      ],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        actions: { approve },
        config: {
          contextFields: [{
            path: 'scopes', type: 'array',
            itemFields: [{ path: 'id', type: 'string' }, { path: 'required', type: 'boolean' }],
          }],
        },
        runtimeContext: {
          scopes: [
            { id: 'openid', required: true },
            { id: 'profile', required: false },
          ],
        },
      },
    });
    await flushPromises();

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(approve).toHaveBeenCalledWith({ approvedScopes: ['openid', 'profile'] });
  });

  it('resolves repeat item and index per rendered action element', async () => {
    const choose = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', children: [{
        id: 'scopes', type: 'repeat', name: 'scopes',
        props: { source: 'scopes', keyPath: 'id' },
        children: [{
          id: 'choose', type: 'button', name: 'chooseScope',
          props: { label: 'Choose', action: 'choose', actionValues: {} },
          bindings: {
            'actionValues.scopeId': { source: 'item', path: 'id' },
            'actionValues.scopeIndex': { source: 'index' },
          },
        }],
      }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        actions: { choose },
        config: {
          contextFields: [{ path: 'scopes', type: 'array', itemFields: [{ path: 'id', type: 'string' }] }],
        },
        runtimeContext: { scopes: [{ id: 'openid' }, { id: 'profile' }] },
      },
    });
    await flushPromises();

    await wrapper.findAll('button.pb-button')[1].trigger('click');
    await flushPromises();
    expect(choose).toHaveBeenCalledWith({ scopeId: 'profile', scopeIndex: 1 });
  });

  it('resolves a nested action value from customer-authored Page State', async () => {
    const run = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', children: [{
        id: 'run', type: 'button', name: 'run',
        props: { label: 'Run', action: 'run', actionValues: { checked: false } },
        bindings: {
          'actionValues.checked': { source: 'state', path: 'consent.checked' },
        },
      }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        actions: { run },
        pageCodeValues: {
          nodes: {}, state: { consent: { checked: true } }, actionIds: [],
        },
      },
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(run).toHaveBeenCalledWith({ checked: true });
  });

  it('gives consumer action elements the same triggerElementAction contract', async () => {
    type ChipProps = ActionProps & { label: string };
    const ActionChip = defineComponent({
      props: ['node'],
      setup(componentProps) {
        const context = usePageElement();
        return () => h('button', {
          class: 'consumer-action',
          onClick: () => context.triggerElementAction(
            (componentProps.node as ElementNode<string, ChipProps>).props,
          ),
        }, (componentProps.node as ElementNode<string, ChipProps>).props.label);
      },
    });
    const run = vi.fn();
    const schema = {
      id: 'r', type: 'page', children: [{
        id: 'chip', type: 'acme-action-chip',
        props: { label: 'Run', action: 'run', actionValues: { source: 'chip' } },
      }],
    } as PageNode;
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        actions: { run },
        config: { elements: { 'acme-action-chip': { renderer: ActionChip, action: true } } },
      },
    });

    await wrapper.find('button.consumer-action').trigger('click');
    await flushPromises();
    expect(run).toHaveBeenCalledWith({ source: 'chip' });
  });

  it('keeps action values when Enter triggers the default button', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', enterSubmits: true, children: [
        { id: 'field', type: 'text-input', name: 'query', props: {}, defaultValue: 'hello' },
        {
          id: 'button', type: 'button',
          props: {
            label: 'Search', action: 'search', default: true,
            actionValues: { mode: 'exact' },
            actionValueField: 'page', actionValue: 2,
          },
        },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { search: send } } });

    await wrapper.find('input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).toHaveBeenCalledWith({ query: 'hello', mode: 'exact', page: 2 });
  });

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

describe('CoarPageRenderer — optionsSource', () => {
  const radioSchema = (props: Record<string, unknown>): PageNode => ({
    id: 'r',
    type: 'page',
    children: [{ id: 'rg', type: 'radio-group', name: 'country', props }],
  } as PageNode);

  it('resolves optionsSourceId through config.optionsSource (wins over static options)', async () => {
    const optionsSource = vi.fn().mockResolvedValue([
      { value: 'at', label: 'Austria' },
      { value: 'de', label: 'Germany' },
    ]);
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema: radioSchema({
          optionsSourceId: 'countries',
          options: [{ value: 'static', label: 'Static' }],
        }),
        config: { optionsSource },
      },
    });

    await flushPromises();
    expect(optionsSource).toHaveBeenCalledWith('countries');
    expect(wrapper.text()).toContain('Austria');
    expect(wrapper.text()).toContain('Germany');
    expect(wrapper.text()).not.toContain('Static');
  });

  it('falls back to the static options when no resolver is configured', async () => {
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema: radioSchema({
          optionsSourceId: 'countries',
          options: [{ value: 'static', label: 'Static' }],
        }),
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Static');
  });

  it('stays empty and warns once when the source fails; malformed entries are dropped', async () => {
    const failing = mount(CoarPageRenderer, {
      props: {
        schema: radioSchema({ optionsSourceId: 'boom' }),
        config: { optionsSource: () => Promise.reject(new Error('down')) },
      },
    });
    await flushPromises();
    expect(failing.findAll('input[type="radio"]')).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('optionsSource'), expect.anything());

    const mixed = mount(CoarPageRenderer, {
      props: {
        schema: radioSchema({ optionsSourceId: 'mixed' }),
        config: {
          optionsSource: () =>
            Promise.resolve([{ value: 'ok', label: 'OK' }, { bogus: true }] as never),
        },
      },
    });
    await flushPromises();
    expect(mixed.findAll('input[type="radio"]')).toHaveLength(1);
    expect(mixed.text()).toContain('OK');
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

describe('CoarPageRenderer — R1/R2 hardening (verified audit findings)', () => {
  function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((res) => { resolve = res; });
    return { promise, resolve };
  }

  let errorSpy: MockInstance;
  beforeEach(() => { errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  it('ships exactly the snapshot onValidate approved — edits during the validate window do not leak', async () => {
    const send = vi.fn();
    const d = deferred<Record<string, string>>();
    const onValidate = vi.fn().mockReturnValue(d.promise);
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', props: {}, defaultValue: 'validated@y.z' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send }, onValidate } });

    await wrapper.find('button.pb-button').trigger('click');
    // Inputs stay editable while onValidate is pending — edit mid-flight.
    await wrapper.find('input').setValue('edited@y.z');
    d.resolve({});
    await flushPromises();

    expect(onValidate).toHaveBeenCalledWith({ email: 'validated@y.z' });
    expect(send).toHaveBeenCalledWith({ email: 'validated@y.z' });
  });

  it('Enter commits a pending number-input edit before submitting (blur-to-commit)', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', enterSubmits: true,
      children: [
        { id: 'n', type: 'number-input', name: 'amount', props: { label: 'Amount' } },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    } as PageNode;
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send } },
      attachTo: document.body,
    });

    const input = wrapper.find('input');
    input.element.focus(); // blur-to-commit only fires on a focused control
    await input.setValue('42');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].amount).toBe(42);
    wrapper.unmount();
  });

  it('ignores an IME composition-commit Enter (Chromium isComposing AND Safari keyCode 229)', async () => {
    const send = vi.fn();
    const schema: PageNode = {
      id: 'r', type: 'page', enterSubmits: true,
      children: [
        { id: 't', type: 'text-input', name: 'q', props: {}, defaultValue: 'かな' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    } as PageNode;
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });

    // Chromium/Firefox shape: the commit keydown carries isComposing.
    wrapper.find('input').element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
    );
    // WebKit/Safari shape: fired AFTER compositionend — isComposing false,
    // legacy keyCode 229.
    const safariEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(safariEnter, 'keyCode', { value: 229 });
    wrapper.find('input').element.dispatchEvent(safariEnter);

    await flushPromises();
    expect(send).not.toHaveBeenCalled();
  });

  it('an Enter while the form is busy is ignored WITHOUT stealing focus', async () => {
    const send = vi.fn().mockReturnValue(new Promise(() => {})); // never settles
    const schema: PageNode = {
      id: 'r', type: 'page', enterSubmits: true,
      children: [
        { id: 't', type: 'text-input', name: 'q', props: {}, defaultValue: 'x' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    } as PageNode;
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, actions: { send } },
      attachTo: document.body,
    });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1); // action pending forever → busy

    const input = wrapper.find('input');
    input.element.focus();
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input.element); // no blur on the ignored path
    wrapper.unmount();
  });

  it('blocks and banners onValidate errors keyed to reserved names instead of dropping them', async () => {
    const send = vi.fn();
    const onValidate = vi.fn().mockResolvedValue({ constructor: 'Chassis number required' });
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', props: {}, defaultValue: 'x@y.z' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send }, onValidate } });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.find('.pb-form-error').text()).toContain('Chassis number required');
  });

  it('errors for fields revealed DURING onValidate render visibly (auto-touched)', async () => {
    const send = vi.fn();
    const d = deferred<Record<string, string>>();
    const onValidate = vi.fn().mockReturnValue(d.promise);
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [
        { id: 'biz', type: 'checkbox', name: 'isBusiness', props: { label: 'Business' } },
        {
          id: 'c', type: 'text-input', name: 'companyName', props: { label: 'Company' },
          visibleWhen: { field: 'isBusiness', equals: true },
        },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send }, onValidate } });

    await wrapper.find('button.pb-button').trigger('click');
    // Reveal companyName while onValidate is still pending…
    await wrapper.find('input[type="checkbox"]').setValue(true);
    d.resolve({ companyName: 'Required for business accounts' });
    await flushPromises();

    expect(send).not.toHaveBeenCalled();
    // …the freshly revealed field was never click-touched, but its error must show.
    expect(wrapper.text()).toContain('Required for business accounts');
  });

  it('object-valued fields: isDirty starts false and same-content initialValues do not wipe input', async () => {
    const objHolder = {
      renderer: { props: ['node'], setup: () => () => null },
    };
    const geo = { lat: 47.1, lng: 15.4 };
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [
        { id: 'g', type: 'obj-holder', name: 'geo', props: {} },
        { id: 't', type: 'text-input', name: 'note', props: {} },
      ],
    } as PageNode;
    const wrapper = mount(CoarPageRenderer, {
      props: {
        schema,
        config: { elements: { 'obj-holder': objHolder } },
        initialValues: { geo },
      },
    });
    const vm = wrapper.vm as unknown as { isDirty: boolean };

    // Reactive proxy vs raw baseline must compare equal.
    expect(vm.isDirty).toBe(false);

    await wrapper.find('input').setValue('typed');
    expect(vm.isDirty).toBe(true);

    // New wrapper object, same object VALUES — must not re-init.
    await wrapper.setProps({ initialValues: { geo } });
    expect(wrapper.find('input').element.value).toBe('typed');

    // Even a FRESHLY MINTED nested object with equal content (the inline
    // nested-literal footgun) must not re-init — values compare by content.
    await wrapper.setProps({ initialValues: { geo: { lat: 47.1, lng: 15.4 } } });
    expect(wrapper.find('input').element.value).toBe('typed');
  });

  it('irrelevant initialValues keys cannot wipe in-progress input', async () => {
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [{ id: 't', type: 'text-input', name: 'email', props: {} }],
    };
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, initialValues: { email: 'a@y.z', stray: 1 } },
    });
    await wrapper.find('input').setValue('typed@y.z');

    await wrapper.setProps({ initialValues: { email: 'a@y.z', stray: 2 } });
    expect(wrapper.find('input').element.value).toBe('typed@y.z');
  });

  it('routes onValidate errors for hidden or unknown fields into the banner instead of a dead click', async () => {
    const send = vi.fn();
    const onValidate = vi.fn().mockResolvedValue({ ghost: 'System offline' });
    const schema: PageNode = {
      id: 'r', type: 'page',
      children: [
        { id: 't', type: 'text-input', name: 'email', props: {}, defaultValue: 'x@y.z' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    };
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send }, onValidate } });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.find('.pb-form-error').text()).toContain('System offline');
  });

  it('ignores visibleWhen on the page root — the page can never blank itself', () => {
    const schema = {
      id: 'r', type: 'page',
      visibleWhen: { field: 'nope', equals: true },
      children: [{ id: 'h', type: 'heading', props: { text: 'Still rendered' } }],
    } as unknown as PageNode;
    const wrapper = mount(CoarPageRenderer, { props: { schema } });
    expect(wrapper.text()).toContain('Still rendered');
  });

  it('heals a props-less consumer-element node instead of crashing the page', () => {
    const labelReader = {
      renderer: {
        props: ['node'],
        // Reads node.props.label unguarded — the crash vector without healing.
        setup: (p: { node: { props: { label?: string } } }) => () =>
          h('div', { class: 'consumer-el' }, String(p.node.props.label ?? 'no label')),
      },
    };
    const schema = {
      id: 'r', type: 'page',
      children: [
        { id: 'c', type: 'acme-thing' }, // no props bag at all
        { id: 'h', type: 'heading', props: { text: 'Sibling survives' } },
      ],
    } as unknown as PageNode;
    const wrapper = mount(CoarPageRenderer, {
      props: { schema, config: { elements: { 'acme-thing': labelReader } } },
    });
    expect(wrapper.find('.consumer-el').text()).toBe('no label');
    expect(wrapper.text()).toContain('Sibling survives');
  });

  it('excludes reserved field names (__proto__) from the value model and does not pollute prototypes', async () => {
    const send = vi.fn();
    const schema = {
      id: 'r', type: 'page',
      children: [
        {
          id: 'evil', type: 'text-input', name: '__proto__', props: {},
          defaultValue: 'x', validation: { required: true },
        },
        { id: 't', type: 'text-input', name: 'email', props: {}, defaultValue: 'a@y.z' },
        { id: 'b', type: 'button', props: { label: 'Send', action: 'send', validates: true } },
      ],
    } as unknown as PageNode;
    const wrapper = mount(CoarPageRenderer, { props: { schema, actions: { send } } });

    await wrapper.find('button.pb-button').trigger('click');
    await flushPromises();

    // Neither vetoes nor ships; no prototype pollution.
    expect(send).toHaveBeenCalledTimes(1);
    expect(Object.keys(send.mock.calls[0][0])).toEqual(['email']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'x')).toBe(false);
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
