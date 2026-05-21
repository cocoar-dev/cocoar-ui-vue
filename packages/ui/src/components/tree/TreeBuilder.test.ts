import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import { useTree } from './useTree';

// See CoarTree.test.ts for why we cast: `defineSlots` on CoarTree gives
// vue-tsc strict slot-shape expectations that `h(...)` can't satisfy through
// the runtime API.
const CoarTree = CoarTreeRaw as Component;

/**
 * Tests that exercise the internal `<CoarContextMenu>` need the overlay
 * service. Install the plugin globally for each mount and reset the service
 * between tests so the singleton doesn't leak state.
 */
const mountOpts = { global: { plugins: [CoarOverlayPlugin] } };

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}

const demoTree: DemoNode[] = [
  {
    id: 'a',
    name: 'Alpha',
    children: [
      { id: 'a1', name: 'Alpha-1' },
      { id: 'a2', name: 'Alpha-2' },
    ],
  },
  { id: 'b', name: 'Bravo' },
];

function makeWrapper(configure: (builder: ReturnType<typeof useTree<DemoNode>>['builder']) => void) {
  const { builder, api } = useTree<DemoNode>();
  builder
    .nodes(demoTree)
    .getId((n) => n.id)
    .getChildren((n) => n.children)
    .getLabel((n) => n.name);
  configure(builder);

  // Use a render function so we can render a sibling <CoarOverlayHost> for
  // the internal context-menu overlay to mount into.
  const Wrapper = defineComponent({
    setup: () => () =>
      h('div', null, [
        h(
          CoarTree,
          { builder },
          {
            default: ({ node }: { node: DemoNode }) => h('span', { class: 'row' }, node.name),
          },
        ),
        h(CoarOverlayHost),
      ]),
  });
  return { wrapper: mount(Wrapper, { attachTo: document.body, ...mountOpts }), builder, api };
}

beforeEach(() => _resetOverlayServiceForTests());
afterEach(() => _resetOverlayServiceForTests());

describe('TreeBuilder + useTree', () => {
  describe('fluent setters', () => {
    it('returns this for chaining', () => {
      const { builder } = useTree<DemoNode>();
      const chain = builder
        .nodes(demoTree)
        .getId((n) => n.id)
        .getChildren((n) => n.children)
        .getLabel((n) => n.name)
        .draggable(true)
        .acceptsFiles(true);
      expect(chain).toBe(builder);
    });

    it('throws when .expanded receives a non-Ref', () => {
      const { builder } = useTree<DemoNode>();
      expect(() => builder.expanded(new Set() as never)).toThrow(/Ref/);
    });

    it('throws when .selected receives a non-Ref', () => {
      const { builder } = useTree<DemoNode>();
      expect(() => builder.selected(null as never)).toThrow(/Ref/);
    });
  });

  describe('rendering through builder', () => {
    it('renders nodes from the builder configuration', () => {
      const expanded = ref(new Set<string>(['a']));
      const { wrapper } = makeWrapper((b) => b.expanded(expanded));
      const rows = wrapper.findAll('.coar-tree-node__row');
      // Alpha + Alpha-1 + Alpha-2 + Bravo = 4
      expect(rows.length).toBe(4);
    });

    it('respects builder-provided expanded ref', async () => {
      const expanded = ref(new Set<string>());
      const { wrapper } = makeWrapper((b) => b.expanded(expanded));
      expect(wrapper.findAll('.coar-tree-node__row').length).toBe(2); // only top-level

      expanded.value = new Set(['a']);
      await nextTick();
      expect(wrapper.findAll('.coar-tree-node__row').length).toBe(4);
    });
  });

  describe('handlers', () => {
    it('calls onActivate on double-click', async () => {
      const onActivate = vi.fn();
      const expanded = ref(new Set<string>(['a']));
      const { wrapper } = makeWrapper((b) => b.expanded(expanded).onActivate(onActivate));
      await wrapper.find('[data-node-id="a1"]').trigger('dblclick');
      expect(onActivate).toHaveBeenCalledOnce();
      expect(onActivate.mock.calls[0][0].id).toBe('a1');
    });
  });

  describe('declarative context menu', () => {
    it('opens the internal menu with folder items on folder right-click', async () => {
      const rename = vi.fn();
      const remove = vi.fn();
      const expanded = ref(new Set<string>(['a']));
      const { wrapper } = makeWrapper((b) =>
        b
          .expanded(expanded)
          .folderMenu((folder) => [
            { label: 'Rename', icon: 'pencil', onClick: () => rename(folder.id) },
            'divider',
            { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => remove(folder.id) },
          ]),
      );
      await wrapper.find('[data-node-id="a"]').trigger('contextmenu');
      await nextTick();
      // The overlay-mounted menu lives outside the wrapper. Look up the
      // global document for it.
      const items = document.querySelectorAll('.coar-menu-item');
      expect(items.length).toBeGreaterThanOrEqual(2);
      // Find the "Delete" item and click it.
      const deleteItem = Array.from(items).find((el) => el.textContent?.includes('Delete'));
      expect(deleteItem).toBeTruthy();
      (deleteItem as HTMLElement).click();
      expect(remove).toHaveBeenCalledWith('a');
      expect(rename).not.toHaveBeenCalled();
    });

    it('falls back to leafMenu items for non-folder nodes', async () => {
      const open = vi.fn();
      const expanded = ref(new Set<string>(['a']));
      const folderItems = vi.fn(() => [{ label: 'FolderOnly', onClick: () => {} }]);
      const { wrapper } = makeWrapper((b) =>
        b
          .expanded(expanded)
          .folderMenu(folderItems)
          .leafMenu(() => [{ label: 'Open', icon: 'file', onClick: open }]),
      );
      await wrapper.find('[data-node-id="a1"]').trigger('contextmenu');
      await nextTick();
      // The folderMenu fn must not be called for a leaf right-click.
      expect(folderItems).not.toHaveBeenCalled();
      const items = document.querySelectorAll('.coar-menu-item');
      const openItem = Array.from(items).find((el) => el.textContent?.includes('Open'));
      expect(openItem).toBeTruthy();
    });

    it('uses viewportMenu on background right-click', async () => {
      const newFolder = vi.fn();
      const { wrapper } = makeWrapper((b) =>
        b.viewportMenu(() => [{ label: 'New folder', icon: 'plus', onClick: newFolder }]),
      );
      await wrapper.find('.coar-tree').trigger('contextmenu');
      await nextTick();
      const items = document.querySelectorAll('.coar-menu-item');
      const item = Array.from(items).find((el) => el.textContent?.includes('New folder'));
      expect(item).toBeTruthy();
      (item as HTMLElement).click();
      expect(newFolder).toHaveBeenCalled();
    });
  });

  describe('event-variant context menu (escape hatch)', () => {
    it('onFolderContextMenu wins over folderMenu', async () => {
      const folderMenuFn = vi.fn(() => [{ label: 'X', onClick: () => {} }]);
      const eventHandler = vi.fn();
      const expanded = ref(new Set<string>(['a']));
      const { wrapper } = makeWrapper((b) =>
        b.expanded(expanded).folderMenu(folderMenuFn).onFolderContextMenu(eventHandler),
      );
      await wrapper.find('[data-node-id="a"]').trigger('contextmenu');
      await nextTick();
      expect(eventHandler).toHaveBeenCalledOnce();
      // `folderMenu` is only called when the internal menu would actually
      // render — the escape-hatch bypassed that path. No need to assert on
      // DOM items: leftover overlay nodes from previous tests in the same
      // file would make that assertion flaky.
      expect(folderMenuFn).not.toHaveBeenCalled();
    });
  });

  describe('api.focusNode', () => {
    it('warns when called before mount', () => {
      const { api } = useTree<DemoNode>();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      api.focusNode('whatever');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('selects the node after mount', async () => {
      const selected = ref<string | null>(null);
      const expanded = ref(new Set<string>(['a']));
      const { api } = makeWrapper((b) => b.expanded(expanded).selected(selected));
      await nextTick();
      api.focusNode('a2');
      await nextTick();
      expect(selected.value).toBe('a2');
    });
  });

  describe('api readonly refs', () => {
    it('selectedId mirrors the builder-provided ref', async () => {
      const selected = ref<string | null>(null);
      const expanded = ref(new Set<string>(['a']));
      const { wrapper, api } = makeWrapper((b) => b.expanded(expanded).selected(selected));
      await wrapper.find('[data-node-id="a1"]').trigger('click');
      expect(api.selectedId.value).toBe('a1');
      expect(selected.value).toBe('a1');
    });
  });

  describe('back-compat with props mode', () => {
    it('renders without a builder using bare props', () => {
      const expanded = ref(new Set<string>(['a']));
      const Wrapper = defineComponent({
        setup: () => () =>
          h('div', null, [
            h(
              CoarTree,
              {
                nodes: demoTree,
                getId: (n: DemoNode) => n.id,
                getChildren: (n: DemoNode) => n.children,
                expanded: expanded.value,
                'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
              },
              {
                default: ({ node }: { node: DemoNode }) => h('span', null, node.name),
              },
            ),
          ]),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body, ...mountOpts });
      expect(wrapper.findAll('.coar-tree-node__row').length).toBe(4);
    });
  });
});
