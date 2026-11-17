# Design-review inventory

`inventory.json` lists every visible source of every package in `packages/` (not `dist/`, `node_modules/`, build
output or tests), so the compact-presentation review can prove nothing was skipped. It is checked by
`apps/playground/scripts/design-review.mjs`; nothing in the libraries depends on it.

```sh
node apps/playground/scripts/design-review.mjs             # summary per package
node apps/playground/scripts/design-review.mjs --check     # completeness check (exit 1 on drift or invalid records)
node apps/playground/scripts/design-review.mjs --complete  # strict final gate: --check + nothing pending
node apps/playground/scripts/design-review.mjs --update    # add/refresh entries from the sources (--prune drops removed ones)
node --test apps/playground/scripts/design-review.test.mjs # tests, on temporary fixture trees
```

`--root <dir>` and `--inventory <file>` point the script elsewhere; by default it uses the repository it lives in.

## What is scanned

Every package with a `package.json`, recursively, including folders outside `src/` (`styles/`, `bin/`, `lib/`,
`scripts/`): `.vue`, stylesheets, `.svg`, and TS/JS files.

| Kind            | Meaning                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue-component` | Every `.vue` file, nested ones included.                                                                                                                                                                      |
| `stylesheet`    | Every CSS/SCSS/LESS file.                                                                                                                                                                                     |
| `svg-asset`     | Every `.svg` file.                                                                                                                                                                                            |
| `ts-visual`     | A TS/JS file with a visual signal: style injection, inline styles, `--coar-*` tokens, SVG, DOM creation, render functions, `getComputedStyle`, class names, color or pixel/font-size literals (`signals` lists them). |
| `third-party`   | One entry per third-party UI library (ag-grid, leaflet, pdfjs, monaco, milkdown, overlayscrollbars, mermaid, prismjs), `owners` are the files importing it. The list is `THIRD_PARTY` in the library.         |

Every other TS/JS file is **nonvisual** and listed per package in `nonvisual` with a reason, so a new file still
shows up as drift. `exposure` (`public`/`internal`) comes from the export map, `bin` and the `export … from`
chains of the barrels; `publicExports` repeats the manifests' export map with the files that own each target.

## An entry

```json
{
  "id": "packages/ui/src/components/select/CoarSelectDropdownPanel.vue",
  "kind": "vue-component",
  "package": "packages/ui",
  "source": "packages/ui/src/components/select/CoarSelectDropdownPanel.vue",
  "exposure": "internal",
  "signals": [],
  "decision": "pending",
  "tokenRoles": [],
  "states": [{ "name": "open", "status": "pending" }],
  "scenario": "",
  "checks": { "desktop": "pending", "mobile": "pending", "light": "pending", "dark": "pending" },
  "reasons": {},
  "notes": "",
  "evidence": [{ "type": "story", "ref": "apps/playground/src/visual/stories/compact-select-open.vue" }]
}
```

The fields up to `signals` (plus `owners` for third-party entries) are derived: `--update` rewrites them and
`--check` reports them as stale. The rest is review data that `--update` keeps.

- `decision`: `pending`, `implemented`, or `reviewed-unchanged` (needs a concrete reason in `notes`). Both need evidence.
- `checks.*`: `pending`, `pass`, `fail`, or `not-applicable` (needs `reasons.<key>`).
- `states[]`: `pending`, `reviewed`, or `not-applicable` (needs `reason`).
- `evidence[]`: `{ "type", "ref", "summary"? }`; `story`, `test`, `audit` and `screenshot` refs are repository paths
  that must exist (`path#anchor` is fine), `note`, `commit` and `pr` are free text. Blank refs are errors.
- A file that is not a visual surface in spite of its signals, or a visual file that is deliberately out of scope,
  goes into a `nonvisual` group with `"explicit": true` and its own reason; remove its entry.

## Check versus gate

`--check` proves the inventory matches the sources and every record is well formed; pending work is allowed. It
reports added/removed sources, packages and public exports, stale derived fields, invalid decisions, checks,
states or evidence, and decisions without proof. `--complete` also fails on every pending decision, check or
state, and on blank `scenario` or empty `tokenRoles`. A review is finished only when `--complete` passes.

The inventory also stores a SHA-256 `sourceRevision` of package sources, manifests and the lockfile. Even a
value-only edit invalidates previous proof. `--update` keeps notes and evidence as history but resets the check
matrix and reviewed states to pending when that revision changes. Repeat the affected checks before closing
the ledger. The final gate also rejects an empty state list: explicitly name the applicable states, or record
why states do not apply to a source.
