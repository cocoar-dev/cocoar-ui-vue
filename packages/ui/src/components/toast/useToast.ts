import { getToastService, _resetToastServiceModule } from './toast-service';
import type { ToastConfig, ToastRef } from './toast-types';

function show(config: ToastConfig): ToastRef {
  return getToastService().show(config);
}

function success(message: string, config?: Partial<ToastConfig>): ToastRef {
  return getToastService().success(message, config);
}

function error(message: string, config?: Partial<ToastConfig>): ToastRef {
  return getToastService().error(message, config);
}

function warning(message: string, config?: Partial<ToastConfig>): ToastRef {
  return getToastService().warning(message, config);
}

function info(message: string, config?: Partial<ToastConfig>): ToastRef {
  return getToastService().info(message, config);
}

function dismissAll(): void {
  getToastService().dismissAll();
}

// Exported for testing
export function _resetToastService(): void {
  _resetToastServiceModule();
}

export function useToast() {
  return { show, success, error, warning, info, dismissAll };
}
