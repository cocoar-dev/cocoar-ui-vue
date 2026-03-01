import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarPopconfirm from './CoarPopconfirm.vue';

function createWrapper(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): VueWrapper {
  return mount(CoarPopconfirm, {
    props: { message: 'Are you sure?', ...props },
    slots: { default: '<button>Delete</button>', ...slots },
    global: { stubs: { Teleport: true } },
    attachTo: document.body,
  });
}

describe('CoarPopconfirm', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('should render the trigger slot', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('button').text()).toBe('Delete');
      wrapper.unmount();
    });

    it('should not show panel initially', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe('open/close', () => {
    it('should open on trigger click', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(true);
      wrapper.unmount();
    });

    it('should show message when open', async () => {
      const wrapper = createWrapper({ message: 'Delete this item?' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel__message').text()).toBe('Delete this item?');
      wrapper.unmount();
    });

    it('should show title when provided', async () => {
      const wrapper = createWrapper({ title: 'Warning' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel__title').text()).toBe('Warning');
      wrapper.unmount();
    });

    it('should not show title when empty', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel__title').exists()).toBe(false);
      wrapper.unmount();
    });

    it('should close on second click', async () => {
      const wrapper = createWrapper();
      const trigger = wrapper.find('.coar-popconfirm-trigger');
      await trigger.trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(true);
      await trigger.trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      wrapper.unmount();
    });

    it('should not open when disabled', async () => {
      const wrapper = createWrapper({ disabled: true });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe('actions', () => {
    it('should show default button texts', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      const buttons = wrapper.findAll('.coar-popconfirm-panel__actions button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].text()).toBe('Cancel');
      expect(buttons[1].text()).toBe('OK');
      wrapper.unmount();
    });

    it('should show custom button texts', async () => {
      const wrapper = createWrapper({ confirmText: 'Yes', cancelText: 'No' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      const buttons = wrapper.findAll('.coar-popconfirm-panel__actions button');
      expect(buttons[0].text()).toBe('No');
      expect(buttons[1].text()).toBe('Yes');
      wrapper.unmount();
    });

    it('should emit confirmed and close on confirm click', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      const buttons = wrapper.findAll('.coar-popconfirm-panel__actions button');
      await buttons[1].trigger('click');
      expect(wrapper.emitted('confirmed')).toHaveLength(1);
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      wrapper.unmount();
    });

    it('should emit cancelled and close on cancel click', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      const buttons = wrapper.findAll('.coar-popconfirm-panel__actions button');
      await buttons[0].trigger('click');
      expect(wrapper.emitted('cancelled')).toHaveLength(1);
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe('keyboard', () => {
    it('should close on Escape key', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.find('.coar-popconfirm-panel').exists()).toBe(false);
      expect(wrapper.emitted('cancelled')).toHaveLength(1);
      wrapper.unmount();
    });
  });

  describe('accessibility', () => {
    it('should have role="dialog" on the panel host', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-host').attributes('role')).toBe('dialog');
      wrapper.unmount();
    });

    it('should have data-placement attribute', async () => {
      const wrapper = createWrapper({ placement: 'bottom' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(wrapper.find('.coar-popconfirm-host').attributes('data-placement')).toBe('bottom');
      wrapper.unmount();
    });
  });
});
