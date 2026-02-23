import { describe, it, expect } from 'vitest';
import {
  resolveOverlaySpec,
  OVERLAY_DEFAULTS,
  type OverlaySpec,
} from './overlay-types';

describe('overlay-types', () => {
  describe('resolveOverlaySpec', () => {
    it('fills in all defaults for empty spec', () => {
      const resolved = resolveOverlaySpec({});
      expect(resolved.anchor).toEqual(OVERLAY_DEFAULTS.anchor);
      expect(resolved.position).toEqual(OVERLAY_DEFAULTS.position);
      expect(resolved.backdrop).toEqual(OVERLAY_DEFAULTS.backdrop);
      expect(resolved.scroll).toEqual(OVERLAY_DEFAULTS.scroll);
      expect(resolved.dismiss).toEqual(OVERLAY_DEFAULTS.dismiss);
      expect(resolved.focus).toEqual(OVERLAY_DEFAULTS.focus);
      expect(resolved.a11y).toEqual(OVERLAY_DEFAULTS.a11y);
      expect(resolved.attachment).toEqual(OVERLAY_DEFAULTS.attachment);
      expect(resolved.size).toBeUndefined();
      expect(resolved.panelClass).toBeUndefined();
    });

    it('preserves explicit values', () => {
      const spec: OverlaySpec = {
        position: { placement: 'top', offset: 12, flip: false, shift: false },
        backdrop: { kind: 'modal', closeOnBackdropClick: true },
        dismiss: { outsideClick: false, escapeKey: true },
        a11y: { role: 'dialog', label: 'My Dialog' },
        panelClass: 'my-panel',
      };
      const resolved = resolveOverlaySpec(spec);
      expect(resolved.position).toEqual(spec.position);
      expect(resolved.backdrop).toEqual(spec.backdrop);
      expect(resolved.dismiss).toEqual(spec.dismiss);
      expect(resolved.a11y).toEqual(spec.a11y);
      expect(resolved.panelClass).toBe('my-panel');
      // Defaults for unset fields
      expect(resolved.anchor).toEqual(OVERLAY_DEFAULTS.anchor);
    });

    it('preserves size when provided', () => {
      const spec: OverlaySpec = {
        size: { minWidth: 'anchor', maxHeight: 'viewport' },
      };
      const resolved = resolveOverlaySpec(spec);
      expect(resolved.size).toEqual(spec.size);
    });

    it('preserves panelClass array', () => {
      const spec: OverlaySpec = { panelClass: ['class-a', 'class-b'] };
      const resolved = resolveOverlaySpec(spec);
      expect(resolved.panelClass).toEqual(['class-a', 'class-b']);
    });
  });

  describe('OVERLAY_DEFAULTS', () => {
    it('has expected default values', () => {
      expect(OVERLAY_DEFAULTS.anchor.kind).toBe('virtual');
      expect(OVERLAY_DEFAULTS.position.offset).toBe(8);
      expect(OVERLAY_DEFAULTS.position.flip).toBe(true);
      expect(OVERLAY_DEFAULTS.backdrop.kind).toBe('none');
      expect(OVERLAY_DEFAULTS.scroll.strategy).toBe('reposition');
      expect(OVERLAY_DEFAULTS.dismiss.outsideClick).toBe(true);
      expect(OVERLAY_DEFAULTS.dismiss.escapeKey).toBe(true);
      expect(OVERLAY_DEFAULTS.focus.trap).toBe(false);
      expect(OVERLAY_DEFAULTS.focus.restore).toBe(true);
      expect(OVERLAY_DEFAULTS.attachment.strategy).toBe('body');
    });
  });
});
