import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import CoarMarkdownForm from './CoarMarkdownForm.vue';
import { BUILTIN_MARKDOWN_FORM_FIELDS } from './registry';
import type { MarkdownFormExpose, MarkdownFormValidationResult } from './types';

describe('CoarMarkdownForm', () => {
  it('keeps Markdown fixed and writes field changes to the separate values object', async () => {
    const wrapper = mount(CoarMarkdownForm, {
      props: {
        template: '# Protocol\n\n**Name:** :field{id=name type=text required}',
        values: { name: 'Ada' },
        context: { design: 'basic' },
      },
    });

    expect(wrapper.get('h1').text()).toBe('Protocol');
    const input = wrapper.get('input[type="text"]');
    expect((input.element as HTMLInputElement).value).toBe('Ada');
    await input.setValue('Grace');

    expect(wrapper.emitted('update:values')?.at(-1)?.[0]).toEqual({ name: 'Grace' });
    expect(wrapper.get('h1').text()).toBe('Protocol');
  });

  it('exposes required validation and displays it only when requested', async () => {
    const wrapper = mount(CoarMarkdownForm, {
      props: {
        template: '**Name:** :field{id=name type=text required}',
        values: { name: '' },
        context: { design: 'basic' },
      },
    });

    const exposed = wrapper.vm as unknown as MarkdownFormExpose;
    expect(exposed.validate().valid).toBe(false);
    expect(exposed.validate().errors.name).toContain('required');
    expect(wrapper.find('.coar-markdown-form-field__error').exists()).toBe(false);

    await wrapper.setProps({ showErrors: true });
    expect(wrapper.get('.coar-markdown-form-field__error').text()).toContain('required');
  });

  it('renders readonly values without controls and applies readonly decorations', () => {
    const wrapper = mount(CoarMarkdownForm, {
      props: {
        template: '**Name:** :field{id=name type=text}',
        values: { name: 'Ada' },
        mode: 'readonly',
        context: { decorations: { inlineUnderline: true } },
      },
    });

    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.get('.coar-markdown-form-field__readonly').text()).toBe('Ada');
    expect(wrapper.get('.coar-markdown-form-field').classes()).toContain(
      'coar-markdown-form-field--underlined',
    );
  });

  it('lets readonly mode hide a Markdown block frame while fill always keeps it', async () => {
    const StubMarkdownControl = defineComponent(() => () => h('textarea'));
    const wrapper = mount(CoarMarkdownForm, {
      props: {
        template: '## Notes\n\n:::field{id=notes type=markdown}',
        values: { notes: 'Text' },
        mode: 'readonly',
        context: { decorations: { markdownFrame: false } },
        fields: {
          markdown: {
            ...BUILTIN_MARKDOWN_FORM_FIELDS.markdown,
            control: StubMarkdownControl,
          },
        },
      },
    });

    expect(wrapper.get('.coar-markdown-form-field--block').classes()).toContain(
      'coar-markdown-form-field--frameless',
    );

    await wrapper.setProps({ mode: 'fill' });
    expect(wrapper.get('.coar-markdown-form-field--block').classes()).not.toContain(
      'coar-markdown-form-field--frameless',
    );
  });

  it('surfaces invalid template structure', async () => {
    let latest: MarkdownFormValidationResult | undefined;
    const wrapper = mount(CoarMarkdownForm, {
      props: {
        template: ':field{id=same}\n\n:field{id=same}\n\n:field{type=missing}',
        values: {},
        context: { design: 'basic' },
        onValidation: (result) => {
          latest = result;
        },
      },
    });
    await nextTick();

    expect(wrapper.get('.coar-markdown-form__issues').text()).toContain('used more than once');
    expect(wrapper.get('.coar-markdown-form__issues').text()).toContain('missing its id');
    expect(latest?.valid).toBe(false);
  });
});
