import { describe, expect, it, vi } from 'vitest';
import {
  setCoarDragImageFromElement,
  setCoarDragImageFromHtml,
} from './useDragImage';

function makeDragEvent(): { event: DragEvent; setDragImage: ReturnType<typeof vi.fn> } {
  const setDragImage = vi.fn();
  const dt = { setDragImage } as unknown as DataTransfer;
  const event = { dataTransfer: dt } as unknown as DragEvent;
  return { event, setDragImage };
}

describe('setCoarDragImageFromElement', () => {
  it('clones the source, mounts it off-screen, and calls setDragImage with defaults', () => {
    const source = document.createElement('div');
    source.textContent = 'hello';
    document.body.appendChild(source);

    const { event, setDragImage } = makeDragEvent();
    setCoarDragImageFromElement(event, source);

    expect(setDragImage).toHaveBeenCalledTimes(1);
    const [el, x, y] = setDragImage.mock.calls[0];
    expect(el).toBeInstanceOf(HTMLElement);
    // Cloned, not the same element.
    expect(el).not.toBe(source);
    expect((el as HTMLElement).textContent).toBe('hello');
    expect(x).toBe(12);
    expect(y).toBe(12);
    // Positioned off-screen horizontally so Chromium still rasterises it.
    expect((el as HTMLElement).style.position).toBe('absolute');
    expect((el as HTMLElement).style.top).toBe('0px');
    expect((el as HTMLElement).style.left).toBe('-10000px');
    document.body.removeChild(source);
  });

  it('honours custom offsets', () => {
    const source = document.createElement('div');
    const { event, setDragImage } = makeDragEvent();
    setCoarDragImageFromElement(event, source, { offsetX: 0, offsetY: 20 });
    expect(setDragImage.mock.calls[0][1]).toBe(0);
    expect(setDragImage.mock.calls[0][2]).toBe(20);
  });

  it('is a no-op when the event has no dataTransfer', () => {
    const event = { dataTransfer: null } as unknown as DragEvent;
    expect(() => setCoarDragImageFromElement(event, document.createElement('div'))).not.toThrow();
  });

  it('cleans up the ghost on the next macrotask', async () => {
    const source = document.createElement('div');
    const { event, setDragImage } = makeDragEvent();
    setCoarDragImageFromElement(event, source);
    const ghost = setDragImage.mock.calls[0][0] as HTMLElement;
    expect(ghost.parentNode).toBe(document.body);
    await new Promise((r) => setTimeout(r, 0));
    expect(ghost.parentNode).toBeNull();
  });

  it('skips default styling when applyDefaultStyle=false', () => {
    const source = document.createElement('div');
    const { event, setDragImage } = makeDragEvent();
    setCoarDragImageFromElement(event, source, { applyDefaultStyle: false });
    const ghost = setDragImage.mock.calls[0][0] as HTMLElement;
    expect(ghost.style.opacity).toBe('');
    expect(ghost.style.boxShadow).toBe('');
  });
});

describe('setCoarDragImageFromHtml', () => {
  it('builds a wrapper from markup and uses it as the drag image', () => {
    const { event, setDragImage } = makeDragEvent();
    setCoarDragImageFromHtml(event, '<span>pill</span>', { className: 'custom-ghost' });
    const ghost = setDragImage.mock.calls[0][0] as HTMLElement;
    expect(ghost.innerHTML).toBe('<span>pill</span>');
    expect(ghost.className).toContain('custom-ghost');
  });
});
