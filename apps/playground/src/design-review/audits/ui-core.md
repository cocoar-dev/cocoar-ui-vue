# Compact: core controls, context and font boundary

This is a source-by-source styling audit, not a blanket approval of every interaction.
`compact-presentation.spec.ts` and `compact-context.spec.ts` record computed styles and real
geometry; `compact-interaction.spec.ts` owns the opened-panel/state checks. Native keyboard
verification and the final inventory gate remain separate requirements.

## Field-border refinement

Only the normal and hover input-border defaults changed: light `#8e949c` / `#7d8794`,
dark `#60718a` / `#6d7e97`. Normal borders retain measured contrast above 3 to 1 against
their default field surfaces. Focus/error colors, geometry and typography are unchanged.
The presentation/context suite passes 23 browser cases; 12 focused Chromium/WebKit
phone/tablet cases cover both schemes, both density classes and independent role overrides.
All 2090 UI unit tests pass. The refreshed inventory revision leaves earlier matrix
checks pending rather than carrying their old-revision approvals forward.

The adaptive review's stale-baseline finding is resolved: 86 new Compact images were
regenerated in Docker. All 20 affected stories pass the strict comparison (89 cases);
the zone-list story also passes three repeated runs (21 cases including manifest checks).
Its updated images change exactly 34 desktop or 42 mobile separator pixels, with the
scrollbar and every other pixel unchanged. Hash checks confirm that every non-Compact
image remains byte-identical and no tracked baseline changed. This does not close the
broader inventory gate or fix the previously observed scrollbar-readiness flake.

## Foundation and transport

### Field-size refinement

Field text now follows independent extra-small, small, medium and large roles:
12/13/14/16px on desktop and 16/16/16/18px with the mobile field floor. The action-text
floor remains separate. The new roles are registered for overlay transport; single-
and multi-select inline searches use the same size as their displayed values in Compact.
Legacy multi-select searches retain their previous medium text size.

`compact-field-sizes.spec.ts` checks all twelve input families in both color schemes
and density modes, including nested themes, role overrides, legacy inline search and
independent chip metrics. After the review fixes, all 16 Chromium and 32 WebKit
phone/tablet cases pass, alongside all 88 map/grid state cases. All 2090 UI unit tests
and UI lint, typecheck and build pass on the corrected source. The recorded before/
after measurements retain the sampled field heights and every legacy font size. Multiline
fields use their shell's native medium-font row metrics as a minimum through `1lh`,
adding leading for larger text according to the body line-height role. Long textareas
can grow to retain their requested rows rather than clip larger glyphs. That row
context belongs only to textareas, not to other multiline frames: applying it to
TagSelect also moved its chip label (287 pixels per scheme/density image). The
textarea-specific selector and explicit tag-label line-height assertions prevent
that unrelated change.

The adaptive review found three additional gaps: stale small-field font expectations
in the map/grid suite, clipped large multiline glyphs and size overrides reinstalled
by inner theme boundaries. Small-field assertions now expect 13px desktop/16px mobile.
Inherited consumer overrides are separate from locally rebound derived defaults;
both are registered for overlay transport. New regressions exercise overrides on the
outer Compact boundary across nested themes and the transported overlay, plus actual
German glyph ink/line metrics in Chromium and WebKit. Large text now uses 20px desktop
and 23px mobile line spacing instead of 17/20px; the sampled three-row textareas remain
88px high. All three findings have passing regressions.

The pre-review targeted Docker comparison passes all 91 cases across eight Compact
and nine legacy story groups. Exactly 22 Compact images changed: eight field
samples, eight field-action samples, the two desktop images for each opened
date-time picker and the two desktop listbox-search images. The selection images
match their previous baselines after isolating the textarea row context.
Every non-Compact image remains byte-identical; no story, manifest recipe or
comparison rule was changed. This is a targeted typography result, not a green
full-library visual or inventory gate.

Post-review, all 89 presentation/context/interaction/edge regressions pass. The
combined 91-case visual rerun is not green: 65 pass and 26 fail at navigation,
readiness, focus or capture time limits, including unchanged legacy stories.
No pixel mismatch is reported, but unreachable comparisons are not passes.
The complete failed report is preserved before the unchanged small-group rerun;
no readiness, timeout, tolerance or baseline is adjusted to hide these failures.
That bounded rerun also stops in its first three-story group: 16/19 cases pass,
while one page crashes and two cases time out during capture/readiness. Reports are
preserved in `field-fonts/review-visual-failed` and `review-visual-batch-1-failed`.
The post-fix visual verification remains incomplete; no further automatic retry
or comparator change is used to turn that gap into an approval.

| Source | Decision and evidence |
| --- | --- |
| `packages/ui/styles/tokens/compact.css` | Independent density, type and shape defaults live at the opt-in/reset boundary. Nested mode boundaries inherit those values; dependent aliases rebind locally. A failing 17px → 13px browser reproduction is now covered by the context spec, including independent field size, height, radius and Georgia. Mobile overrides retain 16px input text independently of 14px action text. |
| `packages/ui/src/compact-fonts.ts` | Optional Inter 400/500/600/700 faces, separate from the legacy font module. The built `dist/compact-fonts.js` imports only these external CSS files; no font CSS is folded into the main JS entry. Export and declaration targets exist after the build. New visual samples explicitly await all four faces. The browser suite also aborts both WOFF and WOFF2 downloads and exercises a real fallback. |
| `packages/ui/src/fonts.ts` | Unchanged. Poppins, legacy Inter 400/700 and Cascadia Code remain the original imports. The transport contract test rejects adding compact-only weights here. |
| `packages/ui/src/components/theme-scope/CoarThemeScope.vue` | Explicit body/title fonts, accent and radii supply the profile inputs while retaining their legacy token mappings. Mode detection follows the nearest explicit ancestor. Unit tests plus the context page cover live mode/font changes, nested mobile, a local role override and an explicit reset. `display: contents` does not add a layout box. |
| `packages/ui/src/components/overlay/compact-context.ts` | Explicit registered-role contract, reconciled against every declaration in the profile by the unit test. Not an unbounded computed-style copy. |
| `packages/ui/src/components/overlay/useCompactPresentationContext.ts` | Custom teleports carry the computed scheme, registered roles and explicit consumer package overrides. Empty optional inputs remain `initial`, so a reset does not inherit the document brand again. Ancestor class/style changes update the context; leaving the opt-in clears it. The real-browser spec tests font/geometry and an open reset select, not merely class names. |
| `packages/ui/src/components/overlay/CoarOverlayOutlet.vue` | Uses the same context for standard panels, including virtual anchors with an explicit context element. The contract tests cover both anchor kinds and deactivation; touch tests change mobile and mode while the real select remains open. |
| `packages/ui/src/components/overlay/CoarOverlayHost.vue` | No independent visual dimensions; hosts the outlet. Styling belongs to the rendered panel and transported context. Covered through the real opened select, not an empty host snapshot. |

## Fields and choices

Paths in this table are below `packages/ui/src/components/`.

| Source | Roles / intentionally retained geometry |
| --- | --- |
| `button/CoarButton.vue` | Shared size heights and action text; semantic fills, focus, radius and disabled/loading states. Action text is not tied to the input's 16px mobile role. The role-independence test changes action/field fonts and button/input radii independently. |
| `input-frame/CoarInputFrame.vue` | Owns the field box, height, border, state surface and scaled outer clearance. Leading/trailing/actions are not a second field sizing system. The four-size scene, mobile 44px measurement and role-override test exercise this boundary. |
| `input-frame/CoarInputFrameButton.vue` | Inspected, unchanged: its segment follows the frame's clearance and radius, with the independent inherited mobile target floor. The separator is a 1px structural line; it is not a density knob. The field-actions scene exercises a real interior action. |
| `text-input/CoarTextInput.vue` | Field role for every size; frame-owned box and semantic placeholder/disabled text. Prefix/suffix remain secondary UI text. Textarea grows independently of a single-row control; autofill shadow is browser painting geometry, not padding. |
| `password-input/CoarPasswordInput.vue` | Same field role and frame; clear/visibility actions keep mobile hit areas. Empty clear slot stays reserved, readonly/disabled actions stay inert. No altered password behavior. |
| `number-input/CoarNumberInput.vue` | Field role, tabular digits and right alignment. Stepper cell widths/insets remain internal icon geometry; mobile target floor is separate. Units use UI text, not input text. No change to numeric parsing/range behavior. |
| `otp-input/CoarOtpInput.vue` | Frame-aligned size and input role; monospace/tabular digits deliberately remain a code/number role. Mobile cells may shrink horizontally to fit; the browser suite checks 44px height and real focus. No multiplication of desktop height by a density factor. |
| `form-field/CoarFormField.vue` | Label size/weight and optical icon offset; hint/error/warning/rule colors stay semantic. The core states sample contains each message family. Status-panel opening is a separate interaction scene. |
| `form-field/CoarFormFieldStatusPanel.vue` | Label-sized detailed text and UI line height; 320px maximum width is a wrapping constraint, not a control size. Section/rule icons retain the 1px optical nudge. No blanket caption shrink of detailed validation messages. |
| `checkbox/CoarCheckbox.vue` | Choice row and separately sized indicator/icon; 3px checkbox radius is not the 6px general control radius. Checked/indeterminate/focus/error/disabled styling remains semantic. |
| `checkbox-group/CoarCheckboxGroup.vue` | Inspected, unchanged: layout and form context; spacing tokens and child checkbox styling. No independent indicator geometry. |
| `radio-group/CoarRadioButton.vue` | Shared choice-row/text roles. Circular ring/dot geometry stays distinct from the square checkbox; changing a control radius must not square a radio. |
| `radio-group/CoarRadioGroup.vue` | Inspected, unchanged: group orientation and spacing, not a second radio styling source. |
| `switch/CoarSwitch.vue` | Separately named track/thumb roles and choice-row target. Track dimensions are not control heights; label text follows the size scale and disabled/readonly rules. |
| `icon/CoarIcon.vue` | Preset icon roles (including compact 18px m); custom sizes and rotations remain consumer geometry. SVG fills the box and uses currentColor. Loading/spinning is not a control target. Icon text follows label roles; SVG normalization is audited separately. |

## Dates and containers

| Source below `packages/ui/src/components/` | Decision |
| --- | --- |
| `date-time/month-list/CoarMonthList.vue` | Picker month/action heights are independent roles; list selection uses semantic colors. Scroll offsets are geometry, not type density. |
| `date-time/plain-date-picker/CoarPlainDatePicker.vue` | Field/frame role; inline calendar/clear actions retain their own target contract. Open panel is a separate scene. |
| `date-time/plain-date-picker/CoarPlainDatePickerPanel.vue` | Caption/UI typography, picker action/day roles and panel radius; previous/next/today/selection are explicitly exercised by interaction tests. |
| `date-time/plain-date-time-picker/CoarPlainDateTimePicker.vue` | Field role and composed date/time input, not a second global font scale. |
| `date-time/plain-date-time-picker/CoarPlainDateTimePickerPanel.vue` | Composed calendar/time roles; active subpanel and input focus are separate opened states. |
| `date-time/zoned-date-time-picker/CoarZonedDateTimePicker.vue` | Field role; zone caption clearance accounts for an independent mobile action target. |
| `date-time/zoned-date-time-picker/CoarZonedDateTimePickerPanel.vue` | Date/time/calendar and timezone list roles. The timezone list has its own open scene; it is not inferred from the closed field. |
| `date-time/plain-date-time-or-date-picker/CoarPlainDateTimeOrDatePicker.vue` | Composes the public date/date-time controls. Registered edge tests exercise the real mode switch, opened panels, 320px containment and mobile toggle size; this does not close every wrapper state. |
| `date-time/zoned-date-time-or-date-picker/CoarZonedDateTimeOrDatePicker.vue` | Same explicit mode-switch and containment checks for date/zoned composition, rather than inferring it from the plain wrapper. |
| `date-time/_shared/date-or-time.css` | Compact-only `max-width:100%` bounds the composition. Exact Docker diagnosis: old mobile images render 344px wrappers in 320px hosts; bounded wrappers are 320px. Removing only this rule in a throwaway diagnostic page matches the old baseline pixel for pixel. Keeping it changes exactly the 6182 optional-time-strip pixels reported by the mixed comparison. No story/harness adjustment was used. |
| `date-time/plain-date-view/CoarPlainDateView.vue` | Inspected, unchanged: body/date text roles. The `#999` is behind the tertiary-text token, not a newly selected palette color. |
| `date-time/plain-date-time-view/CoarPlainDateTimeView.vue` | Inspected, unchanged: same text contract; date/time formatting remains localization, not density. |
| `date-time/zoned-date-time-view/CoarZonedDateTimeView.vue` | Inspected, unchanged: date/time and zone text roles; original formatting/offset geometry retained. |
| `date-time/scrollable-calendar/CoarScrollableCalendar.vue` | Picker day/month roles and caption typography. Virtualized month/scroll geometry stays measured; render readiness must remain real. |
| `date-time/time-picker/CoarTimePicker.vue` | Separate time-cell and step-action roles; mobile targets increase without enlarging all text to 16px. Field input retains its own role. |
| `dialog/CoarDialogShell.vue` | Dialog shape/padding/header gap and separate close target, 32px desktop / 44px compact mobile. `100vw - 32px` is a viewport safety inset, not a general spacing alias. The close box-sizing change is opt-in only. |
| `dialog/CoarDialogFooter.vue` | Inspected, unchanged: flex alignment/spacing; real CoarButtons own action typography/height. |
| `dialog/CoarSheetShell.vue` | Sheet radius/padding and semantic handle color; measured keyboard/viewport/safe-area dimensions are retained. The sheet is not treated as a small desktop dialog. Native keyboard verification is still separate from its CSS scene. |

## Verification limits

- The 17-test core/context run passed in Chromium plus the tagged WebKit phone/tablet cases.
  Subsequent focused checks also cover Georgia inheritance and four consumer hues in both schemes.
- The first full visual comparison after font preloading passed all previous 349 cases, including
  continuous-month readiness; only new interaction baselines were missing. Their compact-only capture
  subsequently succeeded. The final unchanged comparison and repeat check still have to run.
- This audit does not close the remaining calendar drag, editor, viewer and native-device checks.
  Neither a shared token nor one broad green suite is evidence for an unopened internal panel.
- Earlier mixed comparison: 429 passed / 6 failed. Four failures were timeouts in the zoned-list story at different
  phases, not established component defects. All eight zoned-list comparisons then passed in an unchanged
  targeted `--repeat 2` run. A separate native 6× CPU profile opened the complete list in 314ms and filtered Tokyo
  in 142ms, without page/console errors; it does not explain Docker full-run stalls.
- The two deterministic date-edge image differences are the intended containment correction above, not a reason
  to restore overflowing inputs. `job-124b5620` updated only the two Compact mobile date images, then passed
  **22/22** unchanged `--repeat 2` visual cases across date edges and the opened zone list. A fresh registered
  functional subset also passed **13/13**, covering optional-time mode changes, date markers/year bounds and
  zone search/selection. Legacy images, existing recipes and comparison limits are untouched.
- `job-e7f94879`: global lint/typecheck/build passed (16/34/20 tasks; lint retains 68 warnings and no errors).
  Full tests remain red: 624 browser cases passed, two WebKit `/touch-lab` beforeEach navigations timed out,
  seven existing conditional skips; 33/34 Turbo tasks succeeded. The mixed visuals passed 434/435; the only
  failure is 275 pixels in the default/light opened zone list. Neither aggregate is green.
- Exact Docker diagnosis of those 275 pixels: captures immediately after idle readiness and after 100ms match
  the baseline with zero differences. Captures after the delayed scrollbar Auto-hide (500ms and 1500ms samples)
  match the failed image with zero differences. The vertical scrollbar changes opacity from 1 to 0; the pixel
  delta contains its 198-pixel handle and 77 pixels at the settings icon. Evidence:
  `verification/zone-pixels-diagnostic.json`, `zone-pixels-{0,100,500,1500}.png` and the preserved full report.
  No product-style or baseline change is justified by these two normal timed states.
- The zone story currently declares readiness by the active item alone, before delayed Auto-hide finishes.
  A separate protected change must preserve the active-item assertion while waiting for the actual final
  scrollbar state; it needs explicit maintainer approval. No story, manifest recipe, capture rule, timeout or
  tolerance has been changed. Earlier sporadic full-run timeouts still have no established cause.
- Full WebKit-only trace run (`job-40e27aac`): 133 passed, two navigation failures, seven conditional skips.
  Both failures occur at test ordinal **64** in their project. Their traces contain no network resource and
  stop after `Frame.goto`, before any page/frame snapshot; the date-picker assertion has not run.
- Independent minimal HTTP reproduction (`webkit-navigation-minimal.mjs`, no Vue, library, Vite, fonts or
  workers): 63 fresh WebKit pages navigate successfully; page 64 times out with **zero requests**. This isolates
  the failure from the component/application. Installed Playwright is 1.60.0 with WebKit build 2287.
  The public `microsoft/playwright` issue **#42385** documents the same long-run/no-request macOS failure and
  a display-sleep/AppKit animation explanation; it is supporting upstream evidence, not a locally verified
  animation workaround. A process-only argument experiment was rejected by Playwright's argument validation
  before its second browser launched. No OS defaults, power settings, retries, timeouts or dependencies changed.
  Browser-environment remediation is therefore still a separate step; the full unmodified suite remains red.
