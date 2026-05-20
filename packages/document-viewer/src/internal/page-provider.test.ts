import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PDFPageProxy } from 'pdfjs-dist';
import { createPdfPageProvider, isCancelError } from './page-provider';

// happy-dom's <canvas>.getContext('2d') returns null. The provider bails out
// before calling proxy.render in that case, so we stub it package-wide to
// return a non-null sentinel.
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({}) as unknown as CanvasRenderingContext2D,
  );
});

function makeCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

interface DeferredRender {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: unknown) => void;
  cancel: ReturnType<typeof vi.fn>;
  cancelled: boolean;
}

function makeDeferred(): DeferredRender {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Swallow unhandled rejection — tests cancel renders, and the consumer of
  // task.promise (createPdfPageProvider's `await task.promise`) handles the
  // rejection on its end. Vitest still complains about the un-awaited promise
  // unless we attach a noop handler.
  promise.catch(() => {});
  const obj: DeferredRender = {
    promise,
    resolve,
    reject,
    cancel: vi.fn(() => {
      obj.cancelled = true;
      const err = new Error('RenderingCancelledException');
      err.name = 'RenderingCancelledException';
      reject(err);
    }),
    cancelled: false,
  };
  return obj;
}

interface FakeProxy {
  proxy: PDFPageProxy;
  renderCalls: Array<{ canvas: HTMLCanvasElement; deferred: DeferredRender }>;
  viewportCalls: Array<{ scale: number; rotation: number }>;
}

function makeFakeProxy(opts: { intrinsicW?: number; intrinsicH?: number } = {}): FakeProxy {
  const intrinsicW = opts.intrinsicW ?? 612;
  const intrinsicH = opts.intrinsicH ?? 792;
  const state: FakeProxy = {
    renderCalls: [],
    viewportCalls: [],
    proxy: null as unknown as PDFPageProxy,
  };
  state.proxy = {
    getViewport(args: { scale: number; rotation: number }) {
      state.viewportCalls.push({ scale: args.scale, rotation: args.rotation });
      const rotated = args.rotation === 90 || args.rotation === 270;
      return {
        width: (rotated ? intrinsicH : intrinsicW) * args.scale,
        height: (rotated ? intrinsicW : intrinsicH) * args.scale,
      };
    },
    render(args: { canvas: HTMLCanvasElement }) {
      const deferred = makeDeferred();
      state.renderCalls.push({ canvas: args.canvas, deferred });
      return {
        promise: deferred.promise,
        cancel: deferred.cancel,
      };
    },
  } as unknown as PDFPageProxy;
  return state;
}

describe('isCancelError', () => {
  it('recognises pdfjs and abort cancel names', () => {
    const cases = ['RenderingCancelledException', 'AbortException', 'AbortError'];
    for (const name of cases) {
      const e = new Error('x');
      e.name = name;
      expect(isCancelError(e)).toBe(true);
    }
  });

  it('returns false for unrelated errors', () => {
    expect(isCancelError(new Error('boom'))).toBe(false);
    expect(isCancelError(null)).toBe(false);
    expect(isCancelError(undefined)).toBe(false);
  });
});

describe('createPdfPageProvider', () => {
  it('exposes intrinsic dimensions from the base viewport', () => {
    const fake = makeFakeProxy({ intrinsicW: 612, intrinsicH: 792 });
    const provider = createPdfPageProvider(fake.proxy);
    expect(provider.intrinsicWidth).toBe(612);
    expect(provider.intrinsicHeight).toBe(792);
    // base viewport is read once at construction with scale=1, rotation=0
    expect(fake.viewportCalls).toEqual([{ scale: 1, rotation: 0 }]);
  });

  it('sets canvas raster dimensions from the scaled viewport', async () => {
    const fake = makeFakeProxy({ intrinsicW: 100, intrinsicH: 200 });
    const provider = createPdfPageProvider(fake.proxy);
    const canvas = makeCanvas();

    const renderPromise = provider.render(canvas, { scale: 2, rotation: 0, dpr: 1.5 });
    // not yet resolved
    expect(fake.renderCalls).toHaveLength(1);
    expect(canvas.width).toBe(Math.floor(100 * 2 * 1.5));
    expect(canvas.height).toBe(Math.floor(200 * 2 * 1.5));

    fake.renderCalls[0].deferred.resolve();
    await renderPromise;
  });

  it('renders to two canvases concurrently without cancelling either', async () => {
    const fake = makeFakeProxy();
    const provider = createPdfPageProvider(fake.proxy);
    const canvasA = makeCanvas();
    const canvasB = makeCanvas();

    const renderA = provider.render(canvasA, { scale: 1, rotation: 0, dpr: 1 });
    const renderB = provider.render(canvasB, { scale: 1, rotation: 0, dpr: 1 });

    expect(fake.renderCalls).toHaveLength(2);
    expect(fake.renderCalls[0].deferred.cancelled).toBe(false);
    expect(fake.renderCalls[1].deferred.cancelled).toBe(false);

    fake.renderCalls[0].deferred.resolve();
    fake.renderCalls[1].deferred.resolve();
    await Promise.all([renderA, renderB]);

    // Neither task was ever cancelled — the black-thumbnail regression test.
    expect(fake.renderCalls[0].deferred.cancel).not.toHaveBeenCalled();
    expect(fake.renderCalls[1].deferred.cancel).not.toHaveBeenCalled();
  });

  it('cancels the prior render to the same canvas when re-rendered', async () => {
    const fake = makeFakeProxy();
    const provider = createPdfPageProvider(fake.proxy);
    const canvas = makeCanvas();

    const first = provider.render(canvas, { scale: 1, rotation: 0, dpr: 1 });
    const second = provider.render(canvas, { scale: 2, rotation: 0, dpr: 1 });

    // First task should have been cancelled by the second render's preamble.
    expect(fake.renderCalls[0].deferred.cancel).toHaveBeenCalledOnce();
    expect(fake.renderCalls[1].deferred.cancel).not.toHaveBeenCalled();

    // First promise rejects with a cancel-typed error; provider swallows in `finally`.
    await expect(first).rejects.toMatchObject({ name: 'RenderingCancelledException' });

    fake.renderCalls[1].deferred.resolve();
    await second;
  });

  it('cancel() aborts all in-flight renders across canvases', async () => {
    const fake = makeFakeProxy();
    const provider = createPdfPageProvider(fake.proxy);
    const canvasA = makeCanvas();
    const canvasB = makeCanvas();

    const renderA = provider.render(canvasA, { scale: 1, rotation: 0, dpr: 1 });
    const renderB = provider.render(canvasB, { scale: 1, rotation: 0, dpr: 1 });

    provider.cancel();

    expect(fake.renderCalls[0].deferred.cancel).toHaveBeenCalledOnce();
    expect(fake.renderCalls[1].deferred.cancel).toHaveBeenCalledOnce();

    await expect(renderA).rejects.toMatchObject({ name: 'RenderingCancelledException' });
    await expect(renderB).rejects.toMatchObject({ name: 'RenderingCancelledException' });
  });

  it('uses rotated dimensions in the viewport when rotation is 90 or 270', async () => {
    const fake = makeFakeProxy({ intrinsicW: 100, intrinsicH: 200 });
    const provider = createPdfPageProvider(fake.proxy);
    const canvas = makeCanvas();

    const renderPromise = provider.render(canvas, { scale: 1, rotation: 90, dpr: 1 });
    // 90°-rotated 100×200 page → 200×100 raster canvas
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);

    fake.renderCalls[0].deferred.resolve();
    await renderPromise;
  });
});
