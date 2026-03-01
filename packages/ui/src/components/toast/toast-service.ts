import { ref, type InjectionKey } from 'vue';
import type { InternalToast, ToastPosition, ToastConfig, ToastRef, ToastVariant } from './toast-types';

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 0;

export interface ToastService {
  readonly toasts: ReturnType<typeof ref<InternalToast[]>>;
  readonly position: ReturnType<typeof ref<ToastPosition>>;
  addToast(toast: InternalToast): void;
  onDismissed(id: number): void;
  removeAll(): void;
  setPosition(pos: ToastPosition): void;
  show(config: ToastConfig): ToastRef;
  success(message: string, config?: Partial<ToastConfig>): ToastRef;
  error(message: string, config?: Partial<ToastConfig>): ToastRef;
  warning(message: string, config?: Partial<ToastConfig>): ToastRef;
  info(message: string, config?: Partial<ToastConfig>): ToastRef;
  dismissAll(): void;
}

export const TOAST_SERVICE_KEY: InjectionKey<ToastService> = Symbol('CoarToastService');

let _moduleToastService: ToastService | null = null;
let nextId = 0;

export function createToastService(): ToastService {
  const toasts = ref<InternalToast[]>([]);
  const position = ref<ToastPosition>('top-right');

  function addToast(toast: InternalToast): void {
    // Limit to 5 visible toasts max (FIFO eviction)
    if (toasts.value.length >= 5) {
      const evicted = toasts.value[0];
      evicted.onDismiss();
      toasts.value = toasts.value.slice(1);
    }
    toasts.value = [...toasts.value, toast];
  }

  function onDismissed(id: number): void {
    const toast = toasts.value.find((t) => t.id === id);
    if (toast) {
      toast.onDismiss();
    }
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function removeAll(): void {
    toasts.value = [];
  }

  function setPosition(pos: ToastPosition): void {
    position.value = pos;
  }

  function show(config: ToastConfig): ToastRef {
    const id = nextId++;
    const variant: ToastVariant = config.variant ?? 'info';
    const duration = config.duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

    setPosition(config.position ?? 'top-right');

    const internalToast: InternalToast = {
      id,
      variant,
      title: config.title ?? '',
      message: config.message,
      duration,
      dismissible: config.dismissible ?? true,
      showProgress: config.showProgress ?? true,
      action: config.action ?? null,
      onDismiss: () => {},
    };

    addToast(internalToast);

    return {
      dismiss: () => onDismissed(id),
    };
  }

  function success(message: string, config?: Partial<ToastConfig>): ToastRef {
    return show({ ...config, message, variant: 'success' });
  }

  function error(message: string, config?: Partial<ToastConfig>): ToastRef {
    return show({ ...config, message, variant: 'error' });
  }

  function warning(message: string, config?: Partial<ToastConfig>): ToastRef {
    return show({ ...config, message, variant: 'warning' });
  }

  function info(message: string, config?: Partial<ToastConfig>): ToastRef {
    return show({ ...config, message, variant: 'info' });
  }

  function dismissAll(): void {
    removeAll();
  }

  return {
    toasts,
    position,
    addToast,
    onDismissed,
    removeAll,
    setPosition,
    show,
    success,
    error,
    warning,
    info,
    dismissAll,
  };
}

export function registerToastService(service: ToastService): void {
  _moduleToastService = service;
}

export function getToastService(): ToastService {
  if (!_moduleToastService) {
    throw new Error(
      'getToastService() requires CoarOverlayPlugin to be installed. Call app.use(CoarOverlayPlugin) in your app setup.',
    );
  }
  return _moduleToastService;
}

/** Reset module-level toast service reference (for test teardown). */
export function _resetToastServiceModule(): void {
  _moduleToastService = null;
  nextId = 0;
}
