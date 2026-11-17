# Compact profile — ledger of the UI interaction scenes (`compact-interaction`)

Scope: the open panels and interaction states of `packages/ui` that the closed `compact-core-*` and the
`compact-display-*` stories did not show. A record for the parent's integration, **not** a claim of
complete verification: the parent made the pixel baselines (this work ran no Docker), nothing was run on a
native device, and `mode=mobile` is `.coar-mobile` on `<html>` in desktop Chromium (class emulation).
`@touch` tests also ran in Playwright's WebKit (iPad and iPhone profiles): that proves the engine
and its touch events, not iOS gestures or the soft keyboard.

## Files

- Scenes: `apps/playground/src/visual/stories/compact-interaction-*.vue` (16) and their shared
  synthetic data `compact-interaction-data.ts`. Each imports `./compact-fonts` and sets `.coar-compact` on its
  own root. They use real library components with deterministic values and no clock reads: picker scenes need the
  `clock` of their entry. The theme editor is imported from source
  (`packages/ui/src/components/theme-editor/CoarThemeEditor.vue`) because the visual page has no alias for
  `@cocoar/vue-ui/theme-editor`.
- Spec: `apps/playground/e2e/compact-interaction.spec.ts` (normal playground server on :5188, loads
  `/visual.html#/visual/<scene>`). **It needs the manifest entries below:** without them the visual page
  answers "story … is not in stories.json".
- No package, token, harness, gallery, inventory or existing story file was changed.

## Manifest entries for the parent

The parent owns `stories.json`. These 16 entries were appended (new entries only; no existing entry
changed). The parent captured `compact-interaction-*` baselines with them (on disk at 01:38). After that, the
entries are kept exactly as captured, and `manifest.test.mjs` passes 9/9. Every scene was rendered in
Chromium with them. All page captures have a scroll size equal to the viewport.
The open overlays focus nothing except the three listed `focus` elements and the tag-select input.

```json
  {"name":"compact-interaction-select-open","capture":"page","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] [role=combobox]"}],"overlays":1}},
  {"name":"compact-interaction-multi-select-open","capture":"page","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] [role=combobox]"}],"overlays":1}},
  {"name":"compact-interaction-tag-select-open","capture":"page","open":{"actions":[{"keyboardFocus":"[data-visual-open] .coar-tag-select-input"}],"overlays":1,"focus":"[data-visual-open] .coar-tag-select-input"}},
  {"name":"compact-interaction-date-picker-open","capture":"page","clock":"2026-03-10T09:00:00Z","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] .coar-plain-date-picker-btn"}],"overlays":1,"ready":".coar-scrollable-calendar__months-wrapper--ready"}},
  {"name":"compact-interaction-date-time-picker-open","capture":"page","clock":"2026-03-10T09:00:00Z","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] .coar-pdtp-btn"}],"overlays":1,"ready":".coar-scrollable-calendar__months-wrapper--ready"}},
  {"name":"compact-interaction-zoned-picker-open","capture":"page","clock":"2026-03-10T09:00:00Z","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] .coar-zdtp-btn"}],"overlays":1,"ready":".coar-scrollable-calendar__months-wrapper--ready"}},
  {"name":"compact-interaction-zoned-zone-list-open","capture":"page","clock":"2026-03-10T09:00:00Z","open":{"actions":[{"dispatch":"click","on":"[data-visual-open] .coar-zdtp-btn"},{"dispatch":"click","on":".coar-overlay-host .coar-zdtp-display-tz-btn"}],"overlays":1,"focus":".coar-zdtp-tz-search-input","ready":".coar-zdtp-tz-picker-item--active"}},
  {"name":"compact-interaction-dialog-open","capture":"page","open":{"overlays":1,"focus":".coar-dialog-close"}},
  {"name":"compact-interaction-sheet-form","capture":"page","modes":["mobile"],"viewport":{"width":390,"height":844},"open":{"overlays":1,"focus":".coar-sheet-close"}},
  {"name":"compact-interaction-form-status-open","capture":"page","open":{"actions":[{"dispatch":"click","on":"[data-status=messages] .coar-popover-trigger"},{"dispatch":"click","on":"[data-status=rules] .coar-popover-trigger"}],"overlays":2}},
  {"name":"compact-interaction-context-menu-open","capture":"page","open":{"actions":[{"dispatch":"click","on":".coar-overlay-host [data-level=\"1\"] > .coar-submenu-item"},{"dispatch":"click","on":".coar-overlay-host [data-level=\"2\"] > .coar-submenu-item"}],"overlays":3}},
  {"name":"compact-interaction-panel-layout","focus":"[aria-label=\"Resize left panel\"]"},
  {"name":"compact-interaction-theme-editor-open","capture":"page","viewport":{"width":1280,"height":900},"open":{"actions":[{"dispatch":"click","on":".te-fab"}],"overlays":1}},
  {"name":"compact-interaction-palette-editor-open","capture":"page","viewport":{"width":1280,"height":900},"open":{"actions":[{"dispatch":"click","on":".te-fab"},{"dispatch":"click","on":".te-palette-btn >> nth=0"}],"overlays":1,"ready":".cpe-modal"}},
  {"name":"compact-interaction-transitions"},
  {"name":"compact-interaction-field-actions","focus":"[data-field=stepper] input"}
```

Not yet done: a `--repeat` run on the scenes with motion or scrolling (`*-picker-open`, `zoned-zone-list-open`, `sheet-form`,
`palette-editor-open`, `transitions`).

## Ledger: internal component / state → scene → test

Test names are those of `compact-interaction.spec.ts`; "variants" = light, dark, mobile light, mobile dark.

| Component / internal state | Scene | Test (what is measured) |
| --- | --- | --- |
| `CoarSelect` + `CoarSelectDropdownPanel`: open, groups, icons, selected, disabled, long option | `select-open` | *selection panels* (variants): host `.coar-compact` and the scheme class, `color-scheme`, option Inter 13/14px 400, row 36/44, group header 12px, all text in Inter with loaded weights, panel anchored under the trigger and inside the viewport. *select: keyboard* (Enter opens, End+Enter selects the last option, focus returns, a disabled option is ignored, Escape closes). @touch: tap opens, 44px row, tap selects |
| `CoarMultiSelect` + panel: select all, toggles, disabled | `multi-select-open` | *selection panels* (variants); *multi select and tag select* (toggling `aria-selected`, stays open, `aria-disabled`) |
| `CoarTagSelect` + panel: open by focus, chosen options hidden, filter, add, Backspace | `tag-select-open` | *selection panels* (variants); *multi select and tag select* (filter "Salz" → Salzburg, ArrowDown+Enter adds, Backspace removes) |
| `CoarPlainDatePicker` + panel, `CoarScrollableCalendar`, month list, year stepper | `date-picker-open` | *date and time pickers* (variants): day Inter at the ui size and ≥ row, month item 12px with height 32/44, year buttons 32/44 square. *date pickers: year stepper…* (2026→2027→2026, the month list scrolls to June, a day click sets 17.06.2026; `closeOnSelect` is off by default so the panel stays open; Escape closes) |
| `CoarPlainDateTimePicker` + panel, embedded `CoarTimePicker` | `date-time-picker-open` | *date and time pickers* (variants): time value at the field size 14/16, step buttons 28/44 |
| `CoarZonedDateTimePicker` + panel: footer with value zone, lock button | `zoned-picker-open` | *date and time pickers* (variants): footer lock 32/44. *zoned picker* (value-zone editor opens and cancels; Vienna kept) |
| Zoned panel: display-zone list, search, active item, group headers | `zoned-zone-list-open` | *the zone list…* (variants): active item ui size and row, headers 12px, search focused. *zoned picker* (search "Tokyo" → one item, choice sets the display zone) |
| `CoarTimePicker` inline: 24 h with minute step 15, 12 h with period, at max, disabled | `field-actions` | *field actions…* (variants): step 28/44, value 14/16. *number input and time picker* (hours up, minutes +15, ArrowDown, max-hour button disabled, disabled buttons, PM) |
| `CoarNumberInput` frame actions: steppers, clear, at min and max | `field-actions` | *field actions…* (variants): steppers fill the frame, clear ≥44 on phones, field 14/16. *number input…* (click, ArrowUp, clamped at 10 with increase disabled, decrease, clear). @touch: a tap increments |
| `CoarDialogShell` with form body and `CoarDialogFooter` (3 actions) | `dialog-open` | *dialog, form-field status and context menu* (variants): host profile, close focused, close 32/44, title 16/600, footer order and button ui size and row height, input field size. *dialog: focus stays inside* (12× Tab stays inside, Escape closes) |
| `CoarSheetShell`: long form, scrolling body, fixed footer (phone) | `sheet-form` (mobile only, 390×844) | *phone sheet* (close focused, footer 44px buttons, text inputs 16px, body scrolls >100px while the footer box stays put, the last field ends above the footer). @touch: tapping the close button closes the sheet |
| `CoarFormField` + `CoarFormFieldStatusPanel`: hint, two errors, warning; rule checklist | `form-status-open` | *dialog, form-field status…* (variants): 2 hosts with the profile, 3 sections, 3 checklist rules with 2 fulfilled, all text at the ui size |
| `CoarContextMenu` (point anchor, target in the profile), `CoarMenuHeading`, nested `CoarSubFlyout` ×2 | `context-menu-open` | *dialog, form-field status…* (variants): 3 hosts with the profile, items at the ui size and row, heading 12px, each flyout beside its owner, inside the viewport. *context menu: keyboard* (ArrowRight opens each level, Escape closes them one at a time, a real right click opens the menu in the profile). @touch: tapping the parent opens the flyout, 44px items |
| `CoarPanelLayout` (all regions) + `CoarPaneDivider` ×3 + nested `CoarSplitPane` | `panel-layout` (focus image on the left divider) | *panel layout* (ArrowRight +8 and `aria-valuenow`, End/Home clamp to 320/140, the focused hairline is not the literal fallback blue, a mouse drag of +60, right/bottom inverted, the nested split moves 8px, closing and reopening the sidebar removes and restores region and divider) |
| `CoarThemeEditor` FAB + `CoarThemeEditorPanel` (presets, Brand) | `theme-editor-open` (1280×900) | *field actions and the theme editor* (variants): panel host profile, Inter at the ui size. *theme editor* (a preset applies, Reset appears; `<html>` never gets `coar-theme-editor`; Reset; close) |
| `CoarPaletteEditor` (accent), sliders, step reset | `palette-editor-open` (1280×900) | *theme editor* (a slider marks the row changed and shows 0.500, step reset, close). *the palette editor … takes the profile* (variants) **fails, see defect 1** |
| `CoarCollapse`, `CoarFade`, `CoarSlide`, `CoarScale`: shown and hidden after the toggle | `transitions` | *transitions* (real motion, not reduced: still in motion two frames after each toggle, removed after leaving, settles after entering without inline transition, height, transform or overflow) |
| Page errors | all | every test collects `pageerror` and `console.error`: none |

## Results (2026-11-16, local server, shared checkout)

`npx playwright test e2e/compact-interaction.spec.ts` (Chromium plus `@touch` in WebKit tablet and phone):
**35 passed, 6 failed.** All six failures are the package defects below. They are not marked `test.fail`.

## Package defects for the parent (with evidence)

1. **`CoarPaletteEditor` does not take the compact profile.** It teleports itself to `<body>`
   (`CoarPaletteEditor.vue` `<Teleport to="body">`), not through the overlay host, and carries no
   `useCompactPresentationContext`. Measured inside a compact theme editor: `.cpe-modal` uses `Poppins` 13px with
   colour `rgb(68, 68, 68)`; `.cpe-row-step` is Poppins 11px/700. The panel beside it (`.te-panel`) uses Inter
   13px. `el.closest('.coar-compact')` is false in every variant. Fails *the palette editor … takes the profile*
   ×4.
   Related observation (not asserted): with the compact slate accent (#334155), the 600–900 swatches are
   `oklch(from base L C h)` with the default chroma (0.09–0.15), so they render saturated blue next to a slate 500.
   The editor previews colours that the profile's own accent scale probably does not use.
2. **Zone search in the zoned picker on phones.** `.coar-zdtp-tz-search-input` with `.coar-mobile` is 14px
   and 30px tall. A text field under 16px makes iOS Safari zoom the page on focus, and 30px is below the 44px
   target role (`--coar-control-min-target-size`). The library's other mobile fields are 16px/44px (measured in the
   dialog and the sheet). Fails *the zone list …: mobile light / mobile dark*.
3. Minor, not asserted as a defect: `CoarFade` leaves an inline `opacity: 1` after entering (`onAfterEnter`
   clears only `transition`). It changes nothing visible, but it overrides a consumer's opacity rule on the
   element.
4. Behaviour by design, noted for the record: a mouse *click* on a `CoarSubFlyout` parent right after the
   hover closes the flyout that the hover just opened (see `menu-flyout-mouse.spec.ts`). The scene opens
   flyouts with `dispatch: click` (no hover), so its baseline is unaffected.

## Remaining gaps (exact)

- The baselines were not reviewed or compared here, and there was no `--repeat` stability run (Docker belongs to the parent).
- The context menu is tested only with a target element inside the profile. A programmatic
  `menu.open({ clientX, clientY })` without a target gives the overlay no context, so it opens in the legacy
  presentation. Code reading only (`CoarContextMenu.vue` passes `context: menu.target`), not tested.
- Picker internals not shown open: `CoarPlainDateTimeOrDatePicker` and `CoarZonedDateTimeOrDatePicker`, event
  markers in the side column (`*-events`), the today FAB after scrolling away, the min/max year bounds of the
  stepper, and the 12 h period spinner in the panel.
- Selects: virtualized long lists, search inside the panel (`--coar-select-search-size`), `allowCreate` in the
  tag select, the empty or no-match state, async loading.
- Dialog: the sizes s/l/xl, `alert`/`confirm` in compact (the existing `dialog` story is legacy), a nested
  dialog over a dialog, dragging the sheet to close (`useSheetDrag`) and the sheet with the keyboard open in
  compact.
- Form field: the status panel's fallback placement near the edge, rules with `whenFail: 'error'` moved into
  errors.
- Theme editor: the Semantic colours, Typography, Shape and Motion accordions and `TokenScaleEditor` are not opened.
  Neither are the Dark toggle inside the panel (it rewrites the container) and Download CSS.
- Transitions: only the settled states are in the images; the motion is measured only in Chromium.
- Not part of this scope and not covered by these scenes: data-grid cell editors and further grid editors, the
  document viewer's search and outline, the markdown editor's floating toolbar and table handles. From a grep of
  `src/design-review`: the gallery has the grid and viewer search fields and the markdown table picker
  (`compact-library.spec.ts`). I found no grid cell editor, viewer outline, floating toolbar or table handles there.
  This is a grep, not a verification.
