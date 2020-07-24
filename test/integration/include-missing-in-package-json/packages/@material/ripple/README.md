<!--docs:
title: "Ripples"
layout: detail
section: components
excerpt: "Ink ripple touch feedback effect."
iconId: ripple
path: /catalog/ripples/
-->

# Ripple

MDC Ripple provides the JavaScript and CSS required to provide components (or any element at all) with a material "ink ripple" interaction effect. It is designed to be efficient, uninvasive, and usable without adding any extra DOM to your elements.

MDC Ripple also works without JavaScript, where it gracefully degrades to a simpler CSS-Only implementation.

## Design & API Documentation

<ul class="icon-list">
  <li class="icon-list-item icon-list-item--spec">
    <a href="https://material.io/go/design-states">Material Design guidelines: States</a>
  </li>
  <li class="icon-list-item icon-list-item--link">
    <a href="https://material-components.github.io/material-components-web-catalog/#/component/ripple">Demo</a>
  </li>
</ul>

## Installation

```
npm install @material/ripple
```

## Usage

A ripple can be applied to a variety of elements to represent interactive surfaces. Several MDC Web components, such as Button, FAB, Checkbox and Radio, also use ripples.

A ripple can be added to an element through either a JavaScript or CSS-only implementation. When a ripple is initialized on an element using JS, it dynamically adds a `mdc-ripple-upgraded` class to that element. If ripple JS is not initialized but Sass mixins are included on the element, the ripple uses a simpler CSS-only implementation which relies on the `:hover`, `:focus`, and `:active` pseudo-classes.

### CSS Classes

CSS Class | Description
--- | ---
`mdc-ripple-surface` | Adds a ripple to the element
`mdc-ripple-surface--primary` | Sets the ripple color to the theme primary color
`mdc-ripple-surface--accent` | Sets the ripple color to the theme secondary color

### Sass APIs

In order to fully style the ripple effect for different states (hover/focus/pressed), the following mixins must be included:

* `surface`, for base styles
* Either `radius-bounded` or `radius-unbounded`, to appropriately size the ripple on the surface
* Either the basic or advanced `states` mixins, as explained below

##### Using basic states mixins
```css
@use "@material/ripple";

.my-surface {
  @include ripple.surface;
  @include ripple.radius-bounded;
  @include ripple.states;
}
```

##### Using advanced states mixins
```css
.my-surface {
  @include ripple.surface;
  @include ripple.radius-bounded;
  @include ripple.states-base-color(black);
  @include ripple.states-opacities((hover: .1, focus: .3, press: .4));
}
```

These APIs use pseudo-elements for the ripple effect: `::before` for the background, and `::after` for the foreground.

#### Ripple Mixins

Mixin | Description
--- | ---
`surface` | Mandatory. Adds base styles for a ripple surface
`radius-bounded($radius)` | Adds styles for the radius of the ripple effect,<br>for bounded ripple surfaces
`radius-unbounded($radius)` | Adds styles for the radius of the ripple effect,<br>for unbounded ripple surfaces

> _NOTE_: It is mandatory to include _either_ `radius-bounded` or `radius-unbounded`. In both cases, `$radius` is optional and defaults to `100%`.

#### Basic States Mixins

Mixin | Description
--- | ---
`states($color, $has-nested-focusable-element)` | Mandatory. Adds state and ripple styles in the given color
`states-activated($color, $has-nested-focusable-element)` | Optional. Adds state and ripple styles for activated states in the given color
`states-selected($color, $has-nested-focusable-element)` | Optional. Adds state and ripple styles for selected states in the given color

> _NOTE_: Each of the mixins above adds ripple styles using the indicated color, deciding opacity values based on whether the passed color is light or dark.

> _NOTE_: The `states-activated` and `states-selected` mixins add the appropriate state styles to the root element containing `&--activated` or `&--selected` modifier classes respectively.

> _NOTE_: `$has-nested-focusable-element` defaults to `false` but should be set to `true` if the component contains a focusable element (e.g. an input) inside the root element.

#### Advanced States Mixins

When using the advanced states mixins instead of the basic states mixins, every one of the mixins below should be included at least once.

These mixins can also be used to emit activated or selected styles, by applying them within a selector for
`&--activated` or `&--selected` modifier classes.

Mixin | Description
--- | ---
`states-base-color($color)` | Mandatory. Sets up base state styles using the provided color
`states-opacities($opacity-map, $has-nested-focusable-element)` | Sets the opacity of the ripple in any of the `hover`, `focus`, or `press` states. The `opacity-map` can specify one or more of these states as keys. States not specified in the map resort to default opacity values.

> _NOTE_: `$has-nested-focusable-element` defaults to `false` but should be set to `true` if the component contains a focusable element (e.g. an input) inside the root element.

> _DEPRECATED_: The individual mixins `states-hover-opacity($opacity)`, `states-focus-opacity($opacity, $has-nested-focusable-element)`, and `states-press-opacity($opacity)` are deprecated in favor of the unified `states-opacities($opacity-map, $has-nested-focusable-element)` mixin above.

#### Sass Functions

Function | Description
--- | ---
`states-opacity($color, $state)` | Returns the appropriate default opacity to apply to the given color in the given state (hover, focus, press, selected, or activated)

### `MDCRipple`

The `MDCRipple` JavaScript component allows for programmatic activation / deactivation of the ripple, for interdependent interaction between
components. For example, this is used for making form field labels trigger the ripples in their corresponding input elements.

To use the `MDCRipple` component, first [import the `MDCRipple` JS](../../docs/importing-js.md). Then, initialize the ripple with the correct DOM element.

```javascript
const surface = document.querySelector('.my-surface');
const ripple = new MDCRipple(surface);
```

You can also use `attachTo()` as an alias if you don't care about retaining a reference to the
ripple.

```javascript
MDCRipple.attachTo(document.querySelector('.my-surface'));
```

Property | Value Type | Description
--- | --- | ---
`unbounded` | Boolean | Whether or not the ripple is unbounded
> _NOTE_: Surfaces for bounded ripples should have the `overflow` property set to `hidden`, while surfaces for unbounded ripples should have it set to `visible`.

Method Signature | Description
--- | ---
`activate() => void` | Proxies to the foundation's `activate` method
`deactivate() => void` | Proxies to the foundation's `deactivate` method
`layout() => void` | Proxies to the foundation's `layout` method
`handleFocus() => void` | Handles focus event on the ripple surface
`handleBlur() => void` | Handles blur event on the ripple surface

### `MDCRippleAdapter`

| Method Signature | Description |
| --- | --- |
| `browserSupportsCssVars() => boolean` | Whether or not the given browser supports CSS Variables. |
| `isUnbounded() => boolean` | Whether or not the ripple should be considered unbounded. |
| `isSurfaceActive() => boolean` | Whether or not the surface the ripple is acting upon is [active](https://www.w3.org/TR/css3-selectors/#useraction-pseudos) |
| `isSurfaceDisabled() => boolean` | Whether or not the ripple is attached to a disabled component |
| `addClass(className: string) => void` | Adds a class to the ripple surface |
| `removeClass(className: string) => void` | Removes a class from the ripple surface |
| `containsEventTarget(target: EventTarget) => boolean` | Whether or not the ripple surface contains the given event target |
| `registerInteractionHandler(evtType: string, handler: EventListener) => void` | Registers an event handler on the ripple surface |
| `deregisterInteractionHandler(evtType: string, handler: EventListener) => void` | Unregisters an event handler on the ripple surface |
| `registerDocumentInteractionHandler(evtType: string, handler: EventListener) => void` | Registers an event handler on the documentElement |
| `deregisterDocumentInteractionHandler(evtType: string, handler: EventListener) => void` | Unregisters an event handler on the documentElement |
| `registerResizeHandler(handler: Function) => void` | Registers a handler to be called when the ripple surface (or its viewport) resizes |
| `deregisterResizeHandler(handler: Function) => void` | Unregisters a handler to be called when the ripple surface (or its viewport) resizes |
| `updateCssVariable(varName: string, value: (string or null)) => void` | Sets the CSS property `varName` on the ripple surface to the value specified |
| `computeBoundingRect() => ClientRect` | Returns the ClientRect for the surface |
| `getWindowPageOffset() => {x: number, y: number}` | Returns the `page{X,Y}Offset` values for the window object |

> _NOTE_: When implementing `browserSupportsCssVars`, please take the [Safari 9](#caveat-safari) considerations into account. We provide a `supportsCssVariables` function within the `util.js` which we recommend using, as it handles this for you.

### `MDCRippleFoundation`

Method Signature | Description
--- | ---
`activate() => void` | Triggers an activation of the ripple (the first stage, which happens when the ripple surface is engaged via interaction, such as a `mousedown` or a `pointerdown` event). It expands from the center.
`deactivate() => void` | Triggers a deactivation of the ripple (the second stage, which happens when the ripple surface is engaged via interaction, such as a `mouseup` or a `pointerup` event). It expands from the center.
`layout() => void` | Recomputes all dimensions and positions for the ripple element. Useful if a ripple surface's position or dimension is changed programmatically.
`setUnbounded(unbounded: boolean) => void` | Sets the ripple to be unbounded or not, based on the given boolean.

## Tips/Tricks

### Using a sentinel element for a ripple

Usually, you'll want to leverage `::before` and `::after` pseudo-elements when integrating the ripple into MDC Web components. If you can't use pseudo-elements, create a sentinel element inside your root element. The sentinel element covers the root element's surface.

```html
<div class="my-component">
  <div class="mdc-ripple-surface"></div>
  <!-- your component DOM -->
</div>
```

### Unbounded ripple

You can set a ripple to be _unbounded_, such as those used for MDC Checkboxes and MDC Radio Buttons, either imperatively in JS _or_ declaratively using the DOM.

#### Using JS

Set the `unbounded` property on the `MDCRipple` component.

```javascript
const ripple = new MDCRipple(root);
ripple.unbounded = true;
```

#### Using DOM

Add a `data-mdc-ripple-is-unbounded` attribute to your root element.

```html
<div class="my-surface" data-mdc-ripple-is-unbounded>
  <p>A surface</p>
</div>
```

### MDCRipple with custom functionality

Usually, you'll want to use `MDCRipple` _along_ with the component for the actual UI element you're trying to add a
ripple to. `MDCRipple` has a static `createAdapter(instance)` method that can be used to instantiate a ripple within
any `MDCComponent` that requires custom adapter functionality.

```ts
class MyMDCComponent extends MDCComponent {
  constructor() {
    super(...arguments);
    const foundation = new MDCRippleFoundation({
      ...MDCRipple.createAdapter(this),
      isSurfaceActive: () => this.isActive_, /* Custom functionality */
    });
    this.ripple = new MDCRipple(this.root, foundation);
  }
}
```

### Handling keyboard events for custom UI components

Different keyboard events activate different elements. For example, the space key activates buttons, while the enter key activates links.

`MDCRipple` uses the `adapter.isSurfaceActive()` method to detect whether or not a keyboard event has activated the surface the ripple is on. Our vanilla implementation of the adapter does this by checking whether the `:active` pseudo-class has been applied to the ripple surface. However, this approach will _not_ work for custom components that the browser does not apply this pseudo-class to.

To make your component work properly with keyboard events, you'll have to listen for both `keydown` and `keyup` events to set some state that determines whether or not the surface is "active".

```ts
class MyComponent {
  constructor(element) {
    this.root = element;
    this.active = false;
    this.root.addEventListener('keydown', evt => {
      if (isSpace(evt)) {
        this.active = true;
      }
    });
    this.root.addEventListener('keyup', evt => {
      if (isSpace(evt)) {
        this.active = false;
      }
    });
    const foundation = new MDCRippleFoundation(
      ...MDCRipple.createAdapter(this),
      // ...
      isSurfaceActive: () => this.active
    });
    this.ripple = new MDCRipple(this.root, foundation);
  }
}
```

### Specifying known element dimensions for asynchronous style loading

If you asynchronously load style resources, such as loading stylesheets dynamically or loading fonts, then `adapter.getClientRect()` may return _incorrect_ dimensions if the ripple is initialized before the stylesheet/font has loaded. In this case, you can override the default behavior of `getClientRect()` to return the correct results.

For example, if you know an icon font sizes its elements to `24px` width and height:
```js
const foundation = new MDCRippleFoundation({
  // ...
  computeBoundingRect: () => {
    const {left, top} = element.getBoundingClientRect();
    const dim = 24;
    return {
      left,
      top,
      width: dim,
      height: dim,
      right: left + dim,
      bottom: top + dim
    };
  }
});
this.ripple = new MDCRipple(this.root, foundation);
```

### The util API

External frameworks and libraries can use the following utility methods when integrating a component.

Method Signature | Description
--- | ---
`util.supportsCssVariables(windowObj, forceRefresh = false) => Boolean` | Determine whether the current browser supports CSS variables (custom properties)
`util.getNormalizedEventCoords(ev, pageOffset, clientRect) => object` | Determines X/Y coordinates of an event normalized for touch events and ripples

> _NOTE_: The function `util.supportsCssVariables` cache its results; `forceRefresh` will force recomputation, but is used mainly for testing and should not be necessary in normal use.

## Caveats

### Caveat: Safari 9

> TL;DR ripples are disabled in Safari 9 because of a bug with CSS variables.

The ripple works by updating CSS variables used by pseudo-elements. Unfortunately, in Safari 9.1, there is a bug where updating a CSS variable on an element will _not_ trigger a style recalculation on that element's pseudo-elements (try out [this codepen](http://codepen.io/traviskaufman/pen/jARYOR) in Chrome, and then in Safari 9.1 to see the issue). Webkit builds which have this bug fixed (e.g. the builds used in Safari 10+)
support [CSS 4 Hex Notation](https://drafts.csswg.org/css-color/#hex-notation) while those without the fix don't. We feature-detect whether we are working with a WebKit build that can handle our usage of CSS variables.

### Caveat: Mobile Safari

> TL;DR for CSS-only ripple styles to work as intended, register a `touchstart` event handler on the affected element or its ancestor.

Mobile Safari does not trigger `:active` styles noticeably by default, as
[documented](https://developer.apple.com/library/content/documentation/AppleApplications/Reference/SafariWebContent/AdjustingtheTextSize/AdjustingtheTextSize.html#//apple_ref/doc/uid/TP40006510-SW5)
in the Safari Web Content Guide. This effectively suppresses the intended pressed state styles for CSS-only ripple surfaces. This behavior can be remedied by registering a `touchstart` event handler on the element, or on any common ancestor of the desired elements.

See [this StackOverflow answer](https://stackoverflow.com/a/33681490) for additional information on mobile Safari's behavior.
