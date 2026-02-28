import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref, computed, h } from 'vue';
import { parseFragment, type RoutedFragmentBase, type ParsedRoute } from '@cocoar/vue-fragment-parser';

const FragmentParserDemo = defineComponent({
  name: 'FragmentParserDemo',
  props: {
    initialFragment: { type: String, default: '' },
    routes: { type: Array as () => RoutedFragmentBase[], default: () => [] },
  },
  setup(props) {
    const fragment = ref(props.initialFragment);
    const parsed = computed<ParsedRoute[]>(() => {
      if (!fragment.value) return [];
      return parseFragment(fragment.value, props.routes);
    });

    return () =>
      h('div', { style: 'font-family: system-ui, sans-serif; max-width: 800px;' }, [
        // Input
        h('div', { style: 'margin-bottom: 24px;' }, [
          h('label', {
            style: 'display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px;',
          }, 'URL Fragment'),
          h('div', {
            style: 'display: flex; align-items: center; gap: 8px;',
          }, [
            h('span', {
              style: 'color: #888; font-size: 18px; font-family: monospace;',
            }, '#'),
            h('input', {
              value: fragment.value,
              onInput: (e: Event) => { fragment.value = (e.target as HTMLInputElement).value; },
              placeholder: 'e.g. details/123?edit=true#confirm',
              style: 'flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; font-family: monospace; outline: none;',
            }),
          ]),
        ]),

        // Registered routes
        h('div', { style: 'margin-bottom: 24px;' }, [
          h('div', {
            style: 'font-weight: 600; font-size: 14px; margin-bottom: 8px;',
          }, 'Registered Routes'),
          h('div', {
            style: 'display: flex; flex-wrap: wrap; gap: 8px;',
          }, props.routes.map((route) => {
            const paths = Array.isArray(route.path) ? route.path : [route.path];
            return paths.map((p) =>
              h('span', {
                style: `display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-family: monospace; background: ${route.type === 'action' ? '#fef3c7' : '#dbeafe'}; color: ${route.type === 'action' ? '#92400e' : '#1e40af'};`,
              }, [
                h('span', {
                  style: 'font-size: 11px; opacity: 0.7; font-family: system-ui;',
                }, route.type),
                p,
              ]),
            );
          }).flat()),
        ]),

        // Results
        h('div', {}, [
          h('div', {
            style: 'font-weight: 600; font-size: 14px; margin-bottom: 8px;',
          }, `Parsed Results (${parsed.value.length})`),

          parsed.value.length === 0
            ? h('div', {
                style: 'padding: 24px; text-align: center; color: #9ca3af; background: #f9fafb; border-radius: 8px; border: 1px dashed #e5e7eb;',
              }, fragment.value ? 'No matching routes found' : 'Type a fragment above to see parsed results')
            : h('div', {
                style: 'display: flex; flex-direction: column; gap: 12px;',
              }, parsed.value.map((result, i) =>
                h('div', {
                  key: i,
                  style: 'border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;',
                }, [
                  // Header
                  h('div', {
                    style: 'padding: 10px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;',
                  }, [
                    h('span', { style: 'font-family: monospace; font-size: 14px; font-weight: 600;' }, result.fragment),
                    h('span', {
                      style: `font-size: 12px; padding: 2px 8px; border-radius: 4px; background: ${result.route.type === 'action' ? '#fef3c7' : '#dbeafe'}; color: ${result.route.type === 'action' ? '#92400e' : '#1e40af'};`,
                    }, result.route.type),
                  ]),
                  // Params
                  h('div', { style: 'padding: 14px;' }, [
                    h('div', { style: 'font-size: 12px; color: #6b7280; margin-bottom: 6px;' }, 'Matched path:'),
                    h('code', {
                      style: 'display: block; margin-bottom: 12px; font-size: 13px; color: #059669;',
                    }, result.route.path as string),
                    h('div', { style: 'font-size: 12px; color: #6b7280; margin-bottom: 6px;' }, 'Parameters:'),
                    Object.keys(result.params).length === 0
                      ? h('span', { style: 'font-size: 13px; color: #9ca3af;' }, '(none)')
                      : h('table', {
                          style: 'width: 100%; border-collapse: collapse; font-size: 13px;',
                        }, [
                          h('thead', {}, [
                            h('tr', {}, [
                              h('th', { style: 'text-align: left; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500;' }, 'Key'),
                              h('th', { style: 'text-align: left; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500;' }, 'Value'),
                              h('th', { style: 'text-align: left; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500;' }, 'Type'),
                            ]),
                          ]),
                          h('tbody', {}, Object.entries(result.params).map(([key, value]) =>
                            h('tr', { key }, [
                              h('td', { style: 'padding: 4px 8px; font-family: monospace; color: #7c3aed;' }, key),
                              h('td', { style: 'padding: 4px 8px; font-family: monospace;' }, String(value)),
                              h('td', { style: 'padding: 4px 8px; font-family: monospace; color: #9ca3af; font-size: 12px;' }, typeof value),
                            ]),
                          )),
                        ]),
                  ]),
                ]),
              )),
        ]),
      ]);
  },
});

const meta: Meta<typeof FragmentParserDemo> = {
  title: 'Utilities/FragmentParser',
  component: FragmentParserDemo,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof FragmentParserDemo>;

// -- Routes used in stories --

const demoRoutes: RoutedFragmentBase[] = [
  { type: 'modal', path: 'details/:id' },
  { type: 'modal', path: 'edit/:id/:section' },
  { type: 'action', path: 'confirm' },
  { type: 'action', path: 'close' },
];

export const Interactive: Story = {
  render: () => ({
    components: { FragmentParserDemo },
    setup() {
      return { routes: demoRoutes };
    },
    template: `<FragmentParserDemo initialFragment="details/123?edit=true" :routes="routes" />`,
  }),
};

export const MultipleFragments: Story = {
  render: () => ({
    components: { FragmentParserDemo },
    setup() {
      return { routes: demoRoutes };
    },
    template: `<FragmentParserDemo initialFragment="details/456?tab=settings#confirm?force=true" :routes="routes" />`,
  }),
};

export const StackedModals: Story = {
  render: () => ({
    components: { FragmentParserDemo },
    setup() {
      return { routes: demoRoutes };
    },
    template: `<FragmentParserDemo initialFragment="details/100#edit/200/profile" :routes="routes" />`,
  }),
};

export const QueryParameterTypes: Story = {
  render: () => ({
    components: { FragmentParserDemo },
    setup() {
      return { routes: demoRoutes };
    },
    template: `<FragmentParserDemo initialFragment="confirm?string=hello&number=42&bool=true&nullValue=null" :routes="routes" />`,
  }),
};

export const ArrayPaths: Story = {
  render: () => ({
    components: { FragmentParserDemo },
    setup() {
      const routes: RoutedFragmentBase[] = [
        { type: 'tab', path: ['overview', 'usage', 'palette'] },
        { type: 'action', path: 'close' },
      ];
      return { routes };
    },
    template: `<FragmentParserDemo initialFragment="usage#close" :routes="routes" />`,
  }),
};
