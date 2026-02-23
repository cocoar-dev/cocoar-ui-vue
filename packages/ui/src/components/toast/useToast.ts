import { createApp, h, type App, type ComponentPublicInstance } from 'vue';
import CoarToastContainer from './CoarToastContainer.vue';
import type { ToastConfig, ToastRef, ToastVariant, InternalToast } from './toast-types';

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 0;

interface ContainerInstance extends ComponentPublicInstance {
  addToast(toast: InternalToast): void;
  onDismissed(id: number): void;
  removeAll(): void;
  setPosition(pos: string): void;
}

let containerApp: App | null = null;
let containerInstance: ContainerInstance | null = null;
let containerEl: HTMLDivElement | null = null;
let nextId = 0;

function getOrCreateContainer(): ContainerInstance {
  if (containerInstance) return containerInstance;

  containerEl = document.createElement('div');
  containerEl.id = 'coar-toast-root';
  document.body.appendChild(containerEl);

  containerApp = createApp({ render: () => h(CoarToastContainer, { ref: 'container' }) });
  const mounted = containerApp.mount(containerEl) as ComponentPublicInstance;
  containerInstance = (mounted.$refs as Record<string, unknown>).container as ContainerInstance;

  return containerInstance;
}

function show(config: ToastConfig): ToastRef {
  const container = getOrCreateContainer();
  const id = nextId++;
  const variant: ToastVariant = config.variant ?? 'info';
  const duration = config.duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

  container.setPosition(config.position ?? 'top-right');

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

  container.addToast(internalToast);

  return {
    dismiss: () => container.onDismissed(id),
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
  containerInstance?.removeAll();
}

// Exported for testing
export function _resetToastService(): void {
  if (containerApp) {
    containerApp.unmount();
    containerApp = null;
  }
  containerInstance = null;
  if (containerEl) {
    containerEl.remove();
    containerEl = null;
  }
  nextId = 0;
}

export function useToast() {
  return { show, success, error, warning, info, dismissAll };
}
