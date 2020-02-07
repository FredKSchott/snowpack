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
@import "@material/feature-targeting/functions";
@import "@material/feature-targeting/mixins";

@mixin my-component-core-styles($query: mdc-feature-all()) {
  $feat-structure: mdc-feature-create-target($query, structure);

  @include mdc-feature-targets($feat-structure) {
    // ...
  }
}
```

Consuming component styles:

```scss
@import "@material/feature-targeting/functions";
@import "my-component-mixins";

// To include all styles (using the default of mdc-feature-all() defined above):
@include my-component-core-styles;

// Or, to include a specific subset of styles:
@include my-component-core-styles(structure);
@include my-component-core-styles(mdc-feature-any(color, typography));
// The above two @includes and the following @include would produce equivalent results:
@include my-component-core-styles(mdc-feature-without(animation));
```

## Sass Mixins and Functions

Mixin | Description
--- | ---
`mdc-feature-targets($feature-targets...)` | Conditionalizes content to only be emitted if the given feature target(s) is/are queried.

Function | Description
--- | ---
`mdc-feature-create-target($feature-query, $targeted-feature)` | Returns a variable to be passed to `mdc-feature-targets` in order to filter emitted styles.
`mdc-feature-all($feature-queries...)` | Returns a query object which will result in emitting `mdc-feature-targets` blocks that match _all_ of the specified features. Passing no arguments results in all blocks being emitted, which is the most common use case.
`mdc-feature-any($feature-queries...)` | Returns a query object which will result in emitting `mdc-feature-targets` blocks that match _any_ of the specified features. Passing no arguments results in no blocks being emitted.
`mdc-feature-without($feature-query)` | Returns a query object which will result in emitting `mdc-feature-targets` blocks that do _not_ match the specified feature.

`$feature-query` and `$feature-queries` refer to one or more of the values listed below under Supported Features.

### Supported Features

MDC Web's styles are currently split according to the following features:

* `structure` - All baseline styles that don't fit into any other category
* `animation` - Styles responsible for causing animations and transitions to occur
* `color` - Color-specific styles which rely on `mdc-theme` variables
* `typography` - Typography-specific styles which rely on `mdc-typography`
