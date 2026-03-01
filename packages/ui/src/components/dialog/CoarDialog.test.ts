import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarDialogShell from './CoarDialogShell.vue';

function createWrapper(props: Record<string, unknown> = {}, slots: Record<string, string> = {}): VueWrapper {
  return mount(CoarDialogShell, {
    props: {
      title: 'Test Dialog',
      size: 'm',
      showCloseButton: true,
      closeOnBackdropClick: true,
      closeOnEscape: true,
      confirmMode: false,
      confirmMessage: '',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmVariant: 'primary' as const,
      ...props,
    },
    slots: {
      default: '<p>Dialog body content</p>',
      ...slots,
    },
    global: {
      stubs: {
        CoarIcon: { template: '<span class="icon-stub" />', props: ['name', 'size'] },
        CoarButton: { template: '<button class="btn-stub" @click="$emit(\'click\')"><slot /></button>', props: ['variant'], emits: ['click'] },
      },
    },
    attachTo: document.body,
  });
}

describe('CoarDialogShell', () => {
  let wrapper: VueWrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('rendering', () => {
    it('should render title', () => {
      wrapper = createWrapper({ title: 'My Dialog' });
      expect(wrapper.find('.coar-dialog-title').text()).toBe('My Dialog');
    });

    it('should render body slot', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-dialog-body').text()).toBe('Dialog body content');
    });

    it('should not render header when no title and no close button', () => {
      wrapper = createWrapper({ title: '', showCloseButton: false });
      expect(wrapper.find('.coar-dialog-header').exists()).toBe(false);
    });

    it('should render close button by default', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-dialog-close').exists()).toBe(true);
    });

    it('should hide close button when showCloseButton is false', () => {
      wrapper = createWrapper({ showCloseButton: false });
      expect(wrapper.find('.coar-dialog-close').exists()).toBe(false);
    });
  });

  describe('sizes', () => {
    for (const size of ['s', 'm', 'l'] as const) {
      it(`should apply ${size} size class`, () => {
        wrapper = createWrapper({ size });
        expect(wrapper.find(`.coar-dialog--${size}`).exists()).toBe(true);
      });
    }
  });

  describe('close behavior', () => {
    it('should emit close when close button clicked', async () => {
      wrapper = createWrapper();
      await wrapper.find('.coar-dialog-close').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit close on backdrop click', async () => {
      wrapper = createWrapper({ closeOnBackdropClick: true });
      await wrapper.find('.coar-dialog-backdrop').trigger('mousedown');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should not close on backdrop click when disabled', async () => {
      wrapper = createWrapper({ closeOnBackdropClick: false });
      await wrapper.find('.coar-dialog-backdrop').trigger('mousedown');
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('should not close when clicking dialog panel', async () => {
      wrapper = createWrapper();
      await wrapper.find('.coar-dialog').trigger('mousedown');
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('should emit close on Escape', async () => {
      wrapper = createWrapper({ closeOnEscape: true });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should not close on Escape when disabled', async () => {
      wrapper = createWrapper({ closeOnEscape: false });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();
      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  describe('confirm mode', () => {
    it('should render confirm message', () => {
      wrapper = createWrapper({ confirmMode: true, confirmMessage: 'Are you sure?' });
      expect(wrapper.find('.coar-dialog-body p').text()).toBe('Are you sure?');
    });

    it('should render footer with buttons', () => {
      wrapper = createWrapper({ confirmMode: true, confirmMessage: 'Delete?', confirmText: 'Delete', cancelText: 'Keep' });
      const buttons = wrapper.findAll('.coar-dialog-footer .btn-stub');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].text()).toBe('Keep');
      expect(buttons[1].text()).toBe('Delete');
    });

    it('should emit close(true) on confirm', async () => {
      wrapper = createWrapper({ confirmMode: true, confirmMessage: 'Go?' });
      const buttons = wrapper.findAll('.coar-dialog-footer .btn-stub');
      await buttons[1].trigger('click'); // confirm button
      expect(wrapper.emitted('close')![0]).toEqual([true]);
    });

    it('should emit close(false) on cancel', async () => {
      wrapper = createWrapper({ confirmMode: true, confirmMessage: 'Go?' });
      const buttons = wrapper.findAll('.coar-dialog-footer .btn-stub');
      await buttons[0].trigger('click'); // cancel button
      expect(wrapper.emitted('close')![0]).toEqual([false]);
    });

    it('should not render body slot in confirm mode', () => {
      wrapper = createWrapper({ confirmMode: true, confirmMessage: 'Sure?' });
      expect(wrapper.find('.coar-dialog-body').text()).toBe('Sure?');
    });
  });

  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-dialog').attributes('role')).toBe('dialog');
    });

    it('should have aria-modal="true"', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.coar-dialog').attributes('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby when title exists', () => {
      wrapper = createWrapper({ title: 'My Title' });
      const labelledBy = wrapper.find('.coar-dialog').attributes('aria-labelledby');
      expect(labelledBy).toBeDefined();
      expect(wrapper.find(`#${labelledBy}`).exists()).toBe(true);
    });
  });

  describe('footer slot', () => {
    it('should render footer slot when not in confirm mode', () => {
      wrapper = createWrapper(
        { confirmMode: false },
        { footer: '<button class="custom-footer-btn">Custom Action</button>' },
      );
      expect(wrapper.find('.custom-footer-btn').text()).toBe('Custom Action');
    });

    it('should not render footer slot in confirm mode', () => {
      wrapper = createWrapper(
        { confirmMode: true, confirmMessage: 'x' },
        { footer: '<button class="custom-footer-btn">Nope</button>' },
      );
      expect(wrapper.find('.custom-footer-btn').exists()).toBe(false);
    });
  });
});
