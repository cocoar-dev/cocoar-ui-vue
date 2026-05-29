import { describe, it, expect } from 'vitest';
import { selfStyle, selfLayoutStyle, containerLayoutStyle } from './styleMapping';

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
    expect(selfLayoutStyle({ minHeight: '100vh' })).toEqual({ minHeight: '100vh' });
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
