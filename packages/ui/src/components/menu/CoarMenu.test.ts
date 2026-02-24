import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarMenu from './CoarMenu.vue';
import CoarMenuItem from './CoarMenuItem.vue';
import CoarMenuDivider from './CoarMenuDivider.vue';
import CoarMenuHeading from './CoarMenuHeading.vue';
import CoarSubExpand from './CoarSubExpand.vue';
import CoarSubmenuItem from './CoarSubmenuItem.vue';
import { shouldDelaySubmenuSwitch } from './menu-aim';

describe('CoarMenu', () => {
  it('should render with role="menu"', () => {
    const wrapper = mount(CoarMenu);
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
  });

  it('should render slot content', () => {
    const wrapper = mount(CoarMenu, {
      slots: { default: '<div class="test-item">Item</div>' },
    });
    expect(wrapper.find('.test-item').exists()).toBe(true);
  });

  it('should apply borderless class', () => {
    const wrapper = mount(CoarMenu, { props: { borderless: true } });
    expect(wrapper.find('.coar-menu--borderless').exists()).toBe(true);
  });

  it('should hide icon column when showIconColumn is false', () => {
    const wrapper = mount(CoarMenu, { props: { showIconColumn: false } });
    const style = wrapper.find('.coar-menu').attributes('style');
    expect(style).toContain('--coar-menu-icon-slot-display: none');
    expect(style).toContain('--coar-menu-item-icon-slot-size: 0px');
  });
});

describe('CoarMenuItem', () => {
  const stubs = { CoarIcon: { template: '<span />', props: ['name', 'size'] } };

  it('should render with role="menuitem"', () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    expect(wrapper.find('[role="menuitem"]').exists()).toBe(true);
  });

  it('should render label text from prop', () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Save');
  });

  it('should render label text from slot', () => {
    const wrapper = mount(CoarMenuItem, {
      slots: { default: 'Copy' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Copy');
  });

  it('should emit clicked event on click', async () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    await wrapper.find('.coar-menu-item').trigger('click');
    expect(wrapper.emitted('clicked')).toHaveLength(1);
  });

  it('should provide keepMenuOpen in click event', async () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    await wrapper.find('.coar-menu-item').trigger('click');
    const event = wrapper.emitted('clicked')![0][0] as { keepMenuOpen: () => void };
    expect(typeof event.keepMenuOpen).toBe('function');
  });

  it('should not emit clicked when disabled', async () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save', disabled: true },
      global: { stubs },
    });
    await wrapper.find('.coar-menu-item').trigger('click');
    expect(wrapper.emitted('clicked')).toBeUndefined();
  });

  it('should have disabled styling', () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save', disabled: true },
      global: { stubs },
    });
    expect(wrapper.find('.coar-menu-item--disabled').exists()).toBe(true);
  });

  it('should set aria-disabled when disabled', () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save', disabled: true },
      global: { stubs },
    });
    expect(wrapper.find('[role="menuitem"]').attributes('aria-disabled')).toBe('true');
  });

  it('should set tabindex=-1 when disabled', () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save', disabled: true },
      global: { stubs },
    });
    expect(wrapper.find('[role="menuitem"]').attributes('tabindex')).toBe('-1');
  });

  it('should emit clicked on Enter key', async () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    await wrapper.find('.coar-menu-item').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('clicked')).toHaveLength(1);
  });

  it('should emit clicked on Space key', async () => {
    const wrapper = mount(CoarMenuItem, {
      props: { label: 'Save' },
      global: { stubs },
    });
    await wrapper.find('.coar-menu-item').trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('clicked')).toHaveLength(1);
  });
});

describe('CoarMenuDivider', () => {
  it('should render with role="separator"', () => {
    const wrapper = mount(CoarMenuDivider);
    expect(wrapper.find('[role="separator"]').exists()).toBe(true);
  });

  it('should have divider class', () => {
    const wrapper = mount(CoarMenuDivider);
    expect(wrapper.find('.coar-menu-divider').exists()).toBe(true);
  });
});

describe('CoarMenuHeading', () => {
  it('should render label from prop', () => {
    const wrapper = mount(CoarMenuHeading, { props: { label: 'Section' } });
    expect(wrapper.text()).toContain('Section');
  });

  it('should render label from slot', () => {
    const wrapper = mount(CoarMenuHeading, { slots: { default: 'Group' } });
    expect(wrapper.text()).toContain('Group');
  });

  it('should have heading class', () => {
    const wrapper = mount(CoarMenuHeading, { props: { label: 'Section' } });
    expect(wrapper.find('.coar-menu-heading').exists()).toBe(true);
  });
});

describe('CoarSubExpand', () => {
  const stubs = {
    CoarIcon: { template: '<span />', props: ['name', 'size'] },
  };

  it('should render label', () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Filters');
  });

  it('should have aria-expanded="false" initially', () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    expect(wrapper.find('[aria-expanded]').attributes('aria-expanded')).toBe('false');
  });

  it('should toggle open on click', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('click');
    expect(wrapper.find('[aria-expanded="true"]').exists()).toBe(true);
  });

  it('should toggle closed on second click', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('click');
    await wrapper.find('.coar-sub-expand').trigger('click');
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });

  it('should apply open panel class when expanded', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('click');
    expect(wrapper.find('.coar-sub-expand__panel--open').exists()).toBe(true);
  });

  it('should not toggle when disabled', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters', disabled: true },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('click');
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });

  it('should render slot content inside panel', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      slots: { default: '<div class="nested-content">Nested</div>' },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('click');
    expect(wrapper.find('.nested-content').exists()).toBe(true);
  });

  it('should support v-model:open', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters', open: true, 'onUpdate:open': (v: boolean) => wrapper.setProps({ open: v }) },
      global: { stubs },
    });
    expect(wrapper.find('[aria-expanded="true"]').exists()).toBe(true);
  });

  it('should toggle on Enter key', async () => {
    const wrapper = mount(CoarSubExpand, {
      props: { label: 'Filters' },
      global: { stubs },
    });
    await wrapper.find('.coar-sub-expand').trigger('keydown.enter');
    expect(wrapper.find('[aria-expanded="true"]').exists()).toBe(true);
  });
});

describe('CoarSubmenuItem', () => {
  const stubs = {
    CoarIcon: { template: '<span />', props: ['name', 'size'] },
    Teleport: true,
  };

  it('should render label', () => {
    const wrapper = mount(CoarSubmenuItem, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Share');
  });

  it('should have aria-haspopup="menu"', () => {
    const wrapper = mount(CoarSubmenuItem, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(true);
  });

  it('should start with aria-expanded="false"', () => {
    const wrapper = mount(CoarSubmenuItem, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });

  it('should apply disabled class', () => {
    const wrapper = mount(CoarSubmenuItem, {
      props: { label: 'Share', disabled: true },
      global: { stubs },
    });
    expect(wrapper.find('.coar-submenu-item--disabled').exists()).toBe(true);
  });

  it('should not respond to click when disabled', async () => {
    const wrapper = mount(CoarSubmenuItem, {
      props: { label: 'Share', disabled: true },
      global: { stubs },
    });
    await wrapper.find('.coar-submenu-item').trigger('click');
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });
});

describe('shouldDelaySubmenuSwitch', () => {
  const makeRect = (left: number, top: number, w: number, h: number) =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON: () => ({}) } as DOMRect);

  it('should return false when no previous point', () => {
    const current = { x: 100, y: 100, t: 1000 };
    expect(shouldDelaySubmenuSwitch(null, current, makeRect(200, 50, 200, 300), 'right')).toBe(false);
  });

  it('should return false when sample is too old', () => {
    const previous = { x: 90, y: 100, t: 500 };
    const current = { x: 100, y: 100, t: 1000 };
    expect(shouldDelaySubmenuSwitch(previous, current, makeRect(200, 50, 200, 300), 'right', 200)).toBe(false);
  });

  it('should return false when moving away from submenu', () => {
    const previous = { x: 100, y: 100, t: 990 };
    const current = { x: 90, y: 100, t: 1000 };
    expect(shouldDelaySubmenuSwitch(previous, current, makeRect(200, 50, 200, 300), 'right')).toBe(false);
  });

  it('should return true when aiming toward submenu', () => {
    const previous = { x: 80, y: 150, t: 990 };
    const current = { x: 100, y: 150, t: 1000 };
    expect(shouldDelaySubmenuSwitch(previous, current, makeRect(200, 50, 200, 300), 'right')).toBe(true);
  });

  it('should return false when moving perpendicular', () => {
    const previous = { x: 100, y: 10, t: 990 };
    const current = { x: 103, y: 10, t: 1000 };
    expect(shouldDelaySubmenuSwitch(previous, current, makeRect(200, 50, 200, 300), 'right')).toBe(false);
  });
});
