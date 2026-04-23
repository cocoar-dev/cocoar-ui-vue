import { describe, expect, it } from 'vitest';
import { decideListToggleAction, isToolEnabled } from './toolbar-helpers';
import type { CoarMarkdownEditorTool } from './CoarMarkdownEditor.vue';

describe('isToolEnabled', () => {
  it('enables every tool when whitelist is undefined', () => {
    expect(isToolEnabled('bold', undefined)).toBe(true);
    expect(isToolEnabled('table', undefined)).toBe(true);
    expect(isToolEnabled('clearFormatting', undefined)).toBe(true);
  });

  it('disables every tool when whitelist is empty', () => {
    expect(isToolEnabled('bold', [])).toBe(false);
    expect(isToolEnabled('italic', new Set())).toBe(false);
  });

  it('allows tools that are in the array whitelist', () => {
    const allow: CoarMarkdownEditorTool[] = ['bold', 'italic', 'bulletList'];
    expect(isToolEnabled('bold', allow)).toBe(true);
    expect(isToolEnabled('italic', allow)).toBe(true);
    expect(isToolEnabled('bulletList', allow)).toBe(true);
  });

  it('rejects tools that are not in the array whitelist', () => {
    const allow: CoarMarkdownEditorTool[] = ['bold', 'italic'];
    expect(isToolEnabled('table', allow)).toBe(false);
    expect(isToolEnabled('headings', allow)).toBe(false);
  });

  it('uses Set lookup when given a Set', () => {
    const allow = new Set<CoarMarkdownEditorTool>(['bold', 'codeBlock']);
    expect(isToolEnabled('bold', allow)).toBe(true);
    expect(isToolEnabled('codeBlock', allow)).toBe(true);
    expect(isToolEnabled('italic', allow)).toBe(false);
  });
});

describe('decideListToggleAction', () => {
  describe('target = bullet_list', () => {
    it('returns "lift" when already in a bullet list', () => {
      expect(
        decideListToggleAction({
          target: 'bullet_list',
          inBulletList: true,
          inOrderedList: false,
        }),
      ).toBe('lift');
    });

    it('returns "switch" when in an ordered list', () => {
      expect(
        decideListToggleAction({
          target: 'bullet_list',
          inBulletList: false,
          inOrderedList: true,
        }),
      ).toBe('switch');
    });

    it('returns "wrap" when not in any list', () => {
      expect(
        decideListToggleAction({
          target: 'bullet_list',
          inBulletList: false,
          inOrderedList: false,
        }),
      ).toBe('wrap');
    });
  });

  describe('target = ordered_list', () => {
    it('returns "lift" when already in an ordered list', () => {
      expect(
        decideListToggleAction({
          target: 'ordered_list',
          inBulletList: false,
          inOrderedList: true,
        }),
      ).toBe('lift');
    });

    it('returns "switch" when in a bullet list', () => {
      expect(
        decideListToggleAction({
          target: 'ordered_list',
          inBulletList: true,
          inOrderedList: false,
        }),
      ).toBe('switch');
    });

    it('returns "wrap" when not in any list', () => {
      expect(
        decideListToggleAction({
          target: 'ordered_list',
          inBulletList: false,
          inOrderedList: false,
        }),
      ).toBe('wrap');
    });
  });

  it('prefers "lift" when both flags are set (cursor is somehow nested in same target)', () => {
    // Edge case: ProseMirror would not normally allow same-type nesting at the
    // immediate ancestor level, but defensive: target match wins.
    expect(
      decideListToggleAction({
        target: 'bullet_list',
        inBulletList: true,
        inOrderedList: true,
      }),
    ).toBe('lift');
  });
});
