# Compact profile — audit of the display, navigation and container components (`compact-display`)

Scope: `packages/ui/src/components/{avatar … wizard}` (32 folders), every non-test source file. This is a
record for the parent's integration, **not** a claim of complete verification: the visual baselines of
the new scenes are not generated (Docker run is the parent's), there is no native/iOS/Android check, and
teleported panels only show the profile once the parent's overlay context carries `.coar-compact`.

## How the components take the profile

- Properties without a component token read a **shared role** with today's expression as the exact
  fallback: `font-size: var(--coar-ui-font-size, var(--coar-body-small-base-size))`. Outside the profile
  the role is undefined, so the declaration is the original one.
- Properties that already have a **component token** (`--coar-card-radius`, `--coar-menu-item-font-size`,
  `--coar-breadcrumb-font-size`, …) were left alone in the components; the profile should set those
  tokens (proposal B in `tmp/compact-display-tokens.css`). This keeps consumer overrides and the theme
  editor's writes meaningful.
- Ten **new per-package roles** (proposal C): `--coar-badge-font-weight`, `--coar-card-outlined-border-color`,
  `--coar-pane-divider-active-color`, `--coar-popconfirm-title-font-size`, `--coar-toast-title-font-size`,
  `--coar-table-cell-padding`, `--coar-tree-checkbox-radius`, `--coar-data-list-surface`,
  `--coar-scrollbar-handle-bg{,-hover,-active}`. No component declares a role (guarded by a test).
- **Mobile floors kept**: every existing `.coar-mobile` floor stays first in the chain
  (`var(--coar-control-row-min-height, var(--coar-interactive-row-height, auto))`,
  `max(var(--coar-ui-font-size, …), var(--coar-control-min-font-size, 0px))`), so compact + mobile keeps
  44px rows/targets and the 16px floor where it exists today.

### Evidence that nothing changes outside the profile

- `tmp/compact-display-preview/strip_roles.py` (run from the worktree root: strip every `var(<role>, X)` to `X`, drop comments, diff
  against `HEAD`): all 28 changed sources are identical except two intended structural changes:
  1. `listbox/CoarListbox.vue`: non-virtual rows use border-box only under `.coar-mobile` or
     `.coar-compact`; the original unscoped box model is retained. Compact virtual rows and headings
     also count padding inside their explicit virtualizer height. A fixed-height modifier prevents
     compact viewports from flex-growing to the full spacer height. The new edge-state browser spec
     measures 32px boxes without overlap, a bounded viewport and scrolling to the final real item.
  2. `scrollbar/vScrollbar.ts` imports the new `vScrollbar-roles.css` (after overlayscrollbars.css; checked
     in a `vite build`: order kept). Unset, each role resolves to the theme's own `--os-handle-*`.
     Every selector is gated by `.coar-compact`, so legacy consumer handle rules remain untouched.
     Inside the opt-in, consumers can customize the independent `--coar-scrollbar-handle-*` roles
     or the existing `--os-handle-*` fallback contract.
- `theme-editor/internal/compact-role-fallbacks.test.ts`: every profile role read in these 32 folders has
  a fallback; no component declares a role.
- Preview screenshots without the proposal tokens match today's look (`tmp/compact-display-preview/shots/*tokens_0*`).

## Per file

Legend: **changed** = reads profile roles; **unchanged** = inspected, reason given. "Mobile" = what the
component offers on phones today (docs `devices`), not a new feature.

### avatar
- `CoarAvatar.vue` — **changed**: square shape + its focus ring radius `--coar-control-radius` (was radius-xs 2px).
  Sizes are prop geometry (24…96px) and initials scale per size: unchanged on purpose. Initials 600 on
  coloured fill kept (legibility on bold fills). Mobile: display only, no target. Scene: indicators.
- `index.ts` — exports only.

### badge
- `CoarBadge.vue` — **changed**: weight via `--coar-badge-font-weight` (proposal 600; was 700, no blanket bold).
  Sizes 12…32px and 8…14px text are prop geometry; colours semantic. Mobile: display only. Scene: indicators.
  Note: `xs` 8px text stays small by design (count dot-like); flagged for the legibility review.

### breadcrumb
- `CoarBreadcrumb.vue` — **unchanged**: font via `--coar-breadcrumb-font-size` (proposal B: 13px/14px mobile);
  the `s` size sets the token locally and still wins.
- `CoarBreadcrumbItem.vue` — **unchanged**: link/active colours semantic, active 500 is the label weight,
  focus radius 1px is an outline detail. Mobile: links are inline text (no 44px target; docs state it).
  Scene: navigation (inside the navbar).

### card
- `CoarCard.vue` — **changed**: outlined border via `--coar-card-outlined-border-color` (was gray-100/200
  primitives, light/dark rules; proposal: neutral tertiary border). Radius/shadow via existing card tokens
  (proposal B: 8px). Padding variants are props. Scene: data.

### code-block
- `CoarCodeBlock.vue` — **changed**: block radius `--coar-panel-radius`; toggle + copy button radius
  `--coar-control-radius`; language label + copy text `--coar-caption-font-size` (was 11px). Code text
  (13px mono, line-height 1.5) and syntax colours are their own role: unchanged. Mobile: phone `partial`;
  20px toggle / small copy button have no touch floor (unchanged, limited). Scene: data.
  Found (default, not changed): with `show-line-numbers` the template whitespace inside `<pre>` renders
  empty lines above and below the code (visible in both shots).

### data-list
- `CoarDataList.vue` — **changed**: item/toggle/viewport radius control, card/tile/bordered/elevated/band/
  ghost radius panel; group header weight label (the token it read, `--coar-font-weight-semibold`, does not
  exist); card + drag ghost surface `--coar-data-list-surface` inside the old chain (white in dark mode
  today). Rows are measured, so compact padding/fonts cannot misplace them. Content font 14px is data text:
  unchanged. Mobile: phone `planned`; toggle 20px, no floors (unchanged). Scene: data.
- `CoarDataListToolbar.vue` — **unchanged**: layout only; search/sort are CoarTextInput/CoarSelect (parent).
- `data-list-builder.ts`, `types.ts`, `useDataListModel.ts`, `internal/*.ts`, `index.ts` — no visible styles
  (`useDataListLines` reads computed widths/gaps; unaffected by the roles).

### divider
- `CoarDivider.vue` — **changed**: label text `--coar-ui-font-size` (was 14px). Line colour semantic. Scene: indicators.

### dual-listbox
- `CoarDualListbox.vue` — **unchanged**: layout only; columns are CoarListbox, move buttons CoarButton
  (parent), search CoarTextInput (parent). Scene: lists.

### link
- `CoarLink.vue` — **unchanged**: no styles in the SFC; `.coar-link` lives in `styles/link.css` (parent-owned).
  Sizes follow `--coar-component-{s,m,l}-font-size`, so they move with the parent's component scale.
  Proposal D: focus radius → control radius. Scene: indicators.

### listbox
- `CoarListbox.vue` — **changed**: row font `--coar-ui-font-size` (inside the mobile 16px floor), row radius
  control, non-virtual row floor `--coar-interactive-row-height` after the mobile floor (+ box-sizing, see
  above), empty text UI size, title/heading weight label (`--coar-font-weight-semibold` undefined today).
  List radius follows `--coar-input-radius` (parent). Virtual mode keeps `itemHeight` (no CSS floor).
  Design flag: today's rows are ~22px; the shared 36px row makes long lists much taller — parent should
  judge in the gallery whether the listbox wants its own row role. Mobile: 44px rows unchanged. Scene: lists.
- `types.ts`, `index.ts` — no styles.

### menu
- `CoarMenuItem.vue`, `CoarSubExpand.vue`, `CoarSubFlyout.vue` — **changed**: row floor
  `--coar-interactive-row-height` after the mobile floor. Font/line-height/weight via existing menu tokens
  (proposal B: 13px/1.4, heading 12px/500). Padding 8/12 kept (row height comes from the floor).
- `CoarMenu.vue` — **unchanged**: radius/shadow tokens (proposal B: 8px); border semantic.
- `CoarMenuHeading.vue` — **unchanged**: all values via menu tokens (proposal B).
- `CoarMenuDivider.vue` — **unchanged**: 1px line, semantic colour, 4/12 margin fits the rhythm.
- `CoarContextMenu.vue`, `CoarContextMenuPanel.vue`, `CoarSubFlyoutPanel.vue` — **unchanged**: no styles;
  panels are `CoarMenu`. Context menus are anchored to a point: the parent's overlay context must decide
  where they take the profile from (no element anchor).
- `menu-aim.ts`, `menu-cascade.ts`, `useContextMenu.ts`, `index.ts` — logic only.
  Dark-mode menu tokens use gray-100/200 primitives (styles/tokens/menu.css, parent; proposal D).
  Scenes: lists (inline), submenu-open (flyout).

### navbar
- `CoarNavbar.vue` — **unchanged**: height/padding/background via navbar tokens (proposal B: 48px desktop,
  56px mobile). Scene: navigation.

### note
- `CoarNote.vue` — **changed**: right corners `--coar-panel-radius` (was 2px). Text inherits (reading text,
  parent's base typography). Padding variants are props. Scene: indicators.

### notice
- `CoarNotice.vue` — **changed**: text `--coar-ui-font-size`/`--coar-ui-line-height` (was 0.85rem/1.4),
  inline radius control, details button + CTA weight label 500 (was 600); the label prefix keeps 600 as
  emphasis. Banner `max-width: 640px` wrap unchanged. Mobile: details button is inline text (no 44px floor;
  unchanged). Scene: indicators.

### pagination
- `CoarPagination.vue` — **unchanged**: size/font via pagination tokens (proposal B font 13/14px), radius via
  `--coar-button-radius` (parent), mobile 44px/16px floors kept. Active 600 weight on a fixed-width button
  (no shift). Scene: navigation.

### panel-layout
- `internal/CoarPaneDivider.vue` — **changed**: active/hover line via `--coar-pane-divider-active-color`
  inside the old chain (today always `#3b82f6`: `--coar-color-accent` is not a token). 6px hit area kept;
  mobile: phone `no`, touch resize not improved (limited). Scene: data (split pane).
- `CoarPanelLayout.vue`, `CoarSplitPane.vue` — **unchanged**: layout only, no visual values.
- `panel-layout-types.ts`, `index.ts` — types.

### popconfirm
- `CoarPopconfirmPanel.vue` — **changed**: title `--coar-popconfirm-title-font-size` (proposal 14/16px; was 16px),
  message `--coar-ui-font-size`. Radius via popover token (B). Padding 12px, drop-shadow filter (needed by
  the arrow) and 280px width unchanged. Found (default, not changed): the arrow placement rules never reach
  the compiled CSS, so the arrow sits top-left over the title — task `tcg4`. Scene: popconfirm-open.
- `CoarPopconfirm.vue` — trigger wrapper only.

### popover
- `CoarPopoverPanel.vue` — **unchanged**: padding 8px, radius/shadow/size via popover tokens (B); content
  inherits typography. `CoarPopover.vue` — trigger only. Scene: popover-open.

### progress-bar
- `CoarProgressBar.vue` — **unchanged**: bar heights are tokens (2/4/8px), value text is caption 12px/500
  already. Scene: indicators.

### scrollbar
- `vScrollbar.ts` — **changed**: imports `vScrollbar-roles.css`; directive lifecycle (init, defer, update,
  destroy, MutationObserver) untouched.
- `vScrollbar-roles.css` — **new**: handle colours of the default `os-theme-dark` via roles, fallback to the
  theme variables. Explicit `theme: 'light'` is left alone. Reason: every library panel uses the dark
  theme also in dark mode, where the 44% black handle is nearly invisible; the profile sets mode-aware
  slate handles (proposal C). Size (10px) and radius unchanged. Scenes: any scrolling panel (no dedicated one).

### segmented-control
- `CoarSegmentedControl.vue` — **unchanged**: heights/fonts follow `--coar-component-*` (same as CoarButton,
  parent), radius `--coar-button-radius` (parent), mobile floors kept. Active weight stays 400 (500 would
  shift the label width on toggle). Scene: navigation (also in the theme editor).

### sidebar
- `CoarSidebarItem.vue` — **changed**: label `--coar-ui-font-size` (line-height 1.5 kept → 35.5px rows ≈ 36
  rhythm without a floor), collapsed icon button radius control. Item radius via token (B). No min-height
  floor on purpose: collapsed rails of size `s` are 36px wide and the icon button must stay square.
- `CoarSidebarGroup.vue` — **changed**: trigger font UI size, collapsed/icon-only radii control, flyout
  panel radius panel, flyout header caption + label weight (`--coar-font-weight-semibold` undefined today).
  Nested-item font (component-s) and indicator padding math unchanged.
- `CoarSidebarHeading.vue` — **changed**: caption 12px + label 500 (was 14px/600 uppercase).
- `CoarSidebar.vue` — **unchanged**: widths/borders/padding via sidebar tokens; collapsed widths are prop geometry.
- `CoarSidebarDivider.vue`, `CoarSidebarSpacer.vue` — **unchanged**: 1px line / spacing on the 4px grid.
- `CoarSidebarFlyoutPanel.vue`, `SidebarFlyoutProvider.vue`, `sidebar-context.ts`, `index.ts` — no own styles
  (panel styles are in CoarSidebarGroup's unscoped block, changed above).
  Mobile: no `.coar-mobile` rules (docs phone `partial`); rows ~36px desktop, no 44px floor (limited,
  unchanged). Scenes: sidebar, sidebar-flyout-open.

### spinner
- `CoarSpinner.vue` — **unchanged**: SVG geometry and sizes via tokens, accent stroke. Scene: indicators.

### table
- `CoarTable.vue` — **changed**: header caption 12px + label weight (was 13px/600 uppercase), cell padding
  `--coar-table-cell-padding` (proposal 8/12px; was 12/16px). The `compact` prop still wins (later rule).
  Body text 14px is data text: unchanged. Mobile: no floors (display table). Scene: data.

### tabs
- `CoarTabGroup.vue` — **changed**: label `--coar-ui-font-size` inside the mobile floor, weight label role
  (same 500), min-height `--coar-interactive-row-height` after the 44px mobile floor. `CoarTab.vue` — no styles.
  Scene: navigation (focus ring captured).

### tag
- `CoarTag.vue` — **unchanged**: sizes are prop text sizes (10/12/14px), radius via `--coar-tag-radius`
  (proposal B 6px; also reaches the chips of the parent's selects), mobile close-target margin math depends
  on today's padding, so padding stays. Scene: indicators.

### theme-editor
- `CoarThemeEditor.vue` — **changed**: overlay panel font UI size. FAB 44px unchanged.
- `CoarThemeEditorPanel.vue` — **changed**: panel font UI size; accordion title UI size + label weight
  (was 12px/600); section labels, divider, preset description, hints caption 12px (were 10–11px; 700/600 →
  500). Monospace values (10px) and the badge (10px) unchanged. Layout checked in the preview (no clipping).
- `CoarPaletteEditor.vue` — **changed**: modal radius panel (was 10px), font UI size, subtitle/reset/step/
  base labels caption + label weight (were 9–11px / 700). 7px swatch labels on colour are decorative: unchanged.
  Mouse-only drag (mobile: not usable, unchanged).
- `TokenScaleEditor.vue` — **unchanged**: composed of segmented control/select/text input (parent).
- `internal/scale-tokens.ts` — **unchanged**; new test proves the profile roles (`--coar-control-radius`,
  `--coar-panel-radius`) and a redefined step do not add options to the radius picker.
- `theme-editor-state.ts` — **unchanged**. Integration risk for the parent: it writes component tokens
  (`--coar-card-radius` …) in `.coar-theme-editor` on `<html>`; if the profile sets the same tokens on a
  descendant (e.g. `body.coar-compact`), the editor's edits are shadowed inside the profile.
- `internal/token-graph/*` — **unchanged** (parser untouched). The roles appear as consumer edges once the
  parent declares them; until then they are ignored as unknown, as designed.
- No visual scene: the editor is not exported from the package and mutates `<html>`; preview shot only
  (`tmp/compact-display-preview/shots/theme-editor-*`).

### toast
- `CoarToastItem.vue` — **changed**: title `--coar-toast-title-font-size` (proposal 14/15px; was 16px), message
  UI size, no-title message label weight 500 + title size, action button UI size/label weight/control radius,
  close radius control. Width 380px, padding/gap via toast tokens. Mobile: phone `partial`; the 380px
  min-width overflows narrow phones and the close button has no 44px floor (unchanged, limited).
- `CoarToastContainer.vue` — **unchanged**: fixed offsets 24px, z-index; no typography.
- `toast-service.ts`, `toast-types.ts`, `useToast.ts`, `index.ts` — logic. Scene: toast (items rendered in place).

### tooltip
- `CoarTooltipPanel.vue` — **unchanged**: only `pointer-events`; visuals are in `styles/tokens/tooltip.css`
  (parent-owned) → proposal D (caption text, control radius, 4/8px padding).
- `vTooltip.ts` — logic (classes `coar-tooltip`/`coar-tooltip-text`). Scene: tooltip-open.

### transitions
- `CoarCollapse.vue`, `CoarFade.vue`, `CoarScale.vue`, `CoarSlide.vue` — **unchanged**: motion tokens only
  (parent owns motion). `index.ts` exports.

### tree
- `CoarTree.vue` — **changed**: `m` density row/draft font `--coar-ui-font-size` (xs/s/l presets set their
  own font and win), empty text UI size, draft input radius control. Row height stays ~27px so the
  default virtual `itemSize: 28` keeps fitting (no row floor on purpose — virtual rows have a fixed height).
- `CoarTreeNode.vue` — **changed**: row font as above, chevron radius control, checkbox radius
  `--coar-tree-checkbox-radius` (proposal 4px: 6px made the 16px box look like a radio in the preview;
  CoarCheckbox needs the same cap — parent).
- `CoarTreeNodeLabel.vue` — **changed**: rename input radius control.
- `tree-builder.ts`, `tree-dnd.ts`, `tree-types.ts`, `useTree.ts`, `internal/selection.ts`, `index.ts` — logic.
  Mobile: phone `no` (unchanged). Rows set no text colour (inherit from the app). Scene: lists.

### wizard
- `CoarWizard.vue` — **changed**: step button radius control, marker number + step label UI size (were 16px
  via `--coar-font-size-s`), label weight role (same 500), description caption. Marker 28px geometry and
  connector math unchanged. Scene: navigation (top and left indicator).

## Scenes (new files, fragment `tmp/compact-display-stories.json`)

`compact-display-indicators`, `-navigation` (with tab focus), `-lists`, `-data`, `-sidebar`, `-toast`,
`-popover-open`, `-popconfirm-open`, `-submenu-open`, `-sidebar-flyout-open`, `-tooltip-open`.
Each wraps real components with fixed data in `<div class="coar-compact">`; overlays open with `dispatch`
clicks as the existing stories do. Validated with `storyProblems` of `manifest.ts` (no problems, no name
collisions; 52 baselines once generated). Teleported panels show the profile only after the parent's
overlay context carries it (the preview used `.coar-compact` on `<html>` to check them).

## Pending / not verified here

- Docker visual run and baselines of the new scenes (`node apps/playground/scripts/visual.mjs …`, `--repeat`).
- Contrast measurements of caption/tertiary text on the parent's slate palette (12px tertiary headings in
  sidebar, menu, listbox, table header).
- Native devices (iOS/Android), text zoom 200 %, Windows fonts.
- Docs: no page changed — the profile API is the parent's (Preview); no device statement changed.
