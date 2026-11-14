import { describe, expect, it, vi } from 'vitest';
import {
  releaseVelocity,
  shouldCloseSheet,
  useSheetDrag,
  SHEET_CLOSE_VELOCITY,
} from './useSheetDrag';

describe('shouldCloseSheet', () => {
  it('closes past 30 % of the height', () => {
    expect(shouldCloseSheet({ distance: 121, height: 400, velocity: 0 })).toBe(true);
    expect(shouldCloseSheet({ distance: 120, height: 400, velocity: 0 })).toBe(false);
  });

  it('closes on a downward flick, however short', () => {
    expect(shouldCloseSheet({ distance: 10, height: 400, velocity: SHEET_CLOSE_VELOCITY })).toBe(true);
    expect(shouldCloseSheet({ distance: 10, height: 400, velocity: SHEET_CLOSE_VELOCITY - 0.01 })).toBe(false);
  });

  it('never closes without a downward distance', () => {
    expect(shouldCloseSheet({ distance: 0, height: 400, velocity: 5 })).toBe(false);
  });

  it('decides by the velocity alone when the height is unknown', () => {
    expect(shouldCloseSheet({ distance: 300, height: 0, velocity: 0 })).toBe(false);
    expect(shouldCloseSheet({ distance: 300, height: 0, velocity: 1 })).toBe(true);
  });
});

describe('releaseVelocity', () => {
  it('measures the last 100 ms only', () => {
    const samples = [
      { y: 0, time: 0 },
      { y: 0, time: 500 }, // a long hold
      { y: 40, time: 550 },
      { y: 100, time: 600 },
    ];
    expect(releaseVelocity(samples)).toBe(1); // 100 px in 100 ms
  });

  it('is 0 without elapsed time or samples', () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ y: 5, time: 10 }])).toBe(0);
  });

  it('is negative when moving up', () => {
    expect(releaseVelocity([{ y: 100, time: 0 }, { y: 50, time: 50 }])).toBe(-1);
  });
});

function pointer(type: string, clientY: number, extra: Partial<PointerEvent> = {}): PointerEvent {
  return { type, clientY, pointerId: 1, pointerType: 'touch', button: 0, target: null, currentTarget: null, ...extra } as unknown as PointerEvent;
}

function setup(options: { enabled?: boolean; height?: number } = {}) {
  let time = 0;
  const onClose = vi.fn();
  const drag = useSheetDrag({
    enabled: () => options.enabled ?? true,
    sheetHeight: () => options.height ?? 400,
    onClose,
    now: () => time,
  });
  const at = (ms: number) => { time = ms; };
  return { drag, onClose, at, h: drag.handlers };
}

describe('useSheetDrag', () => {
  it('springs back after a short, slow drag', () => {
    const { drag, onClose, at, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100));
    expect(drag.dragging.value).toBe(true);
    at(200); h.onPointermove(pointer('pointermove', 150));
    expect(drag.offset.value).toBe(50);
    at(400); h.onPointerup(pointer('pointerup', 150));
    expect(onClose).not.toHaveBeenCalled();
    expect(drag.offset.value).toBe(0);
    expect(drag.dragging.value).toBe(false);
  });

  it('closes after a long drag', () => {
    const { onClose, at, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100));
    at(500); h.onPointermove(pointer('pointermove', 250));
    at(1000); h.onPointerup(pointer('pointerup', 250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes after a short flick', () => {
    const { onClose, at, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100));
    at(20); h.onPointermove(pointer('pointermove', 120));
    at(40); h.onPointerup(pointer('pointerup', 140));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('springs back on pointercancel', () => {
    const { drag, onClose, at, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100));
    at(50); h.onPointermove(pointer('pointermove', 350));
    h.onPointercancel(pointer('pointercancel', 350));
    expect(onClose).not.toHaveBeenCalled();
    expect(drag.offset.value).toBe(0);
    expect(drag.dragging.value).toBe(false);
    // The cancelled pointer no longer drags.
    h.onPointerup(pointer('pointerup', 350));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not move upward', () => {
    const { drag, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100));
    h.onPointermove(pointer('pointermove', 20));
    expect(drag.offset.value).toBe(0);
  });

  it('does nothing when disabled', () => {
    const { drag, onClose, at, h } = setup({ enabled: false });
    h.onPointerdown(pointer('pointerdown', 100));
    at(500); h.onPointermove(pointer('pointermove', 400));
    h.onPointerup(pointer('pointerup', 400));
    expect(drag.dragging.value).toBe(false);
    expect(drag.offset.value).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a secondary mouse button, a second pointer and presses on buttons', () => {
    const { drag, h } = setup();
    h.onPointerdown(pointer('pointerdown', 100, { pointerType: 'mouse', button: 2 }));
    expect(drag.dragging.value).toBe(false);

    const button = document.createElement('button');
    h.onPointerdown(pointer('pointerdown', 100, { target: button }));
    expect(drag.dragging.value).toBe(false);

    h.onPointerdown(pointer('pointerdown', 100));
    h.onPointermove(pointer('pointermove', 300, { pointerId: 2 }));
    expect(drag.offset.value).toBe(0);
  });

  it('captures the pointer on the element it started on and releases it', () => {
    const el = document.createElement('div');
    let captured = false;
    el.setPointerCapture = vi.fn(() => { captured = true; });
    el.hasPointerCapture = vi.fn(() => captured);
    el.releasePointerCapture = vi.fn(() => { captured = false; });
    const { h } = setup();
    h.onPointerdown(pointer('pointerdown', 100, { currentTarget: el }));
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
    h.onPointerup(pointer('pointerup', 110));
    expect(el.releasePointerCapture).toHaveBeenCalledWith(1);
  });
});
