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
@import "@material/typography/mdc-typography";
```

## Style Customization

### CSS Classes

Some components have a set typographic style. For example, a raised MDC Card uses Body 1, Body 2, and Headline styles.

If you want to set the typographic style of an element, which is not a Material Design component, you can apply the following CSS classes.

CSS Class | Description
--- | ---
`mdc-typography` | Sets the font to Roboto
`mdc-typography--headline1` | Sets font properties as Headline 1
`mdc-typography--headline2` | Sets font properties as Headline 2
`mdc-typography--headline3` | Sets font properties as Headline 3
`mdc-typography--headline4` | Sets font properties as Headline 4
`mdc-typography--headline5` | Sets font properties as Headline 5
`mdc-typography--headline6` | Sets font properties as Headline 6
`mdc-typography--subtitle1` | Sets font properties as Subtitle 1
`mdc-typography--subtitle2` | Sets font properties as Subtitle 2
`mdc-typography--body1` | Sets font properties as Body 1
`mdc-typography--body2` | Sets font properties as Body 2
`mdc-typography--caption` | Sets font properties as Caption
`mdc-typography--button` | Sets font properties as Button
`mdc-typography--overline` | Sets font properties as Overline

### Sass Variables and Mixins

Mixin | Description
--- | ---
`mdc-typography-base` | Sets the font to Roboto
`mdc-typography($style)` | Applies one of the typography styles, including setting the font to Roboto
`mdc-typography-overflow-ellipsis` | Truncates overflow text to one line with an ellipsis
`mdc-typography-baseline-top($distance)` | Sets the baseline height of a text element from top.
`mdc-typography-baseline-bottom($distance)` | Sets the distance from text baseline to bottom. This mixin should be combined with `mdc-typography-baseline-top` when setting baseline distance to following text element.

> **A note about `mdc-typography-overflow-ellipsis`**, `mdc-typography-overflow-ellipsis` should only be used if the element is `display: block` or `display: inline-block`.

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

All styles can be overridden using Sass global variables _before_ the component is imported by setting a global 
variable named `$mdc-typography-styles-{style}`. The variable should be assigned a map that contains all the properties
you want to override for a particular style.

Example: Overriding the button `font-size` and `text-transform` properties.

```scss
$mdc-typography-styles-button: (
  font-size: 16px,
  text-transform: none,
);

@import "@material/button/mdc-button";
```

Example: Overriding the global `font-family` property. 
```scss
$mdc-typography-font-family: unquote("Arial, Helvetica, sans-serif");

...
@import ...
```

Example: Overriding the `font-family` property for `headline1` and `font-family` and `font-size` for `headline2`.
```scss
$mdc-typography-styles-headline1: (
  font-family: unquote("Arial, Helvetica, sans-serif")
);
$mdc-typography-styles-headline2: (
  font-family: unquote("Arial, Helvetica, sans-serif"),
  font-size: 3.25rem
);

...
@import ...
```
