<!--docs:
title: "DOM"
layout: detail
section: components
excerpt: "Provides commonly-used utilities for inspecting, traversing, and manipulating the DOM."
path: /catalog/dom/
-->

# DOM

MDC DOM provides commonly-used utilities for inspecting, traversing, and manipulating the DOM.

Most of the time, you shouldn't need to depend on `mdc-dom` directly. It is useful however if you'd like to write custom components that follow MDC Web's pattern and elegantly integrate with the MDC Web ecosystem.

## Installation

```
npm install @material/dom
```

## Basic Usage

```js
import * as ponyfill from '@material/dom/ponyfill';
```

> See [Importing the JS component](../../docs/importing-js.md) for more information on how to import JavaScript.

## Ponyfill Functions

The `ponyfill` module provides the following functions:

Function Signature | Description
--- | ---
`closest(element: Element, selector: string) => ?Element` | Returns the ancestor of the given element matching the given selector (which may be the element itself if it matches), or `null` if no matching ancestor is found.
`matches(element: Element, selector: string) => boolean` | Returns true if the given element matches the given CSS selector.
`estimateScrollWidth(element: Element) => number`  | Returns the true optical width of the element if visible or an estimation if hidden by a parent element with `display: none;`.

## Event Functions

External frameworks and libraries can use the following event utility methods.

Method Signature | Description
--- | ---
`util.applyPassive(globalObj = window) => object` | Determine whether the current browser supports passive event listeners

## Focus Trap

The `FocusTrap` utility traps focus within a given element. It is intended for usage from MDC-internal
components like dialog and modal drawer.

Method Signature | Description
--- | ---
`trapFocus() => void` | Traps focus in the root element. Also focuses on `initialFocusEl` if set; otherwise, sets initial focus to the first focusable child element.
`releaseFocus() => void` | Releases focus from the root element. Also restores focus to the previously focused element.

## Announce

The `announce` utility file contains a single helper method for announcing a message via an `aria-live` region. It is intended for usage from MDC-internal components.

Method Signature | Description
--- | ---
`announce(message: string, priority?: AnnouncerPriority) => void` | Announces the message via an `aria-live` region with the given priority (defaults to polite)
<!-- TODO(b/148462294): Remove once only exported members are required in docs `say()` --> <!-- | --> <!-- DO NOT USE -->

## Keyboard

The `keyboard` utility provides helper methods for normalizing `KeyboardEvent` keys across browsers. It is intended for usage from MDC-internal components.

Method Signature | Description
--- | ---
`normalizeKey(evt: KeyboardEvent) => string` | Returns a normalized string derived from `KeyboardEvent`'s `keyCode` property to be standard across browsers.
`isNavigationEvent(evt: KeyboardEvent) => boolean` | Returns `true` if the event is a navigation event (Page Up, Page Down, Home, End, Left, Up, Right, Down).

## Mixins

The module provides a single SASS mixin which helps improves a DOM element's UX for high-contrast mode users.

Mixin | Description
--- | ---
`transparent-border` | Emits necessary layout styles to set a transparent border around an element without interfering with the rest of its component layout. The border is only visible in high-contrast mode. The target element should be a child of a relatively positioned top-level element (i.e. a ::before pseudo-element).
