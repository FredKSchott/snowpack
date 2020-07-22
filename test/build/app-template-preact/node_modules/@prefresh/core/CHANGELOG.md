## 0.6.1

- Remove invalid `webpack` peerDependency

## 0.6.0

- Added `computeKey` and `register` to the window payload
  - `computeKey` will calculate a hash for `functional components` and `custom  hooks` this will allow you to derive the need for resetting state or not.
  - `register` is a noop that might be used later
- Added a third parameter to `replaceComponent` allowing the user to specify whether or not the stat has to be reset.
