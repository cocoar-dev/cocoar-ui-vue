# Link

Styled anchor elements with no wrapper component required -- just add CSS classes to native `<a>` tags. Use links for in-page navigation, external references, and any clickable text that isn't a button action.

```html
<!-- Import via @cocoar/vue-ui/styles -->
```

## Basic Link

The default style applies an accent color with an underline on hover, making links instantly recognizable in any context.

<preview path="./link/demos/LinkBasic.vue" />

## Variants

Use the `accent` variant (default) for primary navigation and calls to action. Switch to `subtle` when the link should blend into surrounding body text.

<preview path="./link/demos/LinkVariants.vue" />

## Sizes

Three size modifiers align with the typography scale, so links stay proportional whether they appear in footnotes or headings.

<preview path="./link/demos/LinkSizes.vue" />

## Disabled State

Combine the `aria-disabled` attribute with the disabled class to visually and semantically deactivate a link while keeping it in the DOM for accessibility.

<preview path="./link/demos/LinkDisabled.vue" />

## Inline Usage

Links are designed to sit naturally inside running prose without disrupting line height or text flow.

<preview path="./link/demos/LinkInline.vue" />

## API

### CSS Classes

| Class | Description |
|-------|-------------|
| `.coar-link` | Base link style — accent color, underline on hover |
| `.coar-link--subtle` | Subtle variant with less color emphasis |
| `.coar-link--sm` | Small text size |
| `.coar-link--lg` | Large text size |
| `.coar-link--disabled` | Disabled appearance (use with aria-disabled) |
