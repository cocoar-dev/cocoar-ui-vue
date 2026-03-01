import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _resetOverlayServiceForTests } from '../overlay/useOverlay';
import { _resetToastServiceModule } from '../toast/toast-service';

// Mock the overlay service
const mockOpen = vi.fn();
const mockOverlayRef = {
  close: vi.fn(),
  isClosed: false,
  afterClosed: new Promise(() => {}),
  panelElement: null,
  updatePosition: vi.fn(),
};

vi.mock('../overlay/useOverlay', async () => {
  const actual = await vi.importActual('../overlay/useOverlay');
  return {
    ...actual,
    getOverlayService: () => ({
      open: (...args: unknown[]) => {
        mockOpen(...args);
        return mockOverlayRef;
      },
      instances: { value: [] },
      closeAll: vi.fn(),
      onPanelMounted: vi.fn(),
    }),
  };
});

import { useDialog } from './useDialog';

describe('useDialog', () => {
  beforeEach(() => {
    mockOpen.mockClear();
    mockOverlayRef.close.mockClear();
  });

  afterEach(() => {
    _resetOverlayServiceForTests();
    _resetToastServiceModule();
  });

  describe('confirm()', () => {
    it('should call overlay service open with correct spec', () => {
      const dialog = useDialog();
      dialog.confirm({ title: 'Delete?', message: 'Are you sure?' });

      expect(mockOpen).toHaveBeenCalledTimes(1);
      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.spec.backdrop.kind).toBe('modal');
      expect(callArgs.inputs.title).toBe('Delete?');
      expect(callArgs.inputs.confirmMode).toBe(true);
      expect(callArgs.inputs.confirmMessage).toBe('Are you sure?');
      expect(callArgs.inputs.size).toBe('s');
    });

    it('should pass custom button texts', () => {
      const dialog = useDialog();
      dialog.confirm({
        title: 'Delete?',
        message: 'Sure?',
        confirmText: 'Yes',
        cancelText: 'No',
        confirmVariant: 'danger',
      });

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.confirmText).toBe('Yes');
      expect(callArgs.inputs.cancelText).toBe('No');
      expect(callArgs.inputs.confirmVariant).toBe('danger');
    });

    it('should return a DialogRef with close and result', () => {
      const dialog = useDialog();
      const ref = dialog.confirm({ title: 'Test', message: 'Test' });

      expect(ref).toHaveProperty('close');
      expect(ref).toHaveProperty('result');
      expect(ref.result).toBeInstanceOf(Promise);
    });
  });

  describe('alert()', () => {
    it('should call overlay service open with confirm mode', () => {
      const dialog = useDialog();
      dialog.alert('Notice', 'Something happened');

      expect(mockOpen).toHaveBeenCalledTimes(1);
      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.title).toBe('Notice');
      expect(callArgs.inputs.confirmMode).toBe(true);
      expect(callArgs.inputs.confirmMessage).toBe('Something happened');
      expect(callArgs.inputs.confirmText).toBe('OK');
      expect(callArgs.inputs.showCloseButton).toBe(true);
    });
  });

  describe('open()', () => {
    it('should call overlay service open with body component', () => {
      const dialog = useDialog();
      const MockBody = { template: '<div>Body</div>' };
      dialog.open(MockBody, { title: 'Custom', size: 'l' }, { foo: 'bar' });

      expect(mockOpen).toHaveBeenCalledTimes(1);
      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.title).toBe('Custom');
      expect(callArgs.inputs.size).toBe('l');
      expect(callArgs.inputs.bodyComponent).toBeDefined();
      expect(callArgs.inputs.bodyComponentProps).toEqual(expect.objectContaining({ foo: 'bar' }));
    });

    it('should use default config values', () => {
      const dialog = useDialog();
      const MockBody = { template: '<div>Body</div>' };
      dialog.open(MockBody);

      const callArgs = mockOpen.mock.calls[0][0];
      expect(callArgs.inputs.title).toBe('');
      expect(callArgs.inputs.size).toBe('m');
      expect(callArgs.inputs.showCloseButton).toBe(true);
    });
  });
});
