<!--docs:
title: "Feature Targeting"
layout: detail
section: components
excerpt: "Provides infrastructure to allow CSS styles to be included or excluded categorically."
path: /catalog/feature-targeting/
-->

# Feature Targeting

MDC Feature Targeting provides infrastructure to allow CSS styles to be included or excluded categorically.

Most of the time, you shouldn't need to depend on `mdc-feature-targeting` directly. However, understanding it can be useful if you're interested in having more control over when certain types of MDC styles are emitted.

## Installation

```
npm install @material/feature-targeting
```

## Basic Usage

### Styles

Authoring component styles:

```scss
@use "@material/feature-targeting";

@mixin my-component-core-styles($query: feature-targeting.all()) {
  $feat-structure: feature-targeting.create-target($query, structure);

  @include feature-targeting.targets($feat-structure) {
    // ...
  }
}
```

Consuming component styles:

```scss
@use "@material/feature-targeting";
@use "my-component-mixins";

// To include all styles (using the default of mdc-feature-all() defined above):
@include my-component-core-styles;

// Or, to include a specific subset of styles:
@include my-component-core-styles(structure);
@include my-component-core-styles(feature-targeting.any(color, typography));
// The above two @includes and the following @include would produce equivalent results:
@include my-component-core-styles(feature-targeting.without(animation));
```

## Sass Mixins and Functions

Mixin | Description
--- | ---
`targets($feature-targets...)` | Conditionalizes content to only be emitted if the given feature target(s) is/are queried.

Function | Description
--- | ---
`create-target($feature-query, $targeted-feature)` | Returns a variable to be passed to `targets` in order to filter emitted styles.
`all($feature-queries...)` | Returns a query object which will result in emitting `targets` blocks that match _all_ of the specified features. Passing no arguments results in all blocks being emitted, which is the most common use case.
`any($feature-queries...)` | Returns a query object which will result in emitting `targets` blocks that match _any_ of the specified features. Passing no arguments results in no blocks being emitted.
`without($feature-query)` | Returns a query object which will result in emitting `targets` blocks that do _not_ match the specified feature.

`$feature-query` and `$feature-queries` refer to one or more of the values listed below under Supported Features.

### Supported Features

MDC Web's styles are currently split according to the following features:

* `structure` - All baseline styles that don't fit into any other category
* `animation` - Styles responsible for causing animations and transitions to occur
* `color` - Color-specific styles which rely on `mdc-theme` variables
* `typography` - Typography-specific styles which rely on `mdc-typography`
