export type DialogSize = 's' | 'm' | 'l' | 'xl';

export interface DialogConfig {
  /** Dialog title shown in header. */
  title?: string;
  /** Size variant. Default: 'm'. */
  size?: DialogSize;
  /** Whether clicking the backdrop closes the dialog. Default: true. */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the dialog. Default: true. */
  closeOnEscape?: boolean;
  /** Whether to show the close (×) button. Default: true. */
  showCloseButton?: boolean;
  /**
   * **Preview** — may still change. Element the dialog belongs to: the overlay host takes
   * over the local presentation of its surroundings (a `.coar-mobile` area). Defaults to
   * the element of the component whose `setup()` called `useDialog()`.
   */
  context?: Element;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  /** Size variant. Default: 's'. */
  size?: DialogSize;
  /**
   * **Preview** — may still change. Element the dialog belongs to: the overlay host takes
   * over the local presentation of its surroundings (a `.coar-mobile` area). Defaults to
   * the element of the component whose `setup()` called `useDialog()`.
   */
  context?: Element;
}

export interface DialogRef<T = unknown> {
  close(result?: T): void;
  readonly result: Promise<T | undefined>;
}
