import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, provide, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as monacoMock from 'monaco-editor';
import CoarScriptEditor from './CoarScriptEditor.vue';

// Monaco is impractical to run inside happy-dom (no canvas, no real layout). It is aliased
// to `src/__mocks__/monaco-editor.ts` via vite.config.ts for tests — so here we only assert
// the Vue wiring (props, events, reactive bindings) and observe calls on the mock.

const FORM_FIELD_KEY = Symbol.for('coar:form-field');

function makeFormFieldHarness(
  overrides: Partial<{
    inputId: string;
    messageId: string;
    hasError: boolean;
    disabled: boolean;
  }> = {},
) {
  return defineComponent({
    name: 'FormFieldHarness',
    setup(_, { slots }) {
      provide(FORM_FIELD_KEY, {
        inputId: computed(() => overrides.inputId ?? 'ff-input'),
        messageId: computed(() => overrides.messageId ?? 'ff-message'),
        hasError: computed(() => overrides.hasError ?? false),
        disabled: computed(() => overrides.disabled ?? false),
      });
      return () => h('div', slots.default?.());
    },
  });
}

// This describe must run FIRST in the file — `configureCompilerLibs()` is a module-level
// one-shot (as required by Monaco's global `setCompilerOptions` API), and `vi.clearAllMocks()`
// in later blocks wipes the call history. Placing the check before any other mount lets us
// assert on the actual call the first editor triggered.
describe('CoarScriptEditor — compiler libs', () => {
  it('restricts Monaco to ECMAScript libs on first mount', async () => {
    const tsFn = monacoMock.languages.typescript.typescriptDefaults.setCompilerOptions as ReturnType<
      typeof vi.fn
    >;
    const jsFn = monacoMock.languages.typescript.javascriptDefaults.setCompilerOptions as ReturnType<
      typeof vi.fn
    >;

    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    await nextTick();

    const assertLibs = (fn: ReturnType<typeof vi.fn>) => {
      expect(fn.mock.calls.length).toBeGreaterThan(0);
      const latest = fn.mock.calls.at(-1)![0];
      expect(latest.lib).toEqual(['es2024']);
      expect(latest.allowNonTsExtensions).toBe(true);
      // `noResolve` must NOT be set: it prevents the TS worker from pulling `addExtraLib`
      // declarations into compilation, which silently falls back to `any` on hover.
      expect(latest.noResolve).toBeFalsy();
      expect(typeof latest.target).toBe('number');
    };
    assertLibs(tsFn);
    assertLibs(jsFn);
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — basic wiring', () => {
  it('renders the editor host element', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { modelValue: 'const x = 1;' },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').exists()).toBe(true);
    wrapper.unmount();
  });

  it('accepts extraLibs and switches language', async () => {
    const wrapper = mount(CoarScriptEditor, {
      props: {
        modelValue: 'const x = 1;',
        language: 'typescript',
        extraLibs: [{ content: 'declare const foo: number;', filePath: 'file:///foo.d.ts' }],
      },
      attachTo: document.body,
    });
    await wrapper.setProps({ language: 'javascript' });
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — form integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies an auto-generated id when none provided', () => {
    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    const id = wrapper.find('.coar-script-editor').attributes('id');
    expect(id).toMatch(/^coar-script-editor-/);
    wrapper.unmount();
  });

  it('honours the explicit id prop over the auto-id', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { id: 'my-script' },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').attributes('id')).toBe('my-script');
    wrapper.unmount();
  });

  it('picks up id, error, and describedBy from CoarFormField provide', () => {
    const Harness = makeFormFieldHarness({
      inputId: 'ff-script',
      messageId: 'ff-script-msg',
      hasError: true,
    });
    const wrapper = mount(Harness, {
      attachTo: document.body,
      slots: { default: () => h(CoarScriptEditor) },
    });
    const host = wrapper.find('.coar-script-editor');
    expect(host.attributes('id')).toBe('ff-script');
    expect(host.attributes('aria-describedby')).toBe('ff-script-msg');
    expect(host.attributes('aria-invalid')).toBe('true');
    expect(host.classes()).toContain('coar-script-editor--error');
    wrapper.unmount();
  });

  it('prop.error takes effect without a FormField wrapper', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { error: true },
      attachTo: document.body,
    });
    const host = wrapper.find('.coar-script-editor');
    expect(host.attributes('aria-invalid')).toBe('true');
    expect(host.classes()).toContain('coar-script-editor--error');
    wrapper.unmount();
  });

  it('applies disabled class and aria-disabled when disabled', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { disabled: true },
      attachTo: document.body,
    });
    const host = wrapper.find('.coar-script-editor');
    expect(host.classes()).toContain('coar-script-editor--disabled');
    expect(host.attributes('aria-disabled')).toBe('true');
    wrapper.unmount();
  });

  it('inherits disabled from CoarFormField', () => {
    const Harness = makeFormFieldHarness({ disabled: true });
    const wrapper = mount(Harness, {
      attachTo: document.body,
      slots: { default: () => h(CoarScriptEditor) },
    });
    expect(wrapper.find('.coar-script-editor').classes()).toContain('coar-script-editor--disabled');
    wrapper.unmount();
  });

  it('sets aria-required when required is true', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { required: true },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').attributes('aria-required')).toBe('true');
    wrapper.unmount();
  });

  it('does not set aria-required when required is false', () => {
    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    expect(wrapper.find('.coar-script-editor').attributes('aria-required')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — placeholder', () => {
  it('writes data-placeholder and show-placeholder class when empty and unfocused', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { placeholder: '// type here', modelValue: '' },
      attachTo: document.body,
    });
    const host = wrapper.find('.coar-script-editor');
    expect(host.attributes('data-placeholder')).toBe('// type here');
    expect(host.classes()).toContain('coar-script-editor--show-placeholder');
    wrapper.unmount();
  });

  it('hides the placeholder once modelValue is non-empty', async () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { placeholder: '// type here', modelValue: '' },
      attachTo: document.body,
    });
    await wrapper.setProps({ modelValue: 'const x = 1;' });
    expect(wrapper.find('.coar-script-editor').classes()).not.toContain(
      'coar-script-editor--show-placeholder',
    );
    wrapper.unmount();
  });

  it('does not show the placeholder when disabled', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { placeholder: '// hint', modelValue: '', disabled: true },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').classes()).not.toContain(
      'coar-script-editor--show-placeholder',
    );
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — height', () => {
  it('accepts a CSS string height', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { height: '160px' },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').attributes('style')).toContain('height: 160px');
    wrapper.unmount();
  });

  it('converts a numeric height to pixels', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { height: 240 },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').attributes('style')).toContain('height: 240px');
    wrapper.unmount();
  });

  it('applies no inline height when the prop is omitted', () => {
    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    const style = wrapper.find('.coar-script-editor').attributes('style') ?? '';
    expect(style).not.toContain('height:');
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — variant', () => {
  it('applies the inline modifier class when variant is "inline"', () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { variant: 'inline' },
      attachTo: document.body,
    });
    expect(wrapper.find('.coar-script-editor').classes()).toContain('coar-script-editor--inline');
    wrapper.unmount();
  });

  it('omits the inline modifier by default', () => {
    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    expect(wrapper.find('.coar-script-editor').classes()).not.toContain(
      'coar-script-editor--inline',
    );
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — scriptMode', () => {
  beforeEach(() => {
    (
      monacoMock.languages.typescript.typescriptDefaults.setDiagnosticsOptions as ReturnType<
        typeof vi.fn
      >
    ).mockClear();
  });

  it('calls setDiagnosticsOptions with the script-mode code list when enabled', async () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { scriptMode: true, language: 'typescript' },
      attachTo: document.body,
    });
    await nextTick();
    const calls = (
      monacoMock.languages.typescript.typescriptDefaults.setDiagnosticsOptions as ReturnType<
        typeof vi.fn
      >
    ).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const passedCodes: number[] = calls[calls.length - 1][0].diagnosticCodesToIgnore;
    // Structural wrapper artefacts only: top-level return/await/export, unreachable,
    // unused comma-LHS, isolatedModules. `2304` (Cannot find name) is intentionally
    // absent so undeclared identifiers still surface instead of silently being `any`.
    for (const code of [1375, 2695, 1108, 7027, 1208]) {
      expect(passedCodes).toContain(code);
    }
    expect(passedCodes).not.toContain(2304);
    wrapper.unmount();
  });

  it('does not touch diagnostics when scriptMode is false', async () => {
    const wrapper = mount(CoarScriptEditor, {
      props: { scriptMode: false, language: 'typescript' },
      attachTo: document.body,
    });
    await nextTick();
    wrapper.unmount();
    expect(
      (
        monacoMock.languages.typescript.typescriptDefaults.setDiagnosticsOptions as ReturnType<
          typeof vi.fn
        >
      ).mock.calls.length,
    ).toBe(0);
  });
});

describe('CoarScriptEditor — preamble', () => {
  it('wraps the initial value with the preamble when creating the model', async () => {
    (monacoMock.editor.createModel as ReturnType<typeof vi.fn>).mockClear();
    const wrapper = mount(CoarScriptEditor, {
      props: {
        preamble: 'declare const query: TodoQuery;',
        modelValue: 'return query.filter(x => !!x);',
      },
      attachTo: document.body,
    });
    await nextTick();
    const calls = (monacoMock.editor.createModel as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const passedSource: string = calls[calls.length - 1][0];
    expect(passedSource.startsWith('declare const query: TodoQuery;\n')).toBe(true);
    expect(passedSource.endsWith('return query.filter(x => !!x);')).toBe(true);
    wrapper.unmount();
  });

  it('calls setHiddenAreas so the preamble lines are not visible', async () => {
    const hidden: unknown[][] = [];
    (monacoMock.editor.create as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: vi.fn(),
      setHiddenAreas: vi.fn((ranges: unknown[]) => hidden.push(ranges)),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidFocusEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      onDidBlurEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      trigger: vi.fn(),
    }));

    const wrapper = mount(CoarScriptEditor, {
      props: { preamble: 'declare const query: TodoQuery;', modelValue: 'return 1;' },
      attachTo: document.body,
    });
    await nextTick();
    expect(hidden.length).toBeGreaterThan(0);
    expect((hidden[0] as unknown[]).length).toBe(1);
    wrapper.unmount();
  });

  it('does not call setHiddenAreas with a range when preamble is empty', async () => {
    const hidden: unknown[][] = [];
    (monacoMock.editor.create as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: vi.fn(),
      setHiddenAreas: vi.fn((ranges: unknown[]) => hidden.push(ranges)),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidFocusEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      onDidBlurEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      trigger: vi.fn(),
    }));

    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    await nextTick();
    expect(hidden.length).toBeGreaterThan(0);
    expect((hidden[0] as unknown[]).length).toBe(0);
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — autofocus', () => {
  it('calls editor.focus() when autofocus is true', async () => {
    const focusSpy = vi.fn();
    (monacoMock.editor.create as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: focusSpy,
      setHiddenAreas: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidFocusEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      onDidBlurEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      trigger: vi.fn(),
    }));

    const wrapper = mount(CoarScriptEditor, {
      props: { autofocus: true },
      attachTo: document.body,
    });
    await nextTick();
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    expect(focusSpy).toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — focus/blur events', () => {
  it('emits focused and blurred when Monaco fires the corresponding widget events', async () => {
    let focusHandler: (() => void) | null = null;
    let blurHandler: (() => void) | null = null;
    (monacoMock.editor.create as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: vi.fn(),
      setHiddenAreas: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidFocusEditorWidget: vi.fn((cb: () => void) => {
        focusHandler = cb;
        return { dispose: vi.fn() };
      }),
      onDidBlurEditorWidget: vi.fn((cb: () => void) => {
        blurHandler = cb;
        return { dispose: vi.fn() };
      }),
      trigger: vi.fn(),
    }));

    const wrapper = mount(CoarScriptEditor, { attachTo: document.body });
    await nextTick();
    focusHandler?.();
    blurHandler?.();

    expect(wrapper.emitted('focused')).toBeTruthy();
    expect(wrapper.emitted('blurred')).toBeTruthy();
    wrapper.unmount();
  });
});

describe('CoarScriptEditor — exposes editor methods', () => {
  it('exposes focus(), getEditor(), getModel()', async () => {
    const focusSpy = vi.fn();
    (monacoMock.editor.create as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getValue: vi.fn(() => ''),
      focus: focusSpy,
      setHiddenAreas: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      onDidFocusEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      onDidBlurEditorWidget: vi.fn(() => ({ dispose: vi.fn() })),
      trigger: vi.fn(),
    }));

    const editorRef = ref<InstanceType<typeof CoarScriptEditor> | null>(null);
    const Harness = defineComponent({
      setup: () => () => h(CoarScriptEditor, { ref: editorRef }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();

    const exposed = editorRef.value as unknown as {
      focus: () => void;
      getEditor: () => unknown;
      getModel: () => unknown;
    };
    expect(typeof exposed.focus).toBe('function');
    expect(typeof exposed.getEditor).toBe('function');
    expect(typeof exposed.getModel).toBe('function');
    exposed.focus();
    expect(focusSpy).toHaveBeenCalled();
    wrapper.unmount();
  });
});
