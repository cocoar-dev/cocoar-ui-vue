/**
 * Compact values of @cocoar/vue-calendar: constants only. What the package derives from
 * shared roles stays in its own stylesheet.
 */
export const COMPACT_CALENDAR_TOKENS: Record<string, string> = {
  // Typography. Hierarchy comes from size and weight, not from a second alpha
  // reduction of ink that was already selected for contrast (the opacities).
  '--coar-calendar-event-font-size-dense': '11px',
  '--coar-calendar-event-meta-font-size': '11px',
  '--coar-calendar-event-meta-opacity': '1',
  '--coar-calendar-agenda-continuation-opacity': '1',
  '--coar-calendar-other-month-opacity': '1',
  '--coar-calendar-badge-font-weight': '600',
  '--coar-calendar-strong-font-weight': '600',
  '--coar-calendar-heading-font-weight': '600',
  '--coar-calendar-title-font-size': '16px',
  '--coar-calendar-section-title-font-size': '18px',
  '--coar-calendar-section-title-font-weight': '600',
  // Shape and rhythm.
  '--coar-calendar-event-radius': '4px',
  '--coar-calendar-header-cell-padding': '8px',
  '--coar-calendar-weekday-cell-padding': '6px 8px',
  '--coar-calendar-agenda-row-gap': '10px',
  // Time grid: day columns keep a floor and the shell scrolls sideways instead of
  // squeezing overlapping events; resize targets take at most half of a card.
  '--coar-calendar-time-grid-day-min-width': '128px',
  '--coar-calendar-time-grid-overflow-x': 'auto',
  '--coar-calendar-resize-max-size': '50%',
  // Continuous month header: weekend shading follows the dates' weekend flags, so a
  // cell that is not a weekend has no fill, whatever its position.
  '--coar-calendar-continuous-weekday-bg': 'transparent',
};

/** Where the theme scope meets `.coar-mobile`. */
export const COMPACT_CALENDAR_MOBILE_TOKENS: Record<string, string> = {};
