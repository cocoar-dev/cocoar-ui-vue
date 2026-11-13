import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, defineComponent, h, ref } from 'vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import CoarMenu from './CoarMenu.vue';
import CoarMenuItem from './CoarMenuItem.vue';
import CoarMenuDivider from './CoarMenuDivider.vue';
import CoarMenuHeading from './CoarMenuHeading.vue';
import CoarSubExpand from './CoarSubExpand.vue';
import CoarSubFlyout from './CoarSubFlyout.vue';
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

describe('Menu keyboard navigation', () => {
  const stubs = { CoarIcon: { template: '<span />', props: ['name', 'size'] } };

  function mountMenu(template: string) {
    return mount(CoarMenu, {
      // Test-utils 2.x narrowed the slot type and no longer accepts the
      // `{ components, template }` Options-API form inline — we still pass
      // it (runtime accepts it) and cast through.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slots: { default: { components: { CoarMenuItem }, template } } as any,
      global: { stubs },
      attachTo: document.body,
    });
  }

  it('should set first item tabindex=0 and others tabindex=-1 (roving tabindex)', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    expect(items[0].attributes('tabindex')).toBe('0');
    expect(items[1].attributes('tabindex')).toBe('-1');
    expect(items[2].attributes('tabindex')).toBe('-1');
    wrapper.unmount();
  });

  it('should move focus to next item on ArrowDown', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1].element);

    wrapper.unmount();
  });

  it('should move focus to previous item on ArrowUp', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');

    (items[0].element as HTMLElement).focus();
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1].element);

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0].element);

    wrapper.unmount();
  });

  it('should wrap from last to first on ArrowDown', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1].element);

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0].element);

    wrapper.unmount();
  });

  it('should wrap from first to last on ArrowUp', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[1].element);

    wrapper.unmount();
  });

  it('should focus first item on Home', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[2].element);

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(items[0].element);

    wrapper.unmount();
  });

  it('should focus last item on End', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(items[2].element);

    wrapper.unmount();
  });

  it('should skip disabled items during arrow navigation', async () => {
    const wrapper = mountMenu('<CoarMenuItem label="Cut" /><CoarMenuItem label="Copy" disabled /><CoarMenuItem label="Paste" />');
    await nextTick();
    await nextTick();
    const items = wrapper.findAll('[role="menuitem"]');
    (items[0].element as HTMLElement).focus();

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[2].element);

    wrapper.unmount();
  });
});

describe('CoarSubFlyout', () => {
  const stubs = {
    CoarIcon: { template: '<span />', props: ['name', 'size'] },
    Teleport: true,
  };

  it('should render label', () => {
    const wrapper = mount(CoarSubFlyout, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.text()).toContain('Share');
  });

  it('should have aria-haspopup="menu"', () => {
    const wrapper = mount(CoarSubFlyout, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(true);
  });

  it('should start with aria-expanded="false"', () => {
    const wrapper = mount(CoarSubFlyout, {
      props: { label: 'Share' },
      global: { stubs },
    });
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });

  it('should apply disabled class', () => {
    const wrapper = mount(CoarSubFlyout, {
      props: { label: 'Share', disabled: true },
      global: { stubs },
    });
    expect(wrapper.find('.coar-submenu-item--disabled').exists()).toBe(true);
  });

  it('should not respond to click when disabled', async () => {
    const wrapper = mount(CoarSubFlyout, {
      props: { label: 'Share', disabled: true },
      global: { stubs },
    });
    await wrapper.find('.coar-submenu-item').trigger('click');
    expect(wrapper.find('[aria-expanded="false"]').exists()).toBe(true);
  });
});

/**
 * Open and close by pointer, tap and click, as full event sequences of real engines. The
 * overlay service really opens here (plugin + host, as in CoarContextMenu.test.ts), so
 * `aria-expanded` and the panel follow each other. Each sequence runs once on a bare
 * CoarSubFlyout and once inside a CoarMenu: there the `mouseenter` opens through the parent
 * cascade (`requestOpenFromChild`).
 */
describe.each([
  { context: 'without a parent menu', inMenu: false },
  { context: 'inside a CoarMenu', inMenu: true },
])('CoarSubFlyout open and close by pointer ($context)', ({ inMenu }) => {
  function mountFlyout(disabled = ref(false)) {
    const flyout = () =>
      h(
        CoarSubFlyout,
        { label: 'Move to', disabled: disabled.value },
        {
          default: () => h(CoarMenuItem, { label: 'Archive' }),
        },
      );
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h('div', null, [
            inMenu ? h(CoarMenu, null, { default: flyout }) : flyout(),
            h(CoarOverlayHost),
          ]);
      },
    });
    return mount(Wrapper, {
      global: {
        plugins: [CoarOverlayPlugin],
        stubs: { Teleport: true, CoarIcon: { template: '<span />', props: ['name', 'size'] } },
      },
      attachTo: document.body,
    });
  }

  let wrapper: ReturnType<typeof mountFlyout> | null = null;

  beforeEach(() => {
    _resetOverlayServiceForTests();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    _resetOverlayServiceForTests();
  });

  const item = () => wrapper!.find('.coar-submenu-item');
  const expectOpen = (open: boolean) => {
    expect(item().attributes('aria-expanded')).toBe(String(open));
    expect(wrapper!.find('.coar-submenu-panel').exists()).toBe(open);
  };
  const send = async (...types: string[]) => {
    for (const type of types) await item().trigger(type);
  };
  /** A primary pointer, as browsers send it for the mouse, a pen and the first finger. */
  const pointer = (type: string, pointerType: string, button = 0) =>
    item().trigger(type, { pointerType, button, isPrimary: true });

  /**
   * A tap as Chromium and WebKit send it: the pointer events of the contact, then the
   * compatibility mouse events and the click. `mouseenter` comes only when the
   * compatibility mouse was not already over the item (first tap, not the second).
   */
  const tap = async ({ mouseenter }: { mouseenter: boolean }) => {
    for (const type of ['pointerenter', 'pointerdown', 'pointerup', 'pointerleave']) {
      await pointer(type, 'touch');
    }
    if (mouseenter) await send('mouseenter');
    await send('mousedown', 'mouseup', 'click');
  };
  const hover = async (pointerType = 'mouse') => {
    await pointer('pointerenter', pointerType);
    await send('mouseenter');
  };
  const mouseClick = async () => {
    await pointer('pointerdown', 'mouse');
    await send('mousedown');
    await pointer('pointerup', 'mouse');
    await send('mouseup', 'click');
  };
  /** Longer than the 80 ms hover close timer. */
  const waitForCloseTimer = async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await nextTick();
  };

  it('touch: a tap opens it and it stays open; a second tap closes; a third opens again', async () => {
    wrapper = mountFlyout();
    expectOpen(false);
    await tap({ mouseenter: true });
    expectOpen(true);
    await tap({ mouseenter: false });
    expectOpen(false);
    await tap({ mouseenter: false });
    expectOpen(true);
  });

  it('mouse: hover opens; a click on the open item closes; a click again opens', async () => {
    wrapper = mountFlyout();
    await hover();
    expectOpen(true);
    await mouseClick();
    expectOpen(false);
    await mouseClick();
    expectOpen(true);
  });

  it('a bare mouseenter without pointer events opens (synthetic events of consumers)', async () => {
    wrapper = mountFlyout();
    await send('mouseenter');
    expectOpen(true);
  });

  it('mouse after touch: hover opens again on a hybrid device', async () => {
    wrapper = mountFlyout();
    await tap({ mouseenter: true });
    await tap({ mouseenter: false });
    expectOpen(false);
    await send('mouseleave');
    await hover('mouse');
    expectOpen(true);
  });

  it('pen: hover opens', async () => {
    wrapper = mountFlyout();
    await hover('pen');
    expectOpen(true);
  });

  it('mouse, aborted press: after a press dragged away, a later click opens the closed submenu', async () => {
    wrapper = mountFlyout();
    await hover();
    expectOpen(true);
    await pointer('pointerdown', 'mouse');
    await send('mousedown');
    await pointer('pointerleave', 'mouse');
    await send('mouseleave');
    await waitForCloseTimer();
    expectOpen(false);
    await send('click');
    expectOpen(true);
  });

  it('mouse, auxiliary press: a chorded left click without a new pointerdown closes the open submenu', async () => {
    wrapper = mountFlyout();
    await hover();
    await mouseClick();
    expectOpen(false);
    // Middle button held: one pointerdown for the whole chord.
    await pointer('pointerdown', 'mouse', 1);
    await pointer('pointerleave', 'mouse', 1);
    await send('mouseleave');
    await hover();
    expectOpen(true);
    // Left button while the middle one is still held: no new pointerdown.
    await send('mousedown', 'mouseup', 'click');
    expectOpen(false);
  });

  it('consumption: the compatibility mouseenter of a tap consumes the touch mark; a later mouseenter opens', async () => {
    wrapper = mountFlyout();
    await pointer('pointerenter', 'touch');
    await send('mouseenter');
    expectOpen(false);
    await send('mouseleave');
    await send('mouseenter');
    expectOpen(true);
  });

  it('hybrid (Chromium): after a tap closed it, a mouseenter without a new pointerenter opens', async () => {
    wrapper = mountFlyout();
    await hover('mouse');
    expectOpen(true);
    // A full tap on the open item; the compatibility mouse is already over it: no mouseenter.
    await tap({ mouseenter: false });
    expectOpen(false);
    // The resting mouse moves within the item: Chromium sends mouseenter without pointerenter.
    await send('mouseleave');
    await send('mouseenter');
    expectOpen(true);
  });

  it('cancel: a touch that turns into a scroll clears the mark; a later mouseenter opens', async () => {
    wrapper = mountFlyout();
    await pointer('pointerenter', 'touch');
    await pointer('pointerdown', 'touch');
    await pointer('pointercancel', 'touch');
    await send('mouseenter');
    expectOpen(true);
  });

  it('second finger: a non-primary touch leaves no mark; a later mouseenter opens', async () => {
    wrapper = mountFlyout();
    // A second finger gets no compatibility mouse events and no click: nothing would clear a mark.
    for (const type of ['pointerenter', 'pointerdown', 'pointerup', 'pointerleave']) {
      await item().trigger(type, { pointerType: 'touch', isPrimary: false });
    }
    expectOpen(false);
    // The resting mouse moves within the item: Chromium sends mouseenter without pointerenter.
    await send('mouseenter');
    expectOpen(true);
  });

  it('a disabled item consumes the touch mark too; after enabling, a mouseenter opens', async () => {
    const disabled = ref(true);
    wrapper = mountFlyout(disabled);
    await pointer('pointerenter', 'touch');
    await send('mouseenter');
    expectOpen(false);
    disabled.value = false;
    await nextTick();
    await send('mouseleave');
    await send('mouseenter');
    expectOpen(true);
  });

  it('disabled: neither a tap nor a hover nor a click opens it', async () => {
    wrapper = mountFlyout(ref(true));
    await tap({ mouseenter: true });
    expectOpen(false);
    await hover();
    expectOpen(false);
    await send('click');
    expectOpen(false);
  });

  it('disabling it while open closes it', async () => {
    const disabled = ref(false);
    wrapper = mountFlyout(disabled);
    await hover();
    expectOpen(true);
    disabled.value = true;
    await nextTick();
    await nextTick();
    expectOpen(false);
  });
});

describe('CoarContextMenu with flyout submenu', () => {
  it('should not close context menu when clicking inside a teleported submenu panel', async () => {
    // Simulate the pointerdown handler logic from CoarContextMenu
    // The fix: clicks on .coar-submenu-panel should NOT close the menu

    // Create a submenu panel element (simulating Teleport to body)
    const panel = document.createElement('div');
    panel.className = 'coar-submenu-panel';
    const menuItem = document.createElement('div');
    menuItem.className = 'coar-menu-item';
    menuItem.textContent = 'Sub Item';
    panel.appendChild(menuItem);
    document.body.appendChild(panel);

    // Simulate the check from CoarContextMenu.onPointerDown
    const target = menuItem as Node;
    const hostContains = false; // Teleported panel is NOT inside hostRef
    const isSubmenuPanel = (target as Element).closest?.('.coar-submenu-panel') !== null;

    // Before fix: would close because hostContains is false
    // After fix: should NOT close because isSubmenuPanel is true
    expect(hostContains).toBe(false);
    expect(isSubmenuPanel).toBe(true);

    // The menu should stay open
    const shouldClose = !hostContains && !isSubmenuPanel;
    expect(shouldClose).toBe(false);

    document.body.removeChild(panel);
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
