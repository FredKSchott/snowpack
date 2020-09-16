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
@use "@material/shape";
```

## Style Customization

### Sass Variables

Components are categorized as small, medium, and large in the Material shape system. Overriding the below Sass variables will change all components in their respective categories.

Variable | Description
--- | ---
`$small-component-radius` | Rounded shape radius size for small components. Default value `4px`.
`$medium-component-radius` | Rounded shape radius size for medium components. Default value `4px`.
`$large-component-radius` | Rounded shape radius size for large components. Default value `0`.

Please refer [Material Design guidelines: Shape](https://material.io/go/design-shape) to learn about how components are categorized.

**Note: Only rounded shape designs are currently supported.**

### CSS Custom Properties

CSS Custom Property | Description
--- | ---
`--mdc-shape-small` | Rounded shape radius size for small components. Default value `4px`.
`--mdc-shape-medium` | Rounded shape radius size for small components. Default value `4px`.
`--mdc-shape-large` | Rounded shape radius size for small components. Default value `0`.

**Note: Do not use percentage values with custom properties, since they cannot be resolved by `shape.radius()` at runtime.**

### Sass Mixins

Mixin | Description
--- | ---
`radius($radius, $rtl-reflexive)` | Shape API used by all other components to apply radius to appropriate corners. `$radius` can be single value or list of up to 4 radius corner values. Set `$rtl-reflexive` to true to flip the radius in RTL case, `false` by default.

### Sass Functions

Function | Description
--- | ---
`resolve-radius($radius, $component-height)` | Returns the resolved radius value of a shape category - `large`, `medium`, or `small`. If $radius is not a category, this function returns the value itself if valid. Valid values are numbers or percentages. `$component-height` should be provided if `$radius` may be a percentage.
`flip-radius($radius)` | Flips the radius values in RTL context. `$radius` is list of 2-4 corner values.
`mask-radius($radius, $masked-corners)` | Accepts radius number or list of 2-4 radius values and returns 4 value list with masked corners as mentioned in `$masked-corners`.
`unpack-radius($radius)` | Unpacks shorthand values for border-radius (i.e. lists of 1-3 values). If a list of 4 values is given, it is returned as-is.

### Additional Information

#### Shapes for fixed height components

Styles for applying shape to a fixed height component such as button looks like this:

```scss
@use "@material/button";

@include shape.radius($radius, $component-height: button.$height);
```

Where `button.$height` is the height of standard button and `$radius` is the size of the shape. `shape.radius()` will resolve any percentage unit value to an absolute radius value based on the component's height.

#### Shapes for dynamic height components

Styles for applying shapes to dynamic height component such as card looks like this:

```scss
@include shape.radius($radius);
```

Where `$radius` is an absolute value only.

#### Shapes for components on specific corners

Styles for applying shapes for specific corners such as drawer looks like this:

```scss
@include shape.radius(0 $radius $radius 0, $rtl-reflexive: true);
```

Where only top-right & bottom-right corners are customizable. `shape.radius()` will automatically flip radius values based on RTL context if `$rtl-reflexive` is set to true.

#### Component theming

The styles for applying custom shape to a button component looks like this:

```scss
@use "@material/button";

.my-custom-button {
  @include button.shape-radius(50%);
}
```

In this example, the above style applies a 50% pill shape to the button. It could also be an absolute value (e.g., `8px`);

> The Shape API is typically used indirectly through each respective component's mixin, which takes care of setting height and applying radius to applicable corners for all of its variants.
