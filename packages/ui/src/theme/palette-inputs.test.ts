import { describe, expect, it } from 'vitest';
import { COLOR_PALETTES, COLOR_STEPS, DEFAULT_PALETTE_CURVES, DEFAULT_PALETTE_INPUTS } from './palette-inputs';

async function primitives(scheme: string): Promise<string> {
  const fsModule = 'node:fs';
  const fs = await import(/* @vite-ignore */ fsModule) as { readFileSync(path: string, encoding: 'utf8'): string };
  const dir = decodeURIComponent(import.meta.url).replace(/^file:\/\//, '').replace(/^\/([A-Za-z]:)/, '$1').replace(/\/[^/]*$/, '');
  return fs.readFileSync(`${dir}/../../styles/tokens/colors-primitives-${scheme}.css`, 'utf8');
}

describe('shared palette inputs', () => {
  it('has both curves of every step of every base palette', () => {
    expect(Object.keys(DEFAULT_PALETTE_INPUTS)).toHaveLength(100);
    for (const palette of Object.values(COLOR_PALETTES)) {
      for (const step of COLOR_STEPS) {
        for (const suffix of ['', '-dark']) {
          expect(DEFAULT_PALETTE_INPUTS[`--coar-color-${palette}-${step}-lc${suffix}`]).toBeTruthy();
        }
      }
    }
  });

  it.each(['light', 'dark'] as const)('retains the legacy %s curves as defaults', async (scheme) => {
    const css = await primitives(scheme);
    for (const palette of Object.values(COLOR_PALETTES)) {
      for (const [i, step] of COLOR_STEPS.entries()) {
        const line = css.split('\n').find((line) => line.trimStart().startsWith(`--coar-color-${palette}-${step}:`))!;
        const lc = line.match(/oklch\(from var\(--coar-\w+\)\s+([\d.\s]+)\s+h\)/)?.[1].trim();
        const expected = DEFAULT_PALETTE_CURVES[palette][scheme][i];
        if (step === 500) expect(lc).toBeUndefined();
        else expect(lc?.split(/\s+/).map(Number), `${palette} ${step}`).toEqual(expected.split(' ').map(Number));
      }
    }
  });
});
