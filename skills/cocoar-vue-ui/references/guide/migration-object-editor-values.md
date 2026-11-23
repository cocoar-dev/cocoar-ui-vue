<!-- Generated from apps/docs/guide/migration-object-editor-values.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Migrating the Object Editor values

`@cocoar/vue-object-editor` now keeps values the way JSON Schema reads them. Before, an emptied value removed its
key, and `null`, `""`, `[]` and `{}` were treated as missing. Now they are values, and only **Remove value** in
the row's menu deletes a key.

## TL;DR

| If you… | …then you need to |
| --- | --- |
| Edit configuration or other sparse JSON | **Nothing.** `null` and empty values now survive editing. |
| Use the editor as a form where "empty" should mean "not filled in" | Pass `presence="filled"`: emptying removes the key, and an empty value fails `required`, as before. |
| Call `validateValue` and count `""` as missing for `required` | Pass `{ presence: 'filled' }` as the third argument. |
| Wrote a value control that emits `undefined` for "empty" | Emit the empty value itself (`""`, `[]`). Emit `undefined` only when the control cannot show a value at all (an emptied number field): the editor then writes `null` where the schema allows it, and otherwise keeps the value. |

## What changed

| | Before | Now (`presence="key"`) |
| --- | --- | --- |
| Emptied text | key removed | `""` |
| Emptied tag list | key removed | `[]` |
| Emptied number, date, choice | key removed | `null` when allowed, otherwise the value stays |
| `required` with `null` or `""` | fails | met |
| Removing a key | emptying the field | **Remove value** in the row's menu |
| `type: ["boolean", "null"]` | shown as a JSON value | Yes/no field with **Set to null** |

See [Values and absence](../components/object-editor.md#values-and-absence).

## Type ids

| Before | Now |
| --- | --- |
| `list` (array of objects, read-only) | `group-list` |
| — | `list`: an ordered array of single values, edited row by row |
| `tags` for any array of strings | `tags` for unique strings (`uniqueItems: true`); strings in order are a `list` |

A schema that names `x-coar-type: "list"` for an array of objects now asks for a list of single values: change it to
`group-list`, or remove `x-coar-type` and let the editor recognize the array.
