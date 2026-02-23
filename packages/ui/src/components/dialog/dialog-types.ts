export type DialogSize = 's' | 'm' | 'l';

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
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  /** Size variant. Default: 's'. */
  size?: DialogSize;
}

export interface DialogRef<T = unknown> {
  close(result?: T): void;
  readonly result: Promise<T | undefined>;
}
