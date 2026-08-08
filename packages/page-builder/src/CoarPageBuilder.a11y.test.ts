import { describe, it, expect } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarPageBuilder from './CoarPageBuilder.vue';
import type { PageNode } from './schema';

const schemaWithNodes = (): PageNode => ({
  id: 'root',
  type: 'page',
  schemaVersion: 2,
  children: [
    { id: 'h', type: 'heading', props: { text: 'Title', level: 2 } },
    { id: 's', type: 'stack', props: {}, children: [{ id: 'p', type: 'paragraph', props: { text: 'Hi' } }] },
  ],
});

function mountBuilder(initial?: PageNode) {
  const Host = defineComponent({
    components: { CoarPageBuilder },
    setup() {
      const schema = ref<PageNode | undefined>(initial);
      return { schema };
    },
    template: `
      <div>
        <input id="outside" />
        <div style="height: 600px"><CoarPageBuilder v-model="schema" /></div>
      </div>
    `,
  });
  return mount(Host, { attachTo: document.body });
}

describe('CoarPageBuilder — outline tree semantics', () => {
  async function openStructure(wrapper: ReturnType<typeof mountBuilder>) {
    await wrapper.get('button[title="Structure"]').trigger('click');
    await nextTick();
  }

  it('exposes role=tree with treeitems carrying level, selection and roving tabindex', async () => {
    const wrapper = mountBuilder(schemaWithNodes());
    expect(wrapper.find('[role="tree"]').exists()).toBe(false);
    await openStructure(wrapper);
    const tree = wrapper.find('[role="tree"]');
    expect(tree.exists()).toBe(true);

    const items = wrapper.findAll('[role="treeitem"]');
    expect(items.length).toBe(4); // page, heading, stack, paragraph

    const root = items[0];
    expect(root.attributes('aria-level')).toBe('1');
    expect(root.attributes('aria-expanded')).toBe('true');
    // Initial selection is the root → it is the single tab stop.
    expect(root.attributes('tabindex')).toBe('0');
    expect(root.attributes('aria-selected')).toBe('true');
    expect(items[1].attributes('tabindex')).toBe('-1');
    expect(items[1].attributes('aria-level')).toBe('2');
    wrapper.unmount();
  });

  it('ArrowDown/ArrowUp move focus through the rows, Enter selects', async () => {
    const wrapper = mountBuilder(schemaWithNodes());
    await openStructure(wrapper);
    const rows = wrapper.findAll('[role="treeitem"]');
    (rows[0].element as HTMLElement).focus();

    await rows[0].trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[1].element);

    await rows[1].trigger('keydown', { key: 'Enter' });
    await nextTick();
    expect(rows[1].attributes('aria-selected')).toBe('true');
    expect(rows[1].attributes('tabindex')).toBe('0');

    await rows[1].trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(rows[0].element);
    wrapper.unmount();
  });
});

/**
 * The innermost canvas node whose own tab label starts with `label` —
 * matching on node text would hit ancestors too (the root contains all text).
 */
function canvasNodeByTab(wrapper: ReturnType<typeof mountBuilder>, label: string): HTMLElement {
  const tab = wrapper
    .findAll('.canvas-node__tab-label')
    .find((l) => l.text().startsWith(label))!;
  return tab.element.closest('.canvas-node') as HTMLElement;
}

describe('CoarPageBuilder — scoped keyboard shortcuts', () => {
  it('Delete removes the selected node only while focus is inside the builder', async () => {
    const wrapper = mountBuilder(schemaWithNodes());
    const nodeCount = () => wrapper.findAll('.canvas-node').length;
    const before = nodeCount();

    // Select + focus the heading canvas node → Delete must remove it.
    const heading = canvasNodeByTab(wrapper, 'heading');
    heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    heading.focus();
    await nextTick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    expect(nodeCount()).toBe(before - 1);

    // Select a node, then move focus OUTSIDE → Delete must be ignored.
    const stack = canvasNodeByTab(wrapper, 'stack');
    stack.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    (wrapper.find('#outside').element as HTMLElement).focus();
    await nextTick();
    const count = nodeCount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    expect(nodeCount()).toBe(count);
    wrapper.unmount();
  });

  it('Ctrl+Z inside the builder undoes; inside an editable target it does not', async () => {
    const wrapper = mountBuilder(schemaWithNodes());
    const nodeCount = () => wrapper.findAll('.canvas-node').length;

    const heading = canvasNodeByTab(wrapper, 'heading');
    heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    heading.focus();
    await nextTick();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    const afterDelete = nodeCount();

    // Undo from inside the builder restores the node.
    (wrapper.find('.pb-builder').element as HTMLElement).focus();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    await nextTick();
    expect(nodeCount()).toBe(afterDelete + 1);

    // Redo is available; firing Ctrl+Z with focus in an editable target must
    // NOT trigger the builder's undo/redo machinery.
    const outside = wrapper.find('#outside').element as HTMLElement;
    outside.focus();
    const stable = nodeCount();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }),
    );
    await nextTick();
    expect(nodeCount()).toBe(stable);
    wrapper.unmount();
  });
});
