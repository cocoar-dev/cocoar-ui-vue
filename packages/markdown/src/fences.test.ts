import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { MarkdownDocument } from '@cocoar/vue-markdown-core';
import CoarMarkdown from './CoarMarkdown.vue';
import { resolveFenceRenderer, type FenceRegistry, type FenceRendererProps } from './fences';

// A tiny stand-in for a real diagram renderer: echoes the code + language into
// the DOM so tests can assert the custom renderer actually fired.
const StubDiagram = defineComponent({
  name: 'StubDiagram',
  props: {
    code: { type: String, required: true },
    language: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'stub-diagram', 'data-language': props.language },
        props.code,
      );
  },
});

function docWith(language: string, code: string): MarkdownDocument {
  return { nodes: [{ id: 'cb', type: 'codeBlock', attrs: { language }, text: code }] };
}

describe('resolveFenceRenderer', () => {
  const registry: FenceRegistry = { mermaid: StubDiagram };

  it('returns undefined for an undefined registry', () => {
    expect(resolveFenceRenderer(undefined, 'mermaid')).toBeUndefined();
  });

  it('resolves an exact language key', () => {
    expect(resolveFenceRenderer(registry, 'mermaid')).toBe(StubDiagram);
  });

  it('resolves case-insensitively', () => {
    expect(resolveFenceRenderer(registry, 'Mermaid')).toBe(StubDiagram);
    expect(resolveFenceRenderer(registry, 'MERMAID')).toBe(StubDiagram);
  });

  it('returns undefined for an unregistered language', () => {
    expect(resolveFenceRenderer(registry, 'dot')).toBeUndefined();
  });
});

describe('CoarMarkdown — fenceRenderers prop', () => {
  it('renders a registered fence language via the custom component', () => {
    const wrapper = mount(CoarMarkdown, {
      props: {
        doc: docWith('mermaid', 'flowchart LR\n  A --> B'),
        fenceRenderers: { mermaid: StubDiagram } as FenceRegistry,
      },
    });

    const stub = wrapper.find('[data-testid="stub-diagram"]');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-language')).toBe('mermaid');
    expect(stub.text()).toContain('flowchart LR');
    // Wrapped in the fence container, and NOT the plain code block.
    expect(wrapper.find('.coar-markdown-fence').exists()).toBe(true);
    expect(wrapper.find('.coar-code-block').exists()).toBe(false);
  });

  it('falls back to the plain code block for an unregistered language', () => {
    const wrapper = mount(CoarMarkdown, {
      props: {
        doc: docWith('ts', 'const x = 1;'),
        fenceRenderers: { mermaid: StubDiagram } as FenceRegistry,
      },
    });

    expect(wrapper.find('[data-testid="stub-diagram"]').exists()).toBe(false);
    expect(wrapper.find('.coar-code-block').exists()).toBe(true);
  });

  it('renders every code block as a plain code block when no registry is given', () => {
    const wrapper = mount(CoarMarkdown, {
      props: { doc: docWith('mermaid', 'flowchart LR\n  A --> B') },
    });

    expect(wrapper.find('[data-testid="stub-diagram"]').exists()).toBe(false);
    expect(wrapper.find('.coar-code-block').exists()).toBe(true);
  });
});

// Type-level: the stub's props satisfy the public FenceRendererProps contract.
const _typecheck: FenceRendererProps = { code: '', language: '' };
void _typecheck;
