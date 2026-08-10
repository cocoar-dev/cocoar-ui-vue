---
description: "Migration guide for @cocoar/vue-page-builder 3.0: four PageConfig concepts removed, several names disambiguated, and documents migrated to schemaVersion 6."
---

# Migrating Page Builder to 3.0

This release is confined to `@cocoar/vue-page-builder`. Every other package is
untouched.

It removes four `PageConfig` concepts and renames several more. The removals all
answer the same question — *who does this protect, from whom?* — and the renames
all fix one word covering two things. The reasoning behind each is on the
[Authoring contract](/components/page-builder/authoring-contract) page.

**Your documents migrate themselves.** One document field changed
(`repeat.props.source`), and it is renamed on ingest like every earlier schema
migration. Nothing to do by hand.

## TL;DR

| If your `PageConfig` sets… | …then |
| --- | --- |
| `fields` | Rename to **`dataContract`**. |
| `elements` | Rename to **`elementTypes`**. |
| `availableStates` | Remove. Pass the state through `runtimeContext` and declare the field's `allowedValues` — see [§3](#_3-view-state-becomes-ordinary-context). |
| `previewFixtures` | Remove. Bind your own sample to `previewContext` — see [§4](#_4-preview-fixtures-become-host-chrome). |
| `stylePresets` | Remove. Styling is `NodeStyle`, `CoarTheme` and `visual-markup` — see [§1](#_1-style-presets-are-gone). |
| `requiredNodes` | Remove. Enforce it in your publication endpoint — see [§2](#_2-required-nodes-are-gone). |
| None of these | Check the [rename table](#_6-renamed-api) — you may still import a renamed symbol. |

---

## 1. Style presets are gone

Removed: `config.stylePresets`, `node.stylePreset`, the `PageStylePreset` type,
`findStylePreset()` and `isSafeStylePreset()`.

They let a host register named CSS classes for the author to pick by id. The
justification was that a page author must not put CSS into a page they do not
own — but a page author *does* own the realm their page renders in, so the
restriction protected nobody. The feature was also never finished: the Editor
canvas never applied the class, so picking a preset changed nothing until you
switched to Preview.

**What to use instead.** Styling has three channels and always did:

| Want | Use |
| --- | --- |
| Per-node appearance | `NodeStyle` — surface, typography, layout, box |
| Brand colours, radii, fonts | `CoarTheme` via `CoarThemeScope` / `previewTheme` |
| Free-form decoration | The `visual-markup` element (sealed iframe, free CSS) |

A leftover `stylePreset` key in a stored document is **reported as an authoring
warning, never stripped**. The renderer ignores it and emits no class from it.

## 2. Required nodes are gone

Removed: `config.requiredNodes` (with `lockVisibility`, `lockStyle`, `parentId`
and `maxIndex`).

It pinned a node as present, placed and visually untouchable. Besides the
ownership argument above, it did not work: a node carrying both locks still
disappeared when the container **above** it was hidden, and
`validatePageDocument()` reported the document as valid.

**What to use instead.** Enforce it where activation happens. Your publish
endpoint already validates the document before a revision goes live; a check
there cannot be bypassed from the browser, which was never true of the config
flag.

```ts
// in the publish endpoint, on the document about to become active
if (!containsVisibleNode(document, 'legal-notice')) {
  return reject('The legal notice must stay on the page.');
}
```

The builder no longer withholds delete, move or the drag grip from any node.

## 3. View state becomes ordinary context

Removed: `config.availableStates`, `<CoarPageRenderer>`'s `viewState` prop,
`<CoarPageBuilder>`'s `previewState` prop, `visibleWhen.source: 'state'`, and
`page.viewState` in the code scope.

The host's "which screen is this right now" was a second mechanism for something
`runtimeContext` already carried. Note that **Page State is untouched**:
`definePageState`, `page.state` and `source: 'state'` *bindings* all keep working
— they mean the page author's own shared data, and losing the name collision is
part of the point.

**Before**

```ts
const config: PageConfig = {
  availableStates: [{ id: 'prompt', label: 'Prompt' }, { id: 'expired', label: 'Expired' }],
};
```
```vue
<CoarPageRenderer :schema :config :view-state="viewState" />
```

**After**

```ts
const config: PageConfig = {
  contextFields: [
    { path: 'runtime.viewState', type: 'string', allowedValues: ['prompt', 'expired'] },
  ],
};
```
```vue
<CoarPageRenderer :schema :config :runtime-context="{ runtime: { viewState } }" />
```

`allowedValues` is new: a context field that declares it gets a **dropdown** in
the condition editor instead of a free-text box — which is what
`availableStates` used to provide, now available to every enumerable field.

Documents using `visibleWhen: { source: 'state', … }` must move to
`{ source: 'context', path: 'runtime.viewState', operator: 'equals', value: … }`,
or express the condition in Element Code.

## 4. Preview fixtures become host chrome

Removed: `config.previewFixtures` and the `PagePreviewFixture` type.

A fixture was a named bundle of `{ context, state, locale, viewport }` plus a
dropdown in the builder toolbar — but the host already owns `previewContext` and
`previewLocale`. The only thing the config added was the builder drawing the
picker, and the host is the one who knows what "empty" or "50 items" means for
its own data.

```vue
<!-- your own picker, bound to the props you already pass -->
<select v-model="sample">…</select>
<CoarPageBuilder v-model="schema" :config :preview-context="samples[sample]" :preview-locale="locale" />
```

The preview now runs when the host supplies the inputs its own `config`
declares (`contextFields`, `locales`), and otherwise says so rather than
rendering against invented data.

## 5. Auth presets are gone

Removed: `createAuthPageConfig()` and `createAuthPageDocument()`.

The package ships nothing auth-specific. An IDP owns its own `PageConfig` and
starting documents; `apps/playground/src/views/auth-customization/` in this
repository is a worked example of all four slots.

## 6. Renamed API

Mechanical, and a search-and-replace covers all of them.

| Before | After |
| --- | --- |
| `config.fields` | `config.dataContract` |
| `config.elements` | `config.elementTypes` |
| `PAGE_ELEMENTS_KEY` | `PAGE_ELEMENT_TYPES_KEY` |
| `useSchemaValidation()` | `useAuthoringFindings()` — returns `{ findings, byNodeId }`, not `{ issues, … }` |
| `ValidationIssue` | `AuthoringFinding` |
| `IssueSeverity` | `FindingSeverity` |
| `@validation` event | `@findings` |
| `PageVisualFont.source` | `PageVisualFont.src` |
| `repeat.props.source` | `repeat.props.contextPath` *(auto-migrated)* |

Each pair existed because one word covered two things: `fields` was both the DTO
contract and the live values, `elements` was both the type registry and this
page's nodes, `validation` covered field rules, the activation contract **and**
the builder's authoring hints, and `source` was an enum, a context path and a
data URL at once. `binding.source` keeps the name — it is the dominant meaning.

## 7. Documents move to `schemaVersion: 6`

The only document change is the repeat rename, applied by
`migrateRepeatContextPath` on the same ingest path as every earlier migration —
identity-preserving, idempotent, and skipped when the new key is already there.
It runs on `v-model` assignment, on the initial value and on the JSON tab's
Apply, so a stored v5 document opens and renders unchanged.

Persist the version as-is; a document saved by 3.0 comes back stamped `6`.

## Also worth knowing

Not breaking, but new in the same release:

- **`@findings`** mirrors the builder's authoring findings to the host, so a
  save button can grey out on errors. `useAuthoringFindings()` is exported for
  the same check outside a mounted builder.
- **`previewInitialValues`** starts the embedded preview from host values,
  merged over the authored `defaultValue`s — the edit-form case, and the case
  where a default is computed per tenant.
- **The page is exactly its host container.** Size values on the page root are
  dropped and the root offers no size fields; the container owns the box. Its
  contract is that the container must have a determinable height — for `body`,
  `html, body { height: 100% }`. A document that set a root size is told so.
- **Quick Properties resolve per breakpoint.** They showed the base value while
  the canvas rendered the resolved one; an inherited value now also names the
  override it came from.
