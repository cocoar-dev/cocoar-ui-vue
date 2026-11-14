import { getCurrentInstance, markRaw, type Component, type ComponentInternalInstance } from 'vue';
import CoarDialogShell from './CoarDialogShell.vue';
import type { DialogConfig, DialogRef, ConfirmOptions, DialogSize } from './dialog-types';
import { getOverlayService } from '../overlay/useOverlay';
import { dialogPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';

/**
 * The element of the component that called `useDialog()` in its `setup()`: its root
 * element, or the parent element of a fragment's anchor. None before mount, after unmount,
 * or outside `setup()`.
 */
function ownerElement(owner: ComponentInternalInstance | null): Element | undefined {
  // Deactivated by KeepAlive: its element is detached and says nothing about the page.
  if (!owner || owner.isUnmounted || owner.isDeactivated) return undefined;
  const node = (owner.subTree?.el ?? owner.vnode.el) as Node | null;
  if (!node?.isConnected) return undefined;
  if (node.nodeType === 1) return node as Element;
  return node.parentElement ?? undefined;
}

function openOverlayDialog<T = unknown>(
  shellProps: Record<string, unknown>,
  context?: Element,
): DialogRef<T> {
  let resolve: (value: T | undefined) => void;
  const result = new Promise<T | undefined>((r) => {
    resolve = r;
  });

  let overlayRef: OverlayRef | null = null;

  const closeOnBackdropClick = shellProps.closeOnBackdropClick ?? true;
  const closeOnEscape = shellProps.closeOnEscape ?? true;

  overlayRef = getOverlayService().open({
    spec: {
      ...dialogPreset,
      dismiss: {
        outsideClick: closeOnBackdropClick as boolean,
        escapeKey: closeOnEscape as boolean,
      },
      backdrop: {
        kind: 'modal',
        closeOnBackdropClick: closeOnBackdropClick as boolean,
      },
    },
    content: { kind: 'component', component: markRaw(CoarDialogShell) },
    context,
    inputs: {
      ...shellProps,
      onClose: (r: unknown) => {
        resolve!(r as T);
        overlayRef?.close(r);
      },
    },
  });

  // When overlay closes externally (escape, backdrop), resolve promise
  overlayRef.afterClosed.then((r) => {
    resolve!(r as T);
  });

  function close(val?: T) {
    resolve!(val);
    overlayRef?.close(val);
  }

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
  context: Element | undefined = config.context,
): DialogRef<T> {
  let resolve: (value: T | undefined) => void;
  const result = new Promise<T | undefined>((r) => {
    resolve = r;
  });

  let overlayRef: OverlayRef | null = null;

  const closeOnBackdropClick = config.closeOnBackdropClick ?? true;
  const closeOnEscape = config.closeOnEscape ?? true;

  const closeFn = (val?: T) => {
    resolve!(val);
    overlayRef?.close(val);
  };

  overlayRef = getOverlayService().open({
    spec: {
      ...dialogPreset,
      dismiss: {
        outsideClick: closeOnBackdropClick,
        escapeKey: closeOnEscape,
      },
      backdrop: {
        kind: 'modal',
        closeOnBackdropClick: closeOnBackdropClick,
      },
    },
    content: { kind: 'component', component: markRaw(CoarDialogShell) },
    context,
    inputs: {
      title: config.title ?? '',
      size: config.size ?? 'm',
      showCloseButton: config.showCloseButton ?? true,
      confirmMode: false,
      confirmMessage: '',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmVariant: 'primary' as const,
      bodyComponent: markRaw(body),
      bodyComponentProps: { ...bodyProps, close: closeFn },
      onClose: (r: unknown) => closeFn(r as T),
    },
  });

  // When overlay closes externally (escape, backdrop), resolve promise
  overlayRef.afterClosed.then((r) => {
    resolve!(r as T);
  });

  return { close: closeFn, result };
}

/**
 * Show a simple confirm dialog that resolves to true (confirm) or false/undefined (cancel/dismiss).
 */
function confirm(
  options: ConfirmOptions,
  context: Element | undefined = options.context,
): DialogRef<boolean> {
  return openOverlayDialog<boolean>({
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
  }, context);
}

/**
 * Show a simple alert/info dialog with only a close button.
 */
function alert(
  title: string,
  message: string,
  config: Pick<DialogConfig, 'context'> = {},
): DialogRef<void> {
  return openOverlayDialog<void>({
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
  }, config.context);
}

/**
 * Dialogs opened from a component: called in `setup()`, it remembers the component and
 * opens each dialog with that component's element as `context`, unless one is given.
 * Outside `setup()` the dialogs have no context.
 */
export function useDialog() {
  const owner = getCurrentInstance();
  return {
    open<T = unknown>(
      body: Component,
      config: DialogConfig = {},
      bodyProps?: Record<string, unknown>,
    ): DialogRef<T> {
      // The config is passed as it is (no spread): getters of a config class must survive.
      return open<T>(body, config, bodyProps, config.context ?? ownerElement(owner));
    },
    confirm(options: ConfirmOptions): DialogRef<boolean> {
      return confirm(options, options.context ?? ownerElement(owner));
    },
    alert(title: string, message: string, config: Pick<DialogConfig, 'context'> = {}): DialogRef<void> {
      return alert(title, message, { context: config.context ?? ownerElement(owner) });
    },
  };
}
