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

  describe('separator rendering', () => {
    it('renders separator CSS variable between items', () => {
      const wrapper = createBreadcrumb({
        separator: '>',
        items: [{ label: 'Home' }, { label: 'Products' }, { label: 'Detail' }],
      });
      const nav = wrapper.find('nav');
      expect(nav.attributes('style')).toContain("'>'");
    });

    it('renders items as list items inside an ordered list', () => {
      const wrapper = createBreadcrumb({
        items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
      });
      const ol = wrapper.find('ol');
      expect(ol.exists()).toBe(true);
      const lis = ol.findAll('li');
      expect(lis).toHaveLength(3);
    });

    it('applies coar-breadcrumb-list class to the ordered list', () => {
      const wrapper = createBreadcrumb({
        items: [{ label: 'A' }, { label: 'B' }],
      });
      expect(wrapper.find('.coar-breadcrumb-list').exists()).toBe(true);
    });
  });

  describe('active item aria-current', () => {
    it('sets aria-current="page" only on the active item', () => {
      const wrapper = createBreadcrumb({
        items: [
          { label: 'Home', href: '#' },
          { label: 'Category', href: '#' },
          { label: 'Product', active: true },
        ],
      });
      const items = wrapper.findAll('.coar-breadcrumb-item');
      expect(items[0].attributes('aria-current')).toBeUndefined();
      expect(items[1].attributes('aria-current')).toBeUndefined();
      expect(items[2].attributes('aria-current')).toBe('page');
    });

    it('does not set aria-current on any item when none is active', () => {
      const wrapper = createBreadcrumb({
        items: [
          { label: 'Home', href: '#' },
          { label: 'Products', href: '#' },
        ],
      });
      const items = wrapper.findAll('.coar-breadcrumb-item');
      items.forEach((item) => {
        expect(item.attributes('aria-current')).toBeUndefined();
      });
    });
  });

  describe('item order', () => {
    it('renders items in the order provided', () => {
      const wrapper = createBreadcrumb({
        items: [
          { label: 'Home', href: '#' },
          { label: 'Category', href: '#' },
          { label: 'Subcategory', href: '#' },
          { label: 'Product', active: true },
        ],
      });
      const items = wrapper.findAll('.coar-breadcrumb-item');
      expect(items).toHaveLength(4);
      expect(items[0].text()).toBe('Home');
      expect(items[1].text()).toBe('Category');
      expect(items[2].text()).toBe('Subcategory');
      expect(items[3].text()).toBe('Product');
    });

    it('renders a single item without separators', () => {
      const wrapper = createBreadcrumb({
        items: [{ label: 'Home', active: true }],
      });
      const items = wrapper.findAll('.coar-breadcrumb-item');
      expect(items).toHaveLength(1);
      expect(items[0].text()).toBe('Home');
    });

    it('renders links only for non-active items with href', () => {
      const wrapper = createBreadcrumb({
        items: [
          { label: 'Home', href: '/home' },
          { label: 'About', href: '/about' },
          { label: 'Current', active: true },
        ],
      });
      const links = wrapper.findAll('a');
      expect(links).toHaveLength(2);
      expect(links[0].text()).toBe('Home');
      expect(links[0].attributes('href')).toBe('/home');
      expect(links[1].text()).toBe('About');
      expect(links[1].attributes('href')).toBe('/about');
    });
  });

  describe('baseline alignment', () => {
    it('renders breadcrumb-list as a flex container', () => {
      const wrapper = createBreadcrumb({
        items: [{ label: 'A' }, { label: 'B' }],
      });
      const ol = wrapper.find('.coar-breadcrumb-list');
      expect(ol.exists()).toBe(true);
      // The ol must be the flex container with baseline alignment (via CSS)
      expect(ol.element.tagName).toBe('OL');
    });

    it('renders each item as an inline-flex li', () => {
      const wrapper = createBreadcrumb({
        items: [{ label: 'A' }, { label: 'B' }],
      });
      const items = wrapper.findAll('.coar-breadcrumb-item');
      items.forEach((item) => {
        expect(item.element.tagName).toBe('LI');
      });
    });
  });
});
