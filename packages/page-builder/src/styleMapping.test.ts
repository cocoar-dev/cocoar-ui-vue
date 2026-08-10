import { describe, it, expect } from 'vitest';
import { selfStyle, selfLayoutStyle, containerLayoutStyle, withoutPageRootSize, safeAspectRatio, safeCssLength, safeFontVariationSettings } from './styleMapping';

describe('safeCssLength', () => {
  it('allows layout lengths and rejects CSS injection primitives', () => {
    expect(safeCssLength('min(448px, 100%)')).toBe('min(448px, 100%)');
    expect(safeCssLength('8px 12px')).toBe('8px 12px');
    expect(safeCssLength('url(https://example.test/x)')).toBeUndefined();
    expect(safeCssLength('1px;display:none')).toBeUndefined();
  });

  it('allows modern small, large, and dynamic viewport units', () => {
    for (const unit of [
      'dvh', 'svh', 'lvh',
      'dvw', 'svw', 'lvw',
      'dvi', 'svi', 'lvi',
      'dvb', 'svb', 'lvb',
    ]) {
      expect(safeCssLength(`100${unit}`)).toBe(`100${unit}`);
    }
    expect(safeCssLength('calc(100dvh - 2rem)')).toBe('calc(100dvh - 2rem)');
  });

  it('still rejects unknown units that contain an allowed unit name', () => {
    expect(safeCssLength('100xdvh')).toBeUndefined();
    expect(safeCssLength('10pixels')).toBeUndefined();
  });
});

describe('safe typography and ratio values', () => {
  it('accepts bounded variable-font axes and rejects CSS injection', () => {
    expect(safeFontVariationSettings('"wght" 650, "opsz" 32')).toBe('"wght" 650, "opsz" 32');
    expect(safeFontVariationSettings('"wght" 650; color: red')).toBeUndefined();
  });

  it('accepts numeric aspect ratios only', () => {
    expect(safeAspectRatio('16 / 9')).toBe('16 / 9');
    expect(safeAspectRatio('var(--ratio)')).toBeUndefined();
  });
});

describe('selfLayoutStyle', () => {
  it('returns an empty object when there is no style', () => {
    expect(selfLayoutStyle()).toEqual({});
    expect(selfLayoutStyle({})).toEqual({});
  });

  it('maps align-self', () => {
    expect(selfLayoutStyle({ alignSelf: 'center' })).toEqual({ alignSelf: 'center' });
  });

  it('size:fill grows along the main axis in a row parent', () => {
    expect(selfLayoutStyle({ size: 'fill' }, 'row')).toEqual({ flex: '1 1 0%' });
  });

  it('size:fill becomes full width (not vertical grow) in a column parent', () => {
    // flex-grow in a column would zero the height basis and squash the box.
    expect(selfLayoutStyle({ size: 'fill' })).toEqual({ width: '100%' });
    expect(selfLayoutStyle({ size: 'fill' }, 'column')).toEqual({ width: '100%' });
  });

  it('drops size from the page root but keeps everything else', () => {
    // The page is exactly its host container, so a document (or Page Root
    // Code) assigning a size must not win over the box it was placed in.
    const mapped = withoutPageRootSize(selfStyle({
      height: '500px',
      minHeight: '100%',
      maxHeight: '900px',
      width: '80%',
      minWidth: '200px',
      maxWidth: '1200px',
      aspectRatio: '16 / 9',
      padding: '24px',
      surface: 'subtle',
      overflow: 'hidden',
    }));
    expect(mapped.height).toBeUndefined();
    expect(mapped.minHeight).toBeUndefined();
    expect(mapped.maxHeight).toBeUndefined();
    expect(mapped.width).toBeUndefined();
    expect(mapped.minWidth).toBeUndefined();
    expect(mapped.maxWidth).toBeUndefined();
    expect(mapped.aspectRatio).toBeUndefined();
    expect(mapped.flex).toBeUndefined();
    // Presentation and overflow remain the document's decision.
    expect(mapped.padding).toBe('24px');
    expect(mapped.overflow).toBe('hidden');
    expect(mapped.background).toBeDefined();
  });

  it('direction turns any container into a row, not just a stack', () => {
    // Every container is already a flex box; before this the stack was the only
    // one whose direction could be changed, via a CSS class of its own.
    expect(containerLayoutStyle({ direction: 'row' }).flexDirection).toBe('row');
    expect(containerLayoutStyle({ direction: 'column' }).flexDirection).toBe('column');
    expect(containerLayoutStyle({}).flexDirection).toBeUndefined();
  });

  it('size:grow takes the remaining main-axis space in both directions', () => {
    // The point of `grow`: a column can finally grow vertically, so only the
    // outermost node needs a height and the rest resolves through flex.
    expect(selfLayoutStyle({ size: 'grow' }, 'row')).toEqual({ flex: '1 1 auto', minWidth: 0 });
    expect(selfLayoutStyle({ size: 'grow' }, 'column')).toEqual({ flex: '1 1 auto', minHeight: 0 });
    expect(selfLayoutStyle({ size: 'grow' })).toEqual({ flex: '1 1 auto', minHeight: 0 });
  });

  it('size:grow releases the main-axis minimum so it fits a constrained parent', () => {
    // Without this a flex item keeps min-*:auto and overflows its parent
    // instead of shrinking into it.
    expect(selfLayoutStyle({ size: 'grow' }, 'column').minHeight).toBe(0);
    expect(selfLayoutStyle({ size: 'grow' }, 'row').minWidth).toBe(0);
    // An explicit minimum still wins over the released one.
    expect(selfLayoutStyle({ size: 'grow', minHeight: '120px' }, 'column').minHeight).toBe('120px');
    expect(selfLayoutStyle({ size: 'grow', minWidth: '240px' }, 'row').minWidth).toBe('240px');
  });

  it('size:grow uses an auto basis so siblings keep their content proportions', () => {
    // A zero basis is what squashed every child to the same size when `fill`
    // was tried vertically; `grow` must never emit one.
    const css = selfLayoutStyle({ size: 'grow' }, 'column');
    expect(css.flex).not.toContain('0%');
    expect(css.flex).toContain('auto');
  });

  it('size:grow ignores width, like fill', () => {
    expect(selfLayoutStyle({ size: 'grow', width: '380px' }, 'row')).toEqual({ flex: '1 1 auto', minWidth: 0 });
  });

  it('size:fixed applies the width and disables grow/shrink (direction-independent)', () => {
    expect(selfLayoutStyle({ size: 'fixed', width: '200px' }, 'row')).toEqual({
      flex: '0 0 auto',
      width: '200px',
    });
    expect(selfLayoutStyle({ size: 'fixed', width: '200px' }, 'column')).toEqual({
      flex: '0 0 auto',
      width: '200px',
    });
  });

  it('size:fit is content-sized with no grow/shrink', () => {
    expect(selfLayoutStyle({ size: 'fit' })).toEqual({ flex: '0 0 auto' });
  });

  it('treats a width without an explicit size as fixed (back-compat)', () => {
    expect(selfLayoutStyle({ width: '50%' })).toEqual({ flex: '0 0 auto', width: '50%' });
  });

  it('excludes padding (inner-box concern handled by selfStyle)', () => {
    expect(selfLayoutStyle({ padding: '16px', alignSelf: 'center' })).toEqual({ alignSelf: 'center' });
  });

  it('maps min-height (so Editor and Preview size the box alike)', () => {
    expect(selfLayoutStyle({ minHeight: '100dvh' })).toEqual({ minHeight: '100dvh' });
  });

  it('maps max-height and overflow for scrollable page roots', () => {
    expect(selfLayoutStyle({ maxHeight: '100dvh', overflow: 'auto' })).toEqual({
      maxHeight: '100dvh',
      overflow: 'auto',
    });
  });
});

describe('selfStyle', () => {
  it('returns an empty object when there is no style', () => {
    expect(selfStyle()).toEqual({});
    expect(selfStyle({})).toEqual({});
  });

  it('maps padding and align-self', () => {
    expect(selfStyle({ padding: '16px', alignSelf: 'center' })).toEqual({
      padding: '16px',
      alignSelf: 'center',
    });
  });

  it('size:fill is direction-aware (row grows, column full-width)', () => {
    expect(selfStyle({ size: 'fill' }, 'row')).toEqual({ flex: '1 1 0%' });
    expect(selfStyle({ size: 'fill' })).toEqual({ width: '100%' });
  });

  it('size:fill ignores any width', () => {
    expect(selfStyle({ size: 'fill', width: '380px' }, 'row')).toEqual({ flex: '1 1 0%' });
    expect(selfStyle({ size: 'fill', width: '380px' })).toEqual({ width: '100%' });
  });

  it('size:fixed applies the width and disables grow/shrink', () => {
    expect(selfStyle({ size: 'fixed', width: '380px' })).toEqual({
      flex: '0 0 auto',
      width: '380px',
    });
  });

  it('treats a width without an explicit size as fixed (back-compat)', () => {
    expect(selfStyle({ width: '50%' })).toEqual({ flex: '0 0 auto', width: '50%' });
  });

  it('carries min-height through alongside padding', () => {
    expect(selfStyle({ minHeight: '100vh', padding: '24px' })).toEqual({
      minHeight: '100vh',
      padding: '24px',
    });
  });

  it('combines self-alignment, padding and fixed sizing', () => {
    expect(
      selfStyle({ alignSelf: 'center', size: 'fixed', width: '200px', padding: '8px' }),
    ).toEqual({
      padding: '8px',
      alignSelf: 'center',
      flex: '0 0 auto',
      width: '200px',
    });
  });
});

describe('containerLayoutStyle', () => {
  it('returns an empty object when there is no style', () => {
    expect(containerLayoutStyle()).toEqual({});
    expect(containerLayoutStyle({})).toEqual({});
  });

  it('maps gap, justify-content and align-items', () => {
    expect(
      containerLayoutStyle({ gap: '12px', justify: 'space-between', align: 'center' }),
    ).toEqual({
      gap: '12px',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
  });

  it('ignores self-only fields (padding, alignSelf, size, width, minHeight)', () => {
    expect(
      containerLayoutStyle({
        alignSelf: 'center',
        size: 'fill',
        width: '10px',
        padding: '4px',
        minHeight: '100vh',
      }),
    ).toEqual({});
  });
});
