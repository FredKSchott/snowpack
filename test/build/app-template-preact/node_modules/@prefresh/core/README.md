# Prefresh-core

**Experimental package**

[![npm version](https://badgen.net/npm/v/@prefresh/core)](https://www.npmjs.com/package/@prefresh/core)

We are still fleshing out the details on how to go about this approach best for [Preact](https://github.com/preactjs/preact), we'd
love to give you the best reloading experience possible.

Note that now the refreshing component will dispose of its `hookState` to reload in case of added hook, ... this to ensure consistency.

## How to use

This plugin will set up a series of hooks onto the webpack instance, so the first thing
to do is ensure that this package is part of your entries.

This will add a method on the window `window.__PREFRESH__.replaceComponent`, this function
expects two arguments. The first being the old `class/function` and the second the new one.

This will go over all vnodes it knows for the `oldType` and rerender them according to the
`NewType`.

## Uncertainties

- [x] component altering lifecycles
- [x] error recovery
- [x] class components
- [x] functional components
- [x] hook swapping
- [x] avoid triggering effects for added dependencies
- [x] transition better from Functional --> class and other way around
- [x] provide fallback if no hot modules/no preact modules (window.location.reload())
- [x] custom hooks
