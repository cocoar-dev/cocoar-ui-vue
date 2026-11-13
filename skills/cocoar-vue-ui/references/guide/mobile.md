<!-- Generated from apps/docs/guide/mobile.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Mobile presentation (Preview)

> **Warning: Preview — new in 3.2**
>
> The mobile presentation is new in 3.2 and still a Preview: token names and the
> set of adapted controls may change before it loses this mark.

Add `coar-mobile` to `html`, `body`, or a local parent to opt into a mobile
presentation. Import the normal `@cocoar/vue-ui/styles` stylesheet; no extra
plugin, component props, or mobile-specific components are required.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const name = ref('');
</script>

<template>
  <div class="coar-mobile">
    <CoarFormField label="Name">
      <CoarTextInput v-model="name" clearable />
    </CoarFormField>
    <CoarButton>Save</CoarButton>
  </div>
</template>
```

For an entire iOS/Android app or a deliberately mobile web interface:

```ts
document.body.classList.add('coar-mobile');
```

The class is an explicit **presentation preference**, not a claim that a mouse or
keyboard is unavailable. Existing click events, keyboard handling, `v-model`,
validation, disabled/readonly states, and link-button semantics stay unchanged.
Connecting a mouse does not switch the presentation. Narrowing the viewport does
not automatically enable this mode either.

## What decides what

Each aspect of how a component looks and behaves has one source. They are
independent of each other:

| Aspect | Decided by |
|--------|------------|
| Brand: colours, fonts, shapes | The app's theme (`--coar-*` tokens, see [Theming](./theming.md)) |
| Colour scheme | The `dark-mode` class on the root element |
| Control sizes | The `coar-mobile` class |
| Layout in the available space | The size of the component's container — for example `CoarCalendar` and the month list view use CSS container queries, and the day view's multi-day variation derives its number of columns from the container width |
| Input behaviour: hover effects, drag engine | The input the browser reports — for example `CoarDataList` shows row hover only under `(hover: hover)`, and `useDragDrop` with `engine: 'auto'` uses its pointer engine on a coarse pointer |

Some cases:

- **A tablet with a mouse** in an app that sets `coar-mobile` keeps the mobile
  sizes. Whether hover effects appear depends on what the browser reports for
  the device (`(hover: hover)`), never on the class.
- **A narrow desktop window** does not get phone sizes. Only the class changes
  sizes; components whose container gets narrow adapt their layout where they
  support it.
- **A touch notebook** without the class keeps the desktop sizes. Touch works,
  but the controls are not enlarged.

## A mode, not a theme

Under `coar-mobile` the library's stylesheet sets only `--coar-control-*`
tokens (`packages/ui/styles/tokens/mobile.css`): heights, minimum target sizes,
the minimum editable font size and the visibility of clear buttons. Apart from
that, the input frame paints its border without taking layout space. No colour,
radius or font family changes, so a brand theme applies in both modes unchanged.

The control tokens are ordinary inherited custom properties, so the usual
cascade decides which value a control gets: the nearest ancestor that sets a
token wins, and on the same element the more specific selector, then the later
rule. There is no fixed order between the mode and a brand theme beyond that.

A brand that wants its own mobile sizes therefore sets them with a selector
that includes the class:

```css
/* brand and mode on the same element, e.g. <html class="my-brand coar-mobile"> */
.my-brand.coar-mobile {
  --coar-control-m-height: 56px;
}

/* a local mobile area inside the brand */
.my-brand .coar-mobile {
  --coar-control-m-height: 56px;
}
```

A brand rule without the class is the wrong tool: it either loses against
`.coar-mobile` or, where it wins, changes the desktop presentation too, because
the controls read these tokens in both modes.

## Supported controls

This is the first mobile-controls increment, not a mobile redesign of the entire
library.

| Component | Mobile presentation |
|-----------|---------------------|
| `CoarButton` | Size-dependent mobile heights (below), at least 44px width and 16px text; includes icon-only, loading, and link buttons |
| `CoarTextInput` | The same mobile height scale and at least 16px editable text, including multiline textareas |
| `CoarPasswordInput` | The same field floors, plus 44×44px clear/reveal targets |
| `CoarNumberInput` | The same field floors, plus 44×44px clear and stepper targets |
| `CoarCheckbox` | At least 48×48px clickable label, without enlarging the indicator |
| `CoarRadioButton` / `CoarRadioGroup` | At least 48×48px clickable option labels, without enlarging the indicators |
| `CoarSwitch` | At least 48×48px clickable label, without enlarging the track |

Text-input clear buttons also receive 44×44px targets. Clear buttons remain fully
opaque without hover or focus when a value can be cleared; empty fields retain
their hidden action slot to avoid layout jumps.

The existing `size` prop selects a different height scale in mobile mode instead
of collapsing every size to one minimum:

| Size | Desktop token height | Mobile height |
|------|----------------------|---------------|
| `xs` | 27px | 44px |
| `s` | 32px | 48px |
| `m` | 40px | 52px |
| `l` | 48px | 56px |

This scale applies to buttons and single-line text/password/number fields;
textareas can grow taller. Larger custom component heights are preserved.
The mobile input border is painted without taking layout space, so even an `xs`
field can contain 44px actions under a global `box-sizing: border-box` reset.
Rounded fields still have intentionally rounded hit regions.

A 16px editable font is intended to avoid the usual small-input focus zoom
on iOS, but actual keyboard and zoom behavior still requires device testing.

## Scope and themes

The mode inherits through ordinary DOM descendants, including `CoarThemeScope`.
It is independent of light/dark mode. Removing the class restores normal sizing
without remounting the controls or resetting their values. Desktop siblings
outside a local mobile parent are unaffected.

**Portaled content is not automatically part of a local mobile scope.** Overlays
teleported to `body` leave that parent's DOM subtree. Use `coar-mobile` on `body`
or `html` when supported controls inside overlays should also use the mode.
This increment does not add a mobile-context bridge for local overlays.

Date/time pickers, select panels, dialogs, OTP inputs, grids, and editors do not
have dedicated mobile presentations in this increment. In particular,
`CoarZonedDateTimePicker` does not yet switch to a sheet or a stepped mobile flow.

The class changes sizes only. A component without a mobile presentation keeps
its own layout in both modes (see [Device support](#device-support)); adapted
controls inside it, such as the buttons of a dialog, still take the mobile
sizes. A component that
needs a different pattern on a phone will get an explicit option for it; no
component changes its behaviour or layout pattern because the class is present.

## Customizing the floors

The mode sets inherited control tokens rather than changing the library's shared
desktop size tokens. Applications can override them locally:

```css
.my-mobile-form.coar-mobile {
  --coar-control-xs-height: 48px;
  --coar-control-s-height: 52px;
  --coar-control-m-height: 56px;
  --coar-control-l-height: 60px;
  --coar-control-min-font-size: 18px;
  --coar-control-min-target-size: 48px;
}
```

`--coar-control-min-size` separately controls the minimum clickable label size
for checkboxes, radios, and switches (48px by default).

Leave enough horizontal room for the field and its actions, especially for
password fields with both clear/reveal buttons and number fields with steppers.

The playground's `/mobile-controls` page demonstrates every size, local scope
switching, nested themes, textarea behavior, and non-editable states.

## Device support {#device-support}

Every component page states, under its title, how far it supports three device
classes:

- **Desktop** — mouse and keyboard.
- **Tablet** — touch without hover, in the default presentation.
- **Phone** — touch on a narrow screen, with `coar-mobile`.

Each class has one of four values:

| Value | Meaning |
|-------|---------|
| `ready` | Everything the page documents is reachable with that device's input and fits its width. On the phone an interactive component also needs a mobile presentation under `coar-mobile` that has left Preview. |
| `partial` | The main purpose works; the note on the page names the limit. |
| `planned` | Not adapted yet; an adaptation is planned. |
| `no` (shown as "not supported") | Not meant for this device. |

In a page's frontmatter this is one line, `devices: { desktop: ready, tablet: ready, phone: partial }`,
with a `devicesNote` when a value is `partial` or `no`.

The values state the result of design and code review. Automated touch tests
are only being added, and testing on real devices remains the job of the app.

**Form controls**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Button](../components/button.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Form Field](../components/form-field.md) | ready | ready | partial | Works on phones; the label and the status popover have no .coar-mobile presentation yet. |
| [Text Input](../components/text-input.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Number Input](../components/number-input.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Password Input](../components/password-input.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [OTP Input](../components/otp-input.md) | ready | ready | partial | Works on phones (numeric keyboard, SMS autofill) but has no .coar-mobile presentation yet. |
| [Select](../components/select.md) | ready | ready | planned | A phone presentation (sheet) is planned. |
| [Listbox](../components/listbox.md) | ready | partial | planned | Multi-highlight needs Ctrl/Shift-click or keys; drag on touch needs dragEngine 'pointer' or 'auto'. |
| [Dual Listbox](../components/dual-listbox.md) | ready | partial | planned | Move buttons work on touch; multi-highlight needs Ctrl/Shift, and drag needs dragEngine 'pointer'. |
| [Checkbox](../components/checkbox.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Checkbox Group](../components/checkbox-group.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Radio Group](../components/radio-group.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Switch](../components/switch.md) | ready | ready | partial | Mobile sizes under .coar-mobile; the mobile presentation is still Preview. |
| [Segmented Control](../components/segmented-control.md) | ready | ready | planned | A .coar-mobile presentation is planned. |
| [Date Picker](../components/date-picker.md) | ready | ready | planned | A phone presentation (sheet) is planned. |
| [DateTime Picker](../components/date-time-picker.md) | ready | ready | planned | A phone presentation (sheet) is planned. |
| [Zoned DateTime Picker](../components/zoned-date-time-picker.md) | ready | ready | planned | A phone presentation (sheet) is planned. |
| [Date · optional time](../components/date-or-time-picker.md) | ready | ready | planned | A phone presentation (sheet) is planned. |
| [Date Views](../components/date-views.md) | ready | ready | ready |  |

**Display**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Avatar](../components/avatar.md) | ready | ready | ready |  |
| [Badge](../components/badge.md) | ready | ready | ready |  |
| [Card](../components/card.md) | ready | ready | ready |  |
| [Code Block](../components/code-block.md) | ready | ready | partial | Readable and scrollable on phones; the copy and collapse buttons have no .coar-mobile presentation yet. |
| [Data List](../components/data-list.md) | ready | partial | planned | Item menus open on right-click and multi-select needs modifier keys, so both are hard to reach by touch. |
| [Divider](../components/divider.md) | ready | ready | ready |  |
| [Link](../components/link.md) | ready | ready | ready |  |
| [Note](../components/note.md) | ready | ready | ready |  |
| [Notice](../components/notice.md) | ready | ready | ready |  |
| [Progress Bar](../components/progress-bar.md) | ready | ready | ready |  |
| [Spinner](../components/spinner.md) | ready | ready | ready |  |
| [Table](../components/table.md) | ready | ready | partial | Wide tables need a scroll container from the host; nothing wraps them for narrow screens. |
| [Tag](../components/tag.md) | ready | partial | partial | The close button is a 10–14 px icon without a larger touch target. |

**Navigation**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Menu](../components/menu.md) | ready | ready | planned | Touch-sized rows for phones are planned. |
| [Context Menu](../components/context-menu.md) | ready | partial | planned | Opens on right-click; on touch that depends on the browser's long press, so offer your own trigger as well. |
| [Sidebar](../components/sidebar.md) | ready | partial | partial | Split-trigger flyouts open only on hover and icon-only labels are tooltips; no phone drawer. |
| [Navbar](../components/navbar.md) | ready | ready | partial | No collapsed or menu layout for narrow screens; slot content must fit the phone width. |
| [Tabs](../components/tabs.md) | ready | ready | partial | The tab bar neither scrolls nor wraps, so many tabs overflow phone widths. |
| [Tree](../components/tree.md) | ready | partial | not supported | Desktop-first: right-click menus, HTML5 drag and hover-revealed row actions are not tuned for touch. |
| [Breadcrumb](../components/breadcrumb.md) | ready | ready | partial | Crumbs wrap to fit narrow screens, but their link targets are not enlarged under .coar-mobile. |
| [Pagination](../components/pagination.md) | ready | ready | partial | Works on phones with fewer maxVisiblePages, but has no .coar-mobile presentation yet. |

**Layout**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Panel Layout](../components/panel-layout.md) | ready | partial | not supported | Resize dividers are 6 px wide and hard to hit by touch; the workbench layout is not meant for phones. |
| [Wizard](../components/wizard.md) | ready | ready | partial | Works on phones and the step indicator scrolls, but there is no .coar-mobile presentation yet. |

**Overlay**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Dialog](../components/dialog.md) | ready | ready | planned | Shrinks to the screen width on a phone; a sheet presentation for phones is planned. |
| [Popover](../components/popover.md) | ready | partial | planned | The default hover mode relies on emulated mouse events on touch; use mode 'click' or 'both'. |
| [Popconfirm](../components/popconfirm.md) | ready | ready | planned | Opens on tap; touch-sized popovers for phones are planned. |
| [Toast](../components/toast.md) | ready | ready | partial | Toasts are a fixed 380 px wide and overflow 360 px phone screens. |
| [Tooltip](../components/tooltip.md) | ready | partial | partial | Hints show on hover or focus, so touch users may not see them; keep essential information elsewhere. |

**Utilities**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Drag & Drop](../components/drag-drop.md) | ready | partial | partial | The default engine 'native' uses HTML5 drag events, made for the mouse; on touch use engine 'pointer' or 'auto'. |

**Content (@cocoar/vue-markdown, -editor, -form, -mermaid, @cocoar/vue-script-editor)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Markdown](../components/markdown.md) | ready | ready | partial | Wide tables get no horizontal scroll container and can overflow narrow screens. |
| [Markdown Editor](../components/markdown-editor.md) | ready | partial | partial | Typing and the toolbar work on touch; table row/column grips and the code-block edit button need hover. |
| [Markdown Form](../components/markdown-form.md) | ready | ready | partial | Works on phones; its select and date fields still open the desktop panels. |
| [Diagrams](../components/markdown-diagrams.md) | ready | partial | partial | With zoomable, touch zooms with the buttons but cannot pan a zoomed diagram. |
| [Mermaid Diagram](../components/mermaid.md) | ready | partial | partial | With zoomable, touch zooms with the buttons but cannot pan a zoomed diagram. |
| [Script Editor](../components/script-editor.md) | ready | partial | not supported | Monaco does not support mobile browsers; touch editing has gaps and phones are out of scope. |

**Data Grid (@cocoar/vue-data-grid)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Data Grid](../components/data-grid.md) | ready | partial | not supported | Touch scrolls and selects; editing starts with double-click and menus with right-click; not built for phones. |

**Page Builder (@cocoar/vue-page-builder)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [`<CoarPageBuilder>`](../components/page-builder/coar-page-builder.md) | ready | partial | not supported | Drag and drop works by touch; code editing uses Monaco, not made for touch; not meant for phones. |
| [`<CoarPageRenderer>`](../components/page-builder/coar-page-renderer.md) | ready | ready | partial | Responsive pages adapt to phone widths; its select and date fields still open desktop panels. |

**Document Viewer (@cocoar/vue-document-viewer)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Document Viewer](../components/document-viewer/index.md) | ready | partial | partial | Pinch zoom and drawing work on touch; marker/ink style flyouts open only on hover; not adapted to phones. |
| [CoarDocumentViewer](../components/document-viewer/coar-document-viewer.md) | ready | partial | partial | Pinch zoom and drawing work on touch; marker/ink style flyouts open only on hover; not adapted to phones. |
| [Annotations](../components/document-viewer/annotations.md) | ready | partial | partial | Drawing works with touch; marker and ink width and color open only on hover; not adapted to phones. |

**Map (@cocoar/vue-map)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Map](../components/map/index.md) | ready | ready | partial | Pan and zoom work by touch; the map's controls have no .coar-mobile presentation yet. |
| [Map Editor](../components/map/editor.md) | ready | partial | partial | Map editing works on touch; the point list's drag reorder is mouse-only and nothing is phone-adapted. |

**Calendar (@cocoar/vue-calendar)**

| Page | Desktop | Tablet | Phone | Note |
|---|---|---|---|---|
| [Calendar](../components/calendar/index.md) | ready | partial | planned | Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall. |
| [`<CoarCalendar>` — Composer](../components/calendar/coar-calendar.md) | ready | partial | planned | Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall. |
| [`<CoarYearView>` — Year View](../components/calendar/year-view.md) | ready | ready | planned | Tap to drill in works on touch; a phone presentation of the calendar is planned. |
| [Month Views](../components/calendar/month-view.md) | ready | partial | planned | Taps work on touch; multi-day bar resize handles are only 6 px and a touch on a pill always drags it. |
| [`<CoarDayView>` — Day View](../components/calendar/day-view.md) | ready | partial | planned | Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall. |
| [`<CoarWeekView>` — Week View](../components/calendar/week-view.md) | ready | partial | planned | Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall. |
| [`<CoarWorkWeekView>` — Work Week View](../components/calendar/work-week-view.md) | ready | partial | planned | Taps, swipe paging and long-press selection work on touch; event resize handles are only 6 px tall. |
| [Selecting time, drafts & bands](../components/calendar/time-selection.md) | ready | ready | planned | Long press selects on touch; the hover time indicator appears only for mouse and pen. |
| [`<CoarAgendaView>` — Agenda View](../components/calendar/agenda-view.md) | ready | ready | planned | Taps and scrolling work on touch; a phone presentation of the calendar is planned. |
| [`<CoarTimelineView>` — Timeline View](../components/calendar/timeline-view.md) | ready | ready | planned | Finger panning works like mouse panning; a phone presentation of the calendar is planned. |
