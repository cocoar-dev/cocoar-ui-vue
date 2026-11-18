<!-- Generated from apps/docs/guide/migration-color-roles.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Migrating text on saturated fills

Primary and danger buttons, filled badges, selection marks and other saturated
accent surfaces now read their own `--coar-text-on-accent|success|error|warning|info`
role (Preview). Without an override, APCA chooses pure white or black from the
fill. This applies even without a theme or Theme Editor.

The library's default fills keep white text. A custom bright accent may now use
black instead of white. APCA and WCAG contrast ratios are different; automatic
selection does not guarantee a WCAG ratio of 4.5:1.

`--coar-text-on-bold` still exists and keeps its previous meaning, but changing it
alone no longer overrides text on these saturated fills. Themes that previously
set it should set the relevant new roles explicitly to keep their chosen ink:

```css
.coar-theme--acme {
  --coar-text-on-accent: light-dark(#102a43, #f0f8ff);
  --coar-text-on-error: #ffffff;
}
```

One ink is used for normal, hover and pressed fills. Palette-derived text on
neutral or softly tinted surfaces, including links, notes and validation
messages, is unaffected. Calendar event-specific ink policies and explicit
event text colours continue to work as before.
