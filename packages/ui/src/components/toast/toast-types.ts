export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastConfig {
  variant?: ToastVariant;
  title?: string;
  message: string;
  /** Duration in ms. Default: 5000 (errors: 0 = no auto-close). */
  duration?: number;
  /** Show close button. Default: true. */
  dismissible?: boolean;
  /** Position on screen. Default: 'top-right'. */
  position?: ToastPosition;
  /** Show progress bar. Default: true. */
  showProgress?: boolean;
  /** Optional action button. */
  action?: { label: string; callback: () => void };
}

export interface ToastRef {
  dismiss(): void;
}

export interface InternalToast {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
  duration: number;
  dismissible: boolean;
  showProgress: boolean;
  action: { label: string; callback: () => void } | null;
  onDismiss: () => void;
}
