<!--docs:
title: "Shape"
layout: detail
section: components
excerpt: "Shapes direct attention, identify components, communicate state, and express brand."
path: /catalog/shape/
-->

# Shape

Shapes direct attention, identify components, communicate state, and express brand.

> Currently shape system for web only supports rounded corners.

## Design & API Documentation

<ul class="icon-list">
  <li class="icon-list-item icon-list-item--spec">
    <a href="https://material.io/go/design-shape">Material Design guidelines: Shape</a>
  </li>
</ul>

## Installation

```
npm install @material/shape
```

## Basic Usage

### Styles

```scss
@import "@material/shape/mixins";
@import "@material/shape/functions";
```

## Style Customization

### Sass Variables

Components are categorized as small, medium and large in shape system. Overriding below sass variables applies shape (rounded) to respective categories. For example, overriding `$mdc-shape-medium-radius` variable would apply shape to all components that belong to medium category.

Variable | Description
--- | ---
`$mdc-shape-small-component-radius` | Rounded shape radius size for small components. Default value `4px`.
`$mdc-shape-medium-component-radius` | Rounded shape radius size for medium components. Default value `4px`.
`$mdc-shape-large-component-radius` | Rounded shape radius size for large components. Default value `0`.

Please refer [Material Design guidelines: Shape](https://material.io/go/design-shape) to learn about how components are categorized.

### Sass Mixins

Mixin | Description
--- | ---
`mdc-shape-radius($radius, $rtl-reflexive)` | Shape API used by all other components to apply radius to appropriate corners. `$radius` can be single value or list of up to 4 radius corner values. Set `$rtl-reflexive` to true to flip the radius in RTL case, `false` by default.

> Use `mdc-shape-resolve-percentage-radius` sass function to resolve percentage unit value to absolute radius value.

### Sass Functions

Function | Description
--- | ---
`mdc-shape-flip-radius($radius)` | Flips the radius values in RTL context. `$radius` is list of 2-4 corner values.
`mdc-shape-resolve-percentage-radius($component-height, $radius)` | Calculates the absolute radius value based on its component height. Use this for fixed height components only.
`mdc-shape-mask-radius($radius, $masked-corners)` | Accepts radius number or list of 2-4 radius values and returns 4 value list with masked corners as mentioned in `$masked-corners`.
`mdc-shape-prop-value($radius)` | Returns `$radius` value of shape category - `large`, `medium` or `small`. Otherwise, it returns the `$radius` itself if valid. `$radius` can be a single value or list of up to 4.

### Additional Information

#### Shapes for fixed height components

Styles for applying shape to a fixed height component such as button looks like this:

```scss
@include mdc-shape-radius(mdc-shape-resolve-percentage-radius($mdc-button-height, $radius));
```

Where, `$mdc-button-height` is the height of standard button and `$radius` is the size of shape. `mdc-shape-resolve-percentage-radius` function is used to resolve percentage unit value to absolute `$radius` value based on component height.

#### Shapes for dynamic height components

Styles for applying shapes to dynamic height component such as card looks like this:

```scss
@include mdc-shape-radius($radius);
```

Where, `$radius` is absolute value only.

#### Shapes for components on specific corners

Styles for applying shapes for specific corners such as drawer looks like this:

```scss
@include mdc-shape-radius(0 $radius $radius 0, $rtl-reflexive: true);
```

Where, only top-right & bottom-right corners are customizable and it automatically flips radius values based on RTL context when `$rtl-reflexive` is set to true.

#### Component theming

The styles for applying custom shape to button component instance looks like this:

```scss
@import "@material/button/mixins";

.my-custom-button {
  @include mdc-button-shape-radius(50%);
}
```

In this example, the above styles applies 50% (pill) shape to button. It can also be absolute value (e.g., `8px`);

> You would indirectly use the Shape API through respective component's mixin which takes care of applying radius to applicable corners for all its variants.
