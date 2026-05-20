import { describe, expect, it } from 'vitest';
import { computeEffectiveTools, type EffectiveToolsOptions } from './effective-tools';
import type { CoarDocumentViewerTool } from '../types';

const ALL_ON: EffectiveToolsOptions = {
  showSidebarToggle: true,
  showAnnotationsPanelToggle: true,
  showSearch: true,
  showPrintDownload: true,
  showAnnotationModes: true,
};

function run(
  tools: readonly CoarDocumentViewerTool[],
  overrides: Partial<EffectiveToolsOptions> = {},
): readonly CoarDocumentViewerTool[] {
  return computeEffectiveTools(tools, { ...ALL_ON, ...overrides });
}

describe('computeEffectiveTools', () => {
  describe('order preservation', () => {
    it('keeps the user-supplied order verbatim when no filtering applies', () => {
      const tools: CoarDocumentViewerTool[] = ['zoom-in', 'prev-page', 'rotate-cw'];
      expect(run(tools)).toEqual(tools);
    });

    it('returns an empty array when given an empty array', () => {
      expect(run([])).toEqual([]);
    });
  });

  describe('section-toggle filtering', () => {
    it('drops "search" when showSearch is false', () => {
      const result = run(['prev-page', 'search', 'next-page'], { showSearch: false });
      expect(result).toEqual(['prev-page', 'next-page']);
    });

    it('drops both print + download when showPrintDownload is false', () => {
      const result = run(['print', 'download', 'zoom-in'], { showPrintDownload: false });
      expect(result).toEqual(['zoom-in']);
    });

    it('drops "sidebar-toggle" when showSidebarToggle is false', () => {
      const result = run(['sidebar-toggle', 'zoom-in'], { showSidebarToggle: false });
      expect(result).toEqual(['zoom-in']);
    });

    it('drops "annotations-panel" when showAnnotationsPanelToggle is false', () => {
      const result = run(['annotations-panel', 'zoom-in'], {
        showAnnotationsPanelToggle: false,
      });
      expect(result).toEqual(['zoom-in']);
    });

    it('drops all annotation-mode tools when showAnnotationModes is false', () => {
      const tools: CoarDocumentViewerTool[] = [
        'pan',
        'select',
        'eraser',
        'marker',
        'note',
        'ink',
        'freetext',
        'zoom-in',
      ];
      expect(run(tools, { showAnnotationModes: false })).toEqual(['zoom-in']);
    });

    it('keeps annotation-mode tools when showAnnotationModes is true', () => {
      const tools: CoarDocumentViewerTool[] = ['marker', 'ink', 'freetext'];
      expect(run(tools)).toEqual(tools);
    });
  });

  describe('separator trim', () => {
    it('trims a single leading separator', () => {
      expect(run(['separator', 'zoom-in'])).toEqual(['zoom-in']);
    });

    it('trims multiple leading separators', () => {
      expect(run(['separator', 'separator', 'separator', 'zoom-in'])).toEqual(['zoom-in']);
    });

    it('trims a single trailing separator', () => {
      expect(run(['zoom-in', 'separator'])).toEqual(['zoom-in']);
    });

    it('trims multiple trailing separators', () => {
      expect(run(['zoom-in', 'separator', 'separator'])).toEqual(['zoom-in']);
    });

    it('trims separators on both ends', () => {
      expect(run(['separator', 'zoom-in', 'zoom-out', 'separator'])).toEqual([
        'zoom-in',
        'zoom-out',
      ]);
    });

    it('keeps a single internal separator', () => {
      expect(run(['zoom-in', 'separator', 'zoom-out'])).toEqual([
        'zoom-in',
        'separator',
        'zoom-out',
      ]);
    });

    it('returns empty when input is only separators', () => {
      expect(run(['separator', 'separator', 'separator'])).toEqual([]);
    });
  });

  describe('separator collapse', () => {
    it('collapses two consecutive internal separators into one', () => {
      expect(run(['zoom-in', 'separator', 'separator', 'zoom-out'])).toEqual([
        'zoom-in',
        'separator',
        'zoom-out',
      ]);
    });

    it('collapses N consecutive internal separators into one', () => {
      expect(
        run(['zoom-in', 'separator', 'separator', 'separator', 'separator', 'zoom-out']),
      ).toEqual(['zoom-in', 'separator', 'zoom-out']);
    });
  });

  describe('combined filter + trim + collapse', () => {
    it('collapses separators left orphaned by filtered-out tools', () => {
      // search gets dropped → the two separators around it would orphan,
      // collapse should merge them.
      const result = run(
        ['prev-page', 'separator', 'search', 'separator', 'next-page'],
        { showSearch: false },
      );
      expect(result).toEqual(['prev-page', 'separator', 'next-page']);
    });

    it('trims a separator left exposed at the end by filtering', () => {
      const result = run(['prev-page', 'separator', 'search'], { showSearch: false });
      expect(result).toEqual(['prev-page']);
    });

    it('trims a separator left exposed at the start by filtering', () => {
      const result = run(['search', 'separator', 'next-page'], { showSearch: false });
      expect(result).toEqual(['next-page']);
    });

    it('drops everything cleanly when all real tools are filtered out', () => {
      const result = run(['separator', 'search', 'separator', 'print', 'separator'], {
        showSearch: false,
        showPrintDownload: false,
      });
      expect(result).toEqual([]);
    });
  });

  describe('handout example (the minimal toolbar from the playground)', () => {
    it('preserves the canonical minimal toolbar layout', () => {
      const tools: CoarDocumentViewerTool[] = [
        'prev-page',
        'page-input',
        'next-page',
        'separator',
        'zoom-out',
        'zoom-reset',
        'zoom-in',
      ];
      expect(run(tools)).toEqual(tools);
    });
  });
});
