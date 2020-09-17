<!--docs:
title: "Typography"
layout: detail
section: components
excerpt: "Typographic scale that handles a set of type sizes"
iconId: typography
path: /catalog/typography/
-->

# Typography

Material Design's text sizes and styles were developed to balance content density and reading comfort under typical usage conditions.

MDC Typography is a foundational module that applies these styles to MDC Web components. The typographic styles in this module are derived from thirteen styles:

* Headline 1
* Headline 2
* Headline 3
* Headline 4
* Headline 5
* Headline 6
* Subtitle 1
* Subtitle 2
* Body 1
* Body 2
* Caption
* Button
* Overline

## Design & API Documentation

<ul class="icon-list">
  <li class="icon-list-item icon-list-item--spec">
    <a href="https://material.io/go/design-typography">Material Design guidelines: Typography</a>
  </li>
  <li class="icon-list-item icon-list-item--link">
    <a href="https://material-components.github.io/material-components-web-catalog/#/component/typography">Demo</a>
  </li>
</ul>

## Installation

```
npm install @material/typography
```

## Basic Usage

### HTML Structure

We recommend using Roboto from Google Fonts:

```html
<head>
  <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
</head>
<body class="mdc-typography">
  <h1 class="mdc-typography--headline1">Big header</h1>
</body>
```

### Styles

```css
@use "@material/typography/mdc-typography";
```

## Style Customization

### Typography styles

The typography styles (referred to as `<STYLE>` below) used in the type system:

Scale | Description
--- | ---
`headline1` | The largest text on the screen, reserved for short, important text or numerals
`headline2` | Headline variant 2
`headline3` | Headline variant 3
`headline4` | Headline variant 4
`headline5` | Headline variant 5
`headline6` | Headline variant 6
`subtitle1` | Smaller than headline, reserved for medium-emphasis text that is shorter in length
`subtitle2` | Subtitle variant 2
`body1` | Used for long-form writing
`body2` | Body variant 2
`caption` | Used sparingly to annotate imagery
`button` | A call to action used by different types of buttons
`overline` | Used sparingly to introduce a headline

### CSS Classes

Some components have a set typographic style. For example, a raised MDC Card uses Body 1, Body 2, and Headline styles.

If you want to set the typographic style of an element, which is not a Material Design component, you can apply the following CSS classes.

CSS Class | Description
--- | ---
`mdc-typography` | Sets the font to Roboto
`mdc-typography--<STYLE>` | Sets font properties as STYLE. Please see [Typography styles section](#typography-styles)

For example, the `headline1` style as a CSS class would be `mdc-typography--headline1`.

### CSS Custom Properties

CSS Custom property | Description
--- | ---
`--mdc-typography-font-family` | The base font-family
`--mdc-typography-<STYLE>-font-family` | The font-family for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-font-size` | The font-size for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-line-height` | The line-height for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-font-weight` | The font-weight for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-letter-spacing` | The letter-spacing for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-text-decoration` | The text-decoration for STYLE. Please see [Typography styles section](#typography-styles)
`--mdc-typography-<STYLE>-text-transform` | The text-transform for STYLE. Please see [Typography styles section](#typography-styles)

### Sass Variables and Mixins

Mixin | Description
--- | ---
`base` | Sets the font to Roboto
`typography($style)` | Applies one of the typography styles, including setting the font to Roboto
`smooth-font` | Adds antialiasing for typography
`overflow-ellipsis` | Truncates overflow text to one line with an ellipsis
`baseline($top, $bottom, $display)`| Sets a container's baseline that text content will align to.
`zero-width-prefix` | Adds an invisible, zero-width prefix to a container's text. This ensures that the baseline is always where the text would be, instead of defaulting to the container bottom when text is empty. Do not use this mixin if the `baseline` mixin is already applied.
`text-baseline($top, $bottom, $display)`| Sets the baseline of flow text content.

> **A note about `overflow-ellipsis`**, `overflow-ellipsis` should only be used if the element is `display: block` or `display: inline-block`.

#### `$style` Values

These styles can be used as the `$style` argument for the `mdc-typography` mixin.

* `headline1`
* `headline2`
* `headline3`
* `headline4`
* `headline5`
* `headline6`
* `subtitle1`
* `subtitle2`
* `body1`
* `body2`
* `caption`
* `button`
* `overline`

#### Overriding Styles

All styles can be overridden using CSS custom properties or Sass module/global variables.

When using Sass **module** variables, the module must be configured _before_ any other `@use` 
statements with a variable named `$styles-{style}`. The variable should be assigned to a map 
that contains all the properties you want to override for a particular style.

When using Sass **global** variables, they must be defined _before_ the component is imported by setting a global 
variable named `$mdc-typography-styles-{style}`.

**Example:** Overriding the button `font-size` and `text-transform` properties.

CSS custom properties:

```css
html {
  --mdc-typography-button-font-size: 16px;
  --mdc-typography-button-text-transform: 16px;
}
```

Sass module variables:

```scss
@use "@material/typography" with (
  $styles-button: (
    font-size: 16px,
    text-transform: none,
  )
);

@use "@material/button";
@include button.core-styles;
```

Sass global variables:

```scss
$mdc-typography-styles-button: (
  font-size: 16px,
  text-transform: none,
);

@import "@material/button/mdc-button";
```

**Example:** Overriding the global `font-family` property.

CSS custom properties:

```css
html {
  --mdc-typography-font-family: Arial, Helvetica, sans-serif;
}
```

Sass module variables:

```scss
@use "@material/typography" with (
  $font-family: unquote("Arial, Helvetica, sans-serif")
);

@use "@material/button";
@include button.core-styles;
```

Sass global variables:

```scss
$mdc-typography-font-family: unquote("Arial, Helvetica, sans-serif");

@import "@material/button/mdc-button";
```

**Example:** Overriding the `font-family` property for `headline1` and `font-family` and `font-size` for `headline2`.

CSS custom properties:

```css
html {
  --mdc-typography-headline1-font-family: Arial, Helvetica, sans-serif;
  --mdc-typography-headline2-font-family: Arial, Helvetica, sans-serif;
  --mdc-typography-headline2-font-size: 3.25rem;
}
```

Sass module variables:

```scss
@use "@material/typography" with (
  $styles-headline1: (
    $font-family: unquote("Arial, Helvetica, sans-serif")
  ),
  $styles-headline2: (
    $font-family: unquote("Arial, Helvetica, sans-serif"),
    $font-size: 3.25rem
  )
);

@use ...
```

Sass global variables:

```scss
$mdc-typography-styles-headline1: (
  font-family: unquote("Arial, Helvetica, sans-serif")
);
$mdc-typography-styles-headline2: (
  font-family: unquote("Arial, Helvetica, sans-serif"),
  font-size: 3.25rem
);

@import ...
```
