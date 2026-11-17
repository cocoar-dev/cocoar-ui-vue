import { afterEach, describe, expect, it } from 'vitest';
import { listScaleTokens } from './scale-tokens';

let style: HTMLStyleElement | null = null;

function addCss(css: string) {
  style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

afterEach(() => {
  style?.remove();
  style = null;
});

describe('listScaleTokens', () => {
  it('lists the steps of a scale once, in scale order', () => {
    addCss(':root { --coar-radius-m: 4px; --coar-radius-xs: 2px; --coar-radius-full: 999px; }');
    expect(listScaleTokens('radius').map((t) => t.name)).toEqual([
      '--coar-radius-xs',
      '--coar-radius-m',
      '--coar-radius-full',
    ]);
  });

  it('keeps role tokens of the compact profile out of the radius scale', () => {
    // The compact profile adds roles whose names end in "-radius" and may redefine a
    // step inside its scope: neither may add an option to the scale picker.
    addCss(`
      :root { --coar-radius-xs: 2px; --coar-radius-m: 4px; }
      .coar-compact {
        --coar-control-radius: 6px;
        --coar-panel-radius: 8px;
        --coar-radius-m: 6px;
      }
    `);
    expect(listScaleTokens('radius').map((t) => t.value)).toEqual([
      'var(--coar-radius-xs)',
      'var(--coar-radius-m)',
    ]);
  });
});
