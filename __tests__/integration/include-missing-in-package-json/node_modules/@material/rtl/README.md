<!--docs:
title: "RTL"
layout: detail
section: components
excerpt: "Right-to-left and bi-directional text layout via SCSS helpers."
path: /catalog/rtl/
-->

# RTL

UIs for languages that are read from right-to-left (RTL), such as Arabic and Hebrew, should be mirrored to ensure content is easy to understand.

## Design & API Documentation

<ul class="icon-list">
  <li class="icon-list-item icon-list-item--spec">
    <a href="https://material.io/go/design-bidirectionality">Material Design guidelines: Bidirectionality</a>
  </li>
</ul>

## Installation

```
npm install @material/rtl
```

## Usage

### Sass Mixins

`mdc-rtl` is the most flexible mixin, because it can work with multiple CSS properties. All other RTL mixins logic could be engineered by only using `mdc-rtl`, but we provide these mixins for convenience.

Both `mdc-rtl-reflexive-property` and `mdc-rtl-reflexive-box` work with one base box-model property, e.g. margin, border, padding. But `mdc-rtl-reflexive-property` is more flexible because it accepts different left and right values. `mdc-rtl-reflexive-box` assumes the left and right values are the same, and therefore that the box-model is symmetrical.

`mdc-rtl-reflexive-position` is the least flexible mixin. It only works with one horizontal position property, "left" or "right". It also assumes the left and right values are the same.

| Mixin | Description |
| ----------------------------------------------- | - |
| `mdc-rtl($root-selector)` | Creates a rule that is applied when the root element is within an RTL context |
| `mdc-rtl-reflexive-box($base-property, $default-direction, $value, $root-selector)` | Applies the value to the `#{$base-property}-#{$default-direction}` property  in a LTR context, and flips the direction in an RTL context. **This mixin zeros out the original value in an RTL context.**  |
| `mdc-rtl-reflexive-property($base-property, $left-value, $right-value, $root-selector)` | Emits rules that assign `#{$base-property}`-left to `#{left-value}` and `#{base-property}`-right to `#{right-value}` in a LTR context, and vice versa in a RTL context. **Basically it flips values between a LTR and RTL context.** |
| `mdc-rtl-reflexive-position($position-property, $value, $root-selector)` | Applies the value to the specified position in a LTR context, and flips the direction in an RTL context. `$position-property` is a horizontal position, either "left" or "right". |
| `mdc-rtl-reflexive($left-property, $left-value, $right-property, $right-value, $root-selector)` | Applies the pair of property values to the specified position in a LTR context, and flips the direction in an RTL context. |

**A note about [dir="rtl"]**: `mdc-rtl($root-selector)` checks for `[dir="rtl"]` on the ancestor element. This works in most cases, it will sometimes lead to false negatives for more complex layouts, e.g.

```html
<html dir="rtl">
  <!-- ... -->
  <div dir="ltr">
    <div class="mdc-foo">Styled incorrectly as RTL!</div>
  </div>
</html>
```

Unfortunately, we've found that this is the best we can do for now. In the future, selectors such as [:dir](http://mdn.io/:dir) will help us mitigate this.
