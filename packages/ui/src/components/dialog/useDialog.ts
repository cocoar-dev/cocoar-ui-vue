import { createApp, h, type App, type Component } from 'vue';
import CoarDialogShell from './CoarDialogShell.vue';
import type { DialogConfig, DialogRef, ConfirmOptions, DialogSize } from './dialog-types';

function createDialog<T = unknown>(shellProps: Record<string, unknown>): DialogRef<T> {
  let resolve: (value: T | undefined) => void;
  const result = new Promise<T | undefined>((r) => {
    resolve = r;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);

  let app: App | null = null;

  function close(val?: T) {
    resolve(val);
    if (app) {
      app.unmount();
      app = null;
    }
    container.remove();
  }

  app = createApp({
    render() {
      return h(CoarDialogShell, {
        ...shellProps,
        onClose: (r: unknown) => close(r as T),
      });
    },
  });

  app.mount(container);

  return { close, result };
}

/**
 * Open a custom dialog with a body component.
 * The component receives a `close` prop (function) to close the dialog.
 */
function open<T = unknown>(
  body: Component,
  config: DialogConfig = {},
  bodyProps?: Record<string, unknown>,
): DialogRef<T> {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let resolve: (value: T | undefined) => void;
  const result = new Promise<T | undefined>((r) => {
    resolve = r;
  });

  let app: App | null = null;

  const closeFn = (val?: T) => {
    resolve!(val);
    if (app) {
      app.unmount();
      app = null;
    }
    container.remove();
  };

  const BodyWrapper = {
    render() {
      return h(body, { ...bodyProps, close: closeFn });
    },
  };

  app = createApp({
    render() {
      return h(
        CoarDialogShell,
        {
          title: config.title ?? '',
          size: config.size ?? 'm',
          showCloseButton: config.showCloseButton ?? true,
          closeOnBackdropClick: config.closeOnBackdropClick ?? true,
          closeOnEscape: config.closeOnEscape ?? true,
          confirmMode: false,
          confirmMessage: '',
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          confirmVariant: 'primary' as const,
          onClose: (r: unknown) => closeFn(r as T),
        },
        { default: () => h(BodyWrapper) },
      );
    },
  });

  app.mount(container);

  return { close: closeFn, result };
}

/**
 * Show a simple confirm dialog that resolves to true (confirm) or false/undefined (cancel/dismiss).
 */
function confirm(options: ConfirmOptions): DialogRef<boolean> {
  return createDialog<boolean>({
    title: options.title,
    size: (options.size ?? 's') as DialogSize,
    showCloseButton: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    confirmMode: true,
    confirmMessage: options.message,
    confirmText: options.confirmText ?? 'Confirm',
    cancelText: options.cancelText ?? 'Cancel',
    confirmVariant: options.confirmVariant ?? 'primary',
  });
}

/**
 * Show a simple alert/info dialog with only a close button.
 */
function alert(title: string, message: string): DialogRef<void> {
  return createDialog<void>({
    title,
    size: 's' as DialogSize,
    showCloseButton: true,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    confirmMode: true,
    confirmMessage: message,
    confirmText: 'OK',
    cancelText: '',
    confirmVariant: 'primary',
  });
}

export function useDialog() {
  return { open, confirm, alert };
}
