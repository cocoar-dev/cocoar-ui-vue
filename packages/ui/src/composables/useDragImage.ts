/**
 * Thin wrapper around `DataTransfer.setDragImage()` that lets callers ship a nicely
 * styled "ghost" next to the cursor during an HTML5 drag — without each consumer
 * having to re-derive the "create offscreen clone, set, clean up on next tick"
 * dance.
 *
 * The browser captures the drag image **synchronously during `dragstart`** and
 * keeps its own snapshot — so we only need to keep the element alive in the DOM
 * for a single paint. We append it far off-screen, call `setDragImage`, then
 * schedule removal on the next microtask.
 *
 * Scope: pure helper — no Vue reactivity, no state. Safe to call from any
 * `dragstart` handler, including inside `useDragDrop` consumers.
 */
import { readCompactPresentationContext } from '../components/overlay/useCompactPresentationContext';

export interface CoarDragImageOptions {
  /** X offset of the cursor within the ghost (px). Default: 12 */
  offsetX?: number;
  /** Y offset of the cursor within the ghost (px). Default: 12 */
  offsetY?: number;
  /** CSS class applied to the generated wrapper, so consumers can theme the ghost. */
  className?: string;
  /** Inline styles to merge onto the wrapper — use sparingly; prefer `className`. */
  style?: Partial<CSSStyleDeclaration>;
  /** When true, the wrapper receives a subtle default ghost appearance (rounded,
   * slight drop shadow, reduced opacity). Defaults to `true`. Pass `false` when
   * the caller handles all styling via `className`. */
  applyDefaultStyle?: boolean;
}

const DEFAULT_OPACITY = '0.9';

/** Snapshot a local profile for a short-lived body-mounted drag preview. */
export function withCompactDragContext(source: Element | null, node: HTMLElement): HTMLElement {
  const context = readCompactPresentationContext(source);
  if (!context.classes.length) return node;
  // Keep a real ancestor: selector-based compact styling must also reach the
  // cloned root, not only its children.
  const wrapper = document.createElement('div');
  wrapper.classList.add(...context.classes);
  for (const [name, value] of Object.entries(context.style)) wrapper.style.setProperty(name, value);
  const computed = getComputedStyle(source!);
  // Only the inherited text contract, not an arbitrary computed-style dump.
  // A dragged row can inherit UI/caption text rather than the profile's body text.
  for (const property of ['font-family', 'font-size', 'font-weight', 'line-height', 'color']) {
    wrapper.style.setProperty(property, computed.getPropertyValue(property));
  }
  wrapper.style.width = node.style.width;
  wrapper.style.height = node.style.height;
  wrapper.appendChild(node);
  return wrapper;
}

/**
 * Use an existing DOM element as the drag image, optionally cloned so the live
 * element isn't visually disturbed.
 *
 * The clone is sized to match the source's rendered bounding box so the ghost
 * stays the same shape as what the user grabbed — block-level elements default
 * to 100% container width and would otherwise produce an absurdly wide ghost.
 *
 * @example
 *   function onDragStart(e: DragEvent) {
 *     setCoarDragImageFromElement(e, e.currentTarget as HTMLElement);
 *   }
 */
export function setCoarDragImageFromElement(
  event: DragEvent,
  source: HTMLElement,
  options: CoarDragImageOptions = {}
): void {
  if (!event.dataTransfer) return;
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  mountAndSet(event, clone, options, source);
}

/**
 * Build an arbitrary drag image from raw HTML. The caller owns the markup;
 * the helper just handles the "attach off-screen → setDragImage → detach" loop.
 */
export function setCoarDragImageFromHtml(
  event: DragEvent,
  html: string,
  options: CoarDragImageOptions = {}
): void {
  if (!event.dataTransfer) return;
  const el = document.createElement('div');
  el.innerHTML = html;
  mountAndSet(event, el, options);
}

function mountAndSet(
  event: DragEvent,
  node: HTMLElement,
  options: CoarDragImageOptions,
  source: Element | null = event.currentTarget instanceof Element ? event.currentTarget
    : event.target instanceof Element ? event.target : null,
): void {
  const original = node;
  node = withCompactDragContext(source, node);
  const compact = node !== original;
  const offsetX = options.offsetX ?? 12;
  const offsetY = options.offsetY ?? 12;
  const applyDefault = options.applyDefaultStyle ?? true;

  // Key gotcha: Chromium skips rendering elements that are entirely outside the
  // viewport, which means a `top: -10000px` ghost captures as empty bitmap. Keep
  // the element within the vertical viewport (`top: 0`) but push it far off the
  // left edge so the user never actually sees it. That's enough for the browser
  // to lay it out and snapshot it for the drag image.
  node.style.position = 'absolute';
  node.style.top = '0';
  node.style.left = '-10000px';
  node.style.pointerEvents = 'none';
  if (applyDefault) {
    node.style.opacity = DEFAULT_OPACITY;
    node.style.borderRadius = node.style.borderRadius || (compact ? 'var(--coar-control-radius, 6px)' : '6px');
    node.style.boxShadow =
      node.style.boxShadow || (compact ? 'var(--coar-shadow-m, 0 6px 18px rgba(0, 0, 0, 0.18))' : '0 6px 18px rgba(0, 0, 0, 0.18)');
    node.style.background = node.style.background || (compact ? 'var(--coar-background-neutral-primary, #fff)' : '#fff');
  }
  if (options.style) {
    Object.assign(node.style, options.style);
  }
  if (options.className) {
    node.className = `${node.className} ${options.className}`.trim();
  }

  document.body.appendChild(node);
  event.dataTransfer!.setDragImage(node, offsetX, offsetY);

  // Remove on the next macrotask — a microtask runs before the browser has a
  // chance to rasterise the ghost on some engines, which results in a blank
  // drag image. A 0ms timeout lets the next paint tick happen first.
  setTimeout(() => {
    if (node.parentNode) node.parentNode.removeChild(node);
  }, 0);
}
