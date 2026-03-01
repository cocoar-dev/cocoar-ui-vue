import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CoarBreadcrumb from './CoarBreadcrumb.vue';
import CoarBreadcrumbItem from './CoarBreadcrumbItem.vue';

function createBreadcrumb(options: {
  separator?: string;
  items: Array<{ label: string; active?: boolean; href?: string }>;
}) {
  const itemSlots = options.items
    .map((item) => {
      const attrs = item.active ? 'active' : '';
      const content = item.href ? `<a href="${item.href}">${item.label}</a>` : item.label;
      return `<CoarBreadcrumbItem ${attrs}>${content}</CoarBreadcrumbItem>`;
    })
    .join('\n');

  const sepAttr = options.separator ? `separator="${options.separator}"` : '';

  return mount(
    {
      components: { CoarBreadcrumb, CoarBreadcrumbItem },
      template: `<CoarBreadcrumb ${sepAttr}>${itemSlots}</CoarBreadcrumb>`,
    },
    { attachTo: document.body },
  );
}

describe('CoarBreadcrumb', () => {
  it('renders a nav with aria-label', () => {
    const wrapper = createBreadcrumb({ items: [{ label: 'Home' }] });
    const nav = wrapper.find('nav');
    expect(nav.exists()).toBe(true);
    expect(nav.attributes('aria-label')).toBe('Breadcrumb');
  });

  it('renders an ordered list', () => {
    const wrapper = createBreadcrumb({ items: [{ label: 'A' }, { label: 'B' }] });
    expect(wrapper.find('ol').exists()).toBe(true);
  });

  it('renders breadcrumb items', () => {
    const wrapper = createBreadcrumb({
      items: [
        { label: 'Home', href: '#' },
        { label: 'Products', href: '#' },
        { label: 'Current', active: true },
      ],
    });
    const items = wrapper.findAll('.coar-breadcrumb-item');
    expect(items).toHaveLength(3);
  });

  it('marks active item with aria-current="page"', () => {
    const wrapper = createBreadcrumb({
      items: [
        { label: 'Home', href: '#' },
        { label: 'Current', active: true },
      ],
    });
    const items = wrapper.findAll('.coar-breadcrumb-item');
    expect(items[0].attributes('aria-current')).toBeUndefined();
    expect(items[1].attributes('aria-current')).toBe('page');
  });

  it('active item has the active class', () => {
    const wrapper = createBreadcrumb({
      items: [
        { label: 'Home', href: '#' },
        { label: 'Current', active: true },
      ],
    });
    const items = wrapper.findAll('.coar-breadcrumb-item');
    expect(items[0].classes()).not.toContain('coar-breadcrumb-item--active');
    expect(items[1].classes()).toContain('coar-breadcrumb-item--active');
  });

  it('renders links in non-active items', () => {
    const wrapper = createBreadcrumb({
      items: [
        { label: 'Home', href: '/home' },
        { label: 'Current', active: true },
      ],
    });
    const link = wrapper.find('a');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('/home');
    expect(link.text()).toBe('Home');
  });

  it('sets separator CSS variable', () => {
    const wrapper = createBreadcrumb({
      separator: '›',
      items: [{ label: 'A' }, { label: 'B' }],
    });
    const nav = wrapper.find('nav');
    expect(nav.attributes('style')).toContain("'›'");
  });

  it('uses default separator when none specified', () => {
    const wrapper = createBreadcrumb({
      items: [{ label: 'A' }, { label: 'B' }],
    });
    const nav = wrapper.find('nav');
    expect(nav.attributes('style')).toContain("'/'");
  });

  it('escapes single quotes in separator', () => {
    const wrapper = createBreadcrumb({
      separator: "it's",
      items: [{ label: 'A' }, { label: 'B' }],
    });
    const nav = wrapper.find('nav');
    expect(nav.attributes('style')).toContain("it\\'s");
  });

  it('renders with default aria-label', () => {
    const wrapper = createBreadcrumb({ items: [{ label: 'Home' }] });
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Breadcrumb');
  });

  it('renders with custom aria-label', () => {
    const wrapper = mount(
      {
        components: { CoarBreadcrumb, CoarBreadcrumbItem },
        template: `<CoarBreadcrumb ariaLabel="Standort"><CoarBreadcrumbItem>Start</CoarBreadcrumbItem></CoarBreadcrumb>`,
      },
      { attachTo: document.body },
    );
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Standort');
  });
});
