import { describe, it, expect, beforeEach } from 'vitest';
import { createToastService, registerToastService, getToastService, _resetToastServiceModule } from './toast-service';

describe('toast-service', () => {
  beforeEach(() => {
    _resetToastServiceModule();
  });

  describe('createToastService', () => {
    it('should create a service with empty toasts', () => {
      const service = createToastService();
      expect(service.toasts.value).toEqual([]);
    });

    it('should default position to top-right', () => {
      const service = createToastService();
      expect(service.position.value).toBe('top-right');
    });

    it('should add a toast via show()', () => {
      const service = createToastService();
      service.show({ message: 'Hello' });
      expect(service.toasts.value).toHaveLength(1);
      expect(service.toasts.value[0].message).toBe('Hello');
    });

    it('should default variant to info', () => {
      const service = createToastService();
      service.show({ message: 'Test' });
      expect(service.toasts.value[0].variant).toBe('info');
    });

    it('should use error duration (0) for error variant', () => {
      const service = createToastService();
      service.error('Error!');
      expect(service.toasts.value[0].duration).toBe(0);
    });

    it('should use default duration (5000) for non-error variants', () => {
      const service = createToastService();
      service.success('Success!');
      expect(service.toasts.value[0].duration).toBe(5000);
    });

    it('should evict oldest toast when exceeding 5', () => {
      const service = createToastService();
      for (let i = 0; i < 6; i++) {
        service.show({ message: `Toast ${i}` });
      }
      expect(service.toasts.value).toHaveLength(5);
      expect(service.toasts.value[0].message).toBe('Toast 1');
    });

    it('should dismiss a toast by id', () => {
      const service = createToastService();
      service.show({ message: 'A' });
      service.show({ message: 'B' });
      const idToRemove = service.toasts.value[0].id;
      service.onDismissed(idToRemove);
      expect(service.toasts.value).toHaveLength(1);
      expect(service.toasts.value[0].message).toBe('B');
    });

    it('should remove all toasts', () => {
      const service = createToastService();
      service.show({ message: 'A' });
      service.show({ message: 'B' });
      service.removeAll();
      expect(service.toasts.value).toHaveLength(0);
    });

    it('should update position', () => {
      const service = createToastService();
      service.setPosition('bottom-left');
      expect(service.position.value).toBe('bottom-left');
    });

    it('should return a ToastRef with dismiss()', () => {
      const service = createToastService();
      const ref = service.show({ message: 'Test' });
      expect(ref).toHaveProperty('dismiss');
      ref.dismiss();
      expect(service.toasts.value).toHaveLength(0);
    });

    it('should use convenience methods', () => {
      const service = createToastService();
      service.success('ok');
      expect(service.toasts.value[0].variant).toBe('success');
      service.warning('warn');
      expect(service.toasts.value[1].variant).toBe('warning');
      service.info('info');
      expect(service.toasts.value[2].variant).toBe('info');
    });
  });

  describe('module-level service', () => {
    it('should throw when not registered', () => {
      expect(() => getToastService()).toThrow('CoarOverlayPlugin');
    });

    it('should return registered service', () => {
      const service = createToastService();
      registerToastService(service);
      expect(getToastService()).toBe(service);
    });
  });
});
