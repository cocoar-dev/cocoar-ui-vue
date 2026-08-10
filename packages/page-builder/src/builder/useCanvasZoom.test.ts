import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useCanvasZoom, CANVAS_ZOOM_STEPS } from './useCanvasZoom';

const MIN = CANVAS_ZOOM_STEPS[0];
const MAX = CANVAS_ZOOM_STEPS[CANVAS_ZOOM_STEPS.length - 1];

function zoomState() {
  return useCanvasZoom(ref(null), ref(null));
}

describe('useCanvasZoom', () => {
  it('accepts any level in range, not only the steps', () => {
    const { zoom, setZoom } = zoomState();
    setZoom(0.47);
    expect(zoom.value).toBeCloseTo(0.47);
    setZoom(1.13);
    expect(zoom.value).toBeCloseTo(1.13);
  });

  it('clamps out-of-range levels instead of rejecting them', () => {
    const { zoom, setZoom } = zoomState();
    setZoom(0.01);
    expect(zoom.value).toBe(MIN);
    setZoom(50);
    expect(zoom.value).toBe(MAX);
  });

  it('steps to the neighbouring step from a typed in-between level', () => {
    // The bug this guards: indexing by "first step >= current" made 47% jump
    // straight to 75%, skipping 50%.
    const { zoom, setZoom, step } = zoomState();
    setZoom(0.47);
    step(1);
    expect(zoom.value).toBe(0.5);

    setZoom(0.47);
    step(-1);
    expect(zoom.value).toBe(0.25);
  });

  it('steps normally when sitting exactly on a step', () => {
    const { zoom, setZoom, step } = zoomState();
    setZoom(0.5);
    step(1);
    expect(zoom.value).toBe(0.75);
    step(-1);
    expect(zoom.value).toBe(0.5);
  });

  it('stops at the ends rather than wrapping', () => {
    const { zoom, setZoom, step } = zoomState();
    setZoom(MAX);
    step(1);
    expect(zoom.value).toBe(MAX);
    setZoom(MIN);
    step(-1);
    expect(zoom.value).toBe(MIN);
  });

  it('reset returns to 100%', () => {
    const { zoom, setZoom, reset } = zoomState();
    setZoom(0.47);
    reset();
    expect(zoom.value).toBe(1);
  });
});
