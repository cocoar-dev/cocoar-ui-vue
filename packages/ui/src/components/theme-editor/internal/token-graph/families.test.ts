import { describe, it, expect } from 'vitest';
import { familyOf, familyMembers } from './families';

describe('familyOf', () => {
  it('groups component size scales by their property', () => {
    expect(familyOf('--coar-component-xs-height')).toEqual({ key: '--coar-component-*-height', variant: 'xs' });
    expect(familyOf('--coar-component-l-height')).toEqual({ key: '--coar-component-*-height', variant: 'l' });
    expect(familyOf('--coar-component-m-label-font-size')).toEqual({ key: '--coar-component-*-label-font-size', variant: 'm' });
  });

  it('groups palette steps by hue', () => {
    expect(familyOf('--coar-color-red-600')).toEqual({ key: '--coar-color-red-*', variant: '600' });
    expect(familyOf('--coar-color-accent-50')).toEqual({ key: '--coar-color-accent-*', variant: '50' });
  });

  it('groups radius/spacing scales', () => {
    expect(familyOf('--coar-radius-m')?.key).toBe('--coar-radius-*');
    expect(familyOf('--coar-spacing-xs')?.key).toBe('--coar-spacing-*');
  });

  it('does NOT group semantic roles or non-scale names', () => {
    expect(familyOf('--coar-background-semantic-error-bold')).toBeNull();
    expect(familyOf('--coar-input-radius')).toBeNull();
    expect(familyOf('--coar-accent')).toBeNull();
    expect(familyOf('--coar-duration-fast')).toBeNull(); // fast/normal/slow isn't the size vocab
  });
});

describe('familyMembers', () => {
  it('keeps only families with ≥2 members present', () => {
    const groups = familyMembers([
      '--coar-component-xs-height',
      '--coar-component-s-height',
      '--coar-component-m-height',
      '--coar-color-red-600', // lone palette member → not collapsed
      '--coar-input-radius', // no family
    ]);
    expect([...groups.keys()]).toEqual(['--coar-component-*-height']);
    expect(groups.get('--coar-component-*-height')).toHaveLength(3);
  });
});
