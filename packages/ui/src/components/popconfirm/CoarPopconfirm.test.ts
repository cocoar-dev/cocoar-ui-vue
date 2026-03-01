import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import CoarPopconfirm from './CoarPopconfirm.vue';

// Mock the overlay service
const mockClose = vi.fn();
const mockOpen = vi.fn();
let afterClosedResolve: (value?: unknown) => void;

function createMockOverlayRef() {
  let isClosed = false;
  const afterClosed = new Promise<unknown>((resolve) => {
    afterClosedResolve = resolve;
  });
  return {
    close: (...args: unknown[]) => {
      isClosed = true;
      mockClose(...args);
      afterClosedResolve();
    },
    get isClosed() { return isClosed; },
    afterClosed,
    panelElement: null,
    updatePosition: vi.fn(),
  };
}

vi.mock('../overlay/useOverlay', () => ({
  getOverlayService: () => ({
    open: (...args: unknown[]) => {
      mockOpen(...args);
      return createMockOverlayRef();
    },
    instances: { value: [] },
    closeAll: vi.fn(),
    onPanelMounted: vi.fn(),
  }),
}));

function createWrapper(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): VueWrapper {
  return mount(CoarPopconfirm, {
    props: { message: 'Are you sure?', ...props },
    slots: { default: '<button>Delete</button>', ...slots },
    attachTo: document.body,
  });
}

describe('CoarPopconfirm', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockClose.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('should render the trigger slot', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('button').text()).toBe('Delete');
      wrapper.unmount();
    });
  });

  describe('open/close', () => {
    it('should open overlay on trigger click', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(mockOpen).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });

    it('should pass correct spec to overlay service', async () => {
      const wrapper = createWrapper({ placement: 'bottom' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.spec.a11y.role).toBe('alertdialog');
      expect(callArgs.spec.position.placement).toEqual(['bottom', 'top', 'left', 'right']);
      expect(callArgs.spec.backdrop.kind).toBe('none');
      wrapper.unmount();
    });

    it('should pass message and title to panel inputs', async () => {
      const wrapper = createWrapper({ message: 'Delete this?', title: 'Warning' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.message).toBe('Delete this?');
      expect(callArgs.inputs.title).toBe('Warning');
      wrapper.unmount();
    });

    it('should pass custom button texts', async () => {
      const wrapper = createWrapper({ confirmText: 'Yes', cancelText: 'No' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.confirmText).toBe('Yes');
      expect(callArgs.inputs.cancelText).toBe('No');
      wrapper.unmount();
    });

    it('should close overlay on second click', async () => {
      const wrapper = createWrapper();
      const trigger = wrapper.find('.coar-popconfirm-trigger');
      await trigger.trigger('click');
      expect(mockOpen).toHaveBeenCalledTimes(1);
      await trigger.trigger('click');
      expect(mockClose).toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should not open when disabled', async () => {
      const wrapper = createWrapper({ disabled: true });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');
      expect(mockOpen).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe('actions', () => {
    it('should emit confirmed when onConfirm called', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      callArgs.inputs.onConfirm();

      expect(wrapper.emitted('confirmed')).toHaveLength(1);
      expect(mockClose).toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should emit cancelled when onCancel called', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      callArgs.inputs.onCancel();

      expect(wrapper.emitted('cancelled')).toHaveLength(1);
      expect(mockClose).toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe('accessibility', () => {
    it('should have aria-haspopup on trigger', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.coar-popconfirm-trigger').attributes('aria-haspopup')).toBe('dialog');
      wrapper.unmount();
    });

    it('should set alertdialog role in spec', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.spec.a11y.role).toBe('alertdialog');
      wrapper.unmount();
    });

    it('should use title for aria-label when provided', async () => {
      const wrapper = createWrapper({ title: 'Confirm deletion' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.spec.a11y.label).toBe('Confirm deletion');
      wrapper.unmount();
    });

    it('should fall back to message for aria-label when no title', async () => {
      const wrapper = createWrapper({ message: 'Delete this item?' });
      await wrapper.find('.coar-popconfirm-trigger').trigger('click');

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.spec.a11y.label).toBe('Delete this item?');
      wrapper.unmount();
    });
  });
});
