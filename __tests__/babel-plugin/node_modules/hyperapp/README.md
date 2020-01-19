# Hyperapp

[![Travis CI](https://img.shields.io/travis/jorgebucaran/hyperapp/master.svg)](https://travis-ci.org/jorgebucaran/hyperapp)
[![Codecov](https://img.shields.io/codecov/c/github/jorgebucaran/hyperapp/master.svg)](https://codecov.io/gh/jorgebucaran/hyperapp)
[![npm](https://img.shields.io/npm/v/hyperapp.svg)](https://www.npmjs.org/package/hyperapp)
[![Slack](https://hyperappjs.herokuapp.com/badge.svg)](https://hyperappjs.herokuapp.com "Join us")

Hyperapp is a JavaScript micro-framework for building web applications.

> :wave: [**Hyperapp 2.0**](https://github.com/jorgebucaran/hyperapp/pull/726) is coming out soon! Try it from the [V2](https://github.com/jorgebucaran/hyperapp/tree/V2) branch right now and be sure to follow [@HyperappJS](https://twitter.com/hyperappjs) for all the Hyperapp news & updates.

- **Minimal** — We have aggressively minimized the concepts you need to understand to be productive while remaining on par with what other frameworks can do.
- **Pragmatic** — Hyperapp holds firm on the functional programming front when managing your state, but takes a pragmatic approach to allow for side effects, asynchronous actions, and DOM manipulations.
- **Standalone** — Do more with less. Hyperapp combines state management with a virtual DOM engine that supports keyed updates & lifecycle events — all with no dependencies.

## Getting Started

Our first example is a counter that can be incremented or decremented. Go ahead and [try it online](https://codepen.io/hyperapp/pen/zNxZLP/left/?editors=0010).

```jsx
import { h, app } from "hyperapp"

const state = {
  count: 0
}

const actions = {
  down: value => state => ({ count: state.count - value }),
  up: value => state => ({ count: state.count + value })
}

const view = (state, actions) => (
  <div>
    <h1>{state.count}</h1>
    <button onclick={() => actions.down(1)}>-</button>
    <button onclick={() => actions.up(1)}>+</button>
  </div>
)

app(state, actions, view, document.body)
```

Hyperapp consists of a two-function API. <samp>hyperapp.h</samp> returns a new [virtual DOM](#view) node tree and <samp>hyperapp.app</samp> [mounts](#mounting) a new application in the specified DOM element. Without an element, it's possible to use Hyperapp "headless", which can be useful when unit testing your program.

This example assumes you are using a JavaScript compiler like [Babel](https://babeljs.io) or [TypeScript](https://www.typescriptlang.org) and a module bundler like [Parcel](https://parceljs.org), [Webpack](https://webpack.js.org), etc. If you are using JSX, all you need to do is install the JSX [transform plugin](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx) and add the pragma option to your <samp>.babelrc</samp> file.

```json
{
  "plugins": [["@babel/plugin-transform-react-jsx", { "pragma": "h" }]]
}
```

JSX is a language syntax extension that lets you write HTML tags interspersed with JavaScript. Because browsers don't understand JSX, we use a compiler to transform it into <samp>hyperapp.h</samp> function calls under the hood.

```jsx
const view = (state, actions) =>
  h("div", {}, [
    h("h1", {}, state.count),
    h("button", { onclick: () => actions.down(1) }, "-"),
    h("button", { onclick: () => actions.up(1) }, "+")
  ])
```

Note that JSX is not required for building applications with Hyperapp. You can use <samp>hyperapp.h</samp> directly and without a compilation step as shown above. Other alternatives to JSX include [@hyperapp/html](https://github.com/hyperapp/html), [hyperx](https://github.com/substack/hyperx), [t7](https://github.com/trueadm/t7) and [ijk](https://github.com/lukejacksonn/ijk).

## Installation

Install with npm or Yarn.

<pre>
npm i <a href=https://www.npmjs.com/package/hyperapp>hyperapp</a>
</pre>

Then with a module bundler like [Rollup](https://rollupjs.org) or [Webpack](https://webpack.js.org), use as you would anything else.

```js
import { h, app } from "hyperapp"
```

If you don't want to set up a build environment, you can download Hyperapp from a CDN like [unpkg.com](https://unpkg.com/hyperapp) and it will be globally available through the <samp>window.hyperapp</samp> object. We support all ES5-compliant browsers, including Internet Explorer 10 and above.

```html
<script src="https://unpkg.com/hyperapp"></script>
```

## Overview

Hyperapp applications consist of three interconnected parts: the [state](#state), [view](#view), and [actions](#actions).

Once initialized, your application executes in a continuous loop, taking in actions from users or from external events, updating the state, and representing changes in the view through a virtual DOM model. Think of an action as a signal that notifies Hyperapp to update the state and schedule the next view to redraw. After processing an action, the new state is presented back to the user.

### State

The state is a plain JavaScript object that describes your entire program. It consists of all the dynamic data that is moved around in the application during its execution. The state cannot be mutated once it is created. We must use actions to update it.

```js
const state = {
  count: 0
}
```

Like any JavaScript object, the state can be a nested tree of objects. We refer to nested objects in the state as partial state. A single state tree does not conflict with modularity — see [Nested Actions](#nested-actions) to find out how to update deeply nested objects and split your state and actions.

```js
const state = {
  top: {
    count: 0
  },
  bottom: {
    count: 0
  }
}
```

Because Hyperapp performs a shallow merge when updating your state, the top-level state must be a plain JavaScript object, other than this, you can use any type, including arrays, ES6 [Maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), [Sets](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), [Immutable.js](https://facebook.github.io/immutable-js/) structures, etc.

#### Local State

Hyperapp does not have the concept of local state. Instead, components are pure functions that return a virtual DOM representation of the global state.

### Actions

The only way to change the state is via actions. An action is a unary function (accepts a single argument) expecting a payload. The payload can be anything you want to pass into the action.

To update the state, an action must return a partial state object. The new state will be the result of a shallow merge between this object and the current state. Under the hood, Hyperapp wires every function in your actions to automatically redraw the view on state changes.

```js
const actions = {
  setValue: value => ({ value })
}
```

Instead of returning a partial state object directly, an action can return a function that takes the current state and actions as arguments and returns a partial state object.

```js
const actions = {
  down: value => state => ({ count: state.count - value }),
  up: value => state => ({ count: state.count + value })
}
```

State updates are always immutable. Do not mutate the state object argument within an action and return it — the results are not what you expect (e.g., the view will not be redrawn).

Immutability enables time-travel debugging, helps prevent introducing hard-to-track-down bugs by making state changes more predictable, and allows cheap memoization of components using shallow equality <samp>===</samp> checks.

#### Asynchronous Actions

Actions used for side effects (writing to databases, sending a request to a server, etc.) don't need to have a return value. You may call an action from within another action or callback function. Actions which return a Promise, <samp>undefined</samp> or <samp>null</samp> will not trigger redraws or update the state.

```js
const actions = {
  upLater: value => (state, actions) => {
    setTimeout(actions.up, 1000, value)
  },
  up: value => state => ({ count: state.count + value })
}
```

An action can be an <samp>[async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)</samp> function. Because <samp>async</samp> functions return a Promise, and not a partial state object, you need to call another action in order to update the state.

```js
const actions = {
  upLater: () => async (state, actions) => {
    await new Promise(done => setTimeout(done, 1000))
    actions.up(10)
  },
  up: value => state => ({ count: state.count + value })
}
```

#### Nested Actions

Actions can be nested inside namespaces. Updating deeply nested state is as easy as declaring actions inside an object in the same path as the part of the state you want to update.

```jsx
const state = {
  counter: {
    count: 0
  }
}

const actions = {
  counter: {
    down: value => state => ({ count: state.count - value }),
    up: value => state => ({ count: state.count + value })
  }
}
```

#### Interoperability

The <samp>app</samp> function returns a copy of your actions where every function is wired to changes in the state. Exposing this object to the outside world can be useful to operate your application from another program or framework, subscribe to global events, listen to mouse and keyboard input, etc.

To see this in action, modify the example from [Getting Started](#getting-started) to save the wired actions to a variable and try using them. You should see the counter update accordingly.

```jsx
const main = app(state, actions, view, document.body)

setInterval(main.up, 250, 1)
setInterval(main.down, 500, 1)
```

Because state updates are always immutable, returning a reference to the current state will not schedule a view redraw.

```jsx
const actions = {
  getState: () => state => state
}
```

### View

Every time your application state changes, the view function is called so that you can specify how you want the DOM to look based on the new state. The view returns your specification in the form of a plain JavaScript object known as a virtual DOM and Hyperapp takes care of updating the actual DOM to match it.

```js
import { h } from "hyperapp"

export const view = (state, actions) =>
  h("div", {}, [
    h("h1", {}, state.count),
    h("button", { onclick: () => actions.down(1) }, "-"),
    h("button", { onclick: () => actions.up(1) }, "+")
  ])
```

A virtual DOM is a description of what a DOM should look like using a tree of nested JavaScript objects known as virtual nodes. Think of it as a lightweight representation of the DOM. In the example, the view function returns an object like this.

```jsx
{
  nodeName: "div",
  attributes: {},
  children: [
    {
      nodeName: "h1",
      attributes: {},
      children: [0]
    },
    {
      nodeName: "button",
      attributes: { ... },
      children: ["-"]
    },
    {
      nodeName:   "button",
      attributes: { ... },
      children: ["+"]
    }
  ]
}
```

The virtual DOM model allows us to write code as if the entire document is thrown away and rebuilt on each change, while we only update what actually changed. We try to do this in the least number of steps possible, by comparing the new virtual DOM against the previous one. This leads to high efficiency, since typically only a small percentage of nodes need to change, and changing real DOM nodes is costly compared to recalculating the virtual DOM.

It may seem wasteful to throw away the old virtual DOM and re-create it entirely on every update — not to mention the fact that at any one time, Hyperapp is keeping two virtual DOM trees in memory, but as it turns out, browsers can create hundreds of thousands of objects very quickly. On the other hand, modifying the DOM is several orders of magnitude more expensive.

### Mounting

To mount your application on a page, we need a DOM element. This element is referred to as the application container. Applications built with Hyperapp always have a single container.

```jsx
app(state, actions, view, container)
```

Hyperapp will also attempt to reuse existing elements inside the container enabling SEO optimization and improving your sites time-to-interactive. The process consists of serving a fully rendered page together with your application. Then instead of throwing away the existing content, we'll turn your DOM nodes into an interactive application out of the box.

This is how we can recycle server-rendered content out the counter example from before. See [Getting Started](#getting-started) for the application code.

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script defer src="bundle.js"></script>
</head>

<body>
  <div>
    <h1>0</h1>
    <button>-</button>
    <button>+</button>
  </div>
</body>
</html>
```

### Components

A component is a pure function that returns a virtual node. Unlike the view function, components are not wired to your application state or actions. Components are dumb, reusable blocks of code that encapsulate markup, styles, and behaviors that belong together.

Here's a taste of how to use components in your application. The application is a typical To-Do manager. Go ahead and [try it online here](https://codepen.io/hyperapp/pen/zNxRLy).

```jsx
import { h } from "hyperapp"

const TodoItem = ({ id, value, done, toggle }) => (
  <li
    class={done && "done"}
    onclick={() =>
      toggle({
        value: done,
        id: id
      })
    }
  >
    {value}
  </li>
)

export const view = (state, actions) => (
  <div>
    <h1>Todo</h1>
    <ul>
      {state.todos.map(({ id, value, done }) => (
        <TodoItem id={id} value={value} done={done} toggle={actions.toggle} />
      ))}
    </ul>
  </div>
)
```

If you don't know all the attributes that you want to place in a component ahead of time, you can use the [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator). Note that Hyperapp components can return an array of elements as in the following example. This technique lets you group a list of children without adding extra nodes to the DOM.

```jsx
const TodoList = ({ todos, toggle }) =>
  todos.map(todo => <TodoItem {...todo} toggle={toggle} />)
```

#### Lazy Components

Components can only receive attributes and children from their parent component. Similarly to the top-level view function, lazy components are passed your application global state and actions. To create a lazy component, return a view function from a regular component.

```jsx
import { h } from "hyperapp"

export const Up = ({ by }) => (state, actions) => (
  <button onclick={() => actions.up(by)}>+ {by}</button>
)

export const Down = ({ by }) => (state, actions) => (
  <button onclick={() => actions.down(by)}>- {by}</button>
)

export const Double = () => (state, actions) => (
  <button onclick={() => actions.up(state.count)}>+ {state.count}</button>
)

export const view = (state, actions) => (
  <main>
    <h1>{state.count}</h1>
    <Up by={2} />
    <Down by={1} />
    <Double />
  </main>
)
```

#### Handling Component State

Suppose you have a list of questions with answers that are collapsed initially. A flag `answerIsOpen` is used to determine if a question's answer is open.

Since there is no concept of local state in Hyperapp, the global state is always updated rather than an individual component's state.

To update a single question's state, the entire `questions` array will be mapped to a new array where the `answerIsOpen` property will be toggled if the question matches the one belonging to the component.

[View the example online](https://codepen.io/anon/pen/ZogRYP).

#### Children Composition

Components receive their children elements via the second argument, allowing you and other components to pass arbitrary children down to them.

```jsx
const Box = ({ color }, children) => (
  <div class={`box box-${color}`}>{children}</div>
)

const HelloBox = ({ name }) => (
  <Box color="green">
    <h1 class="title">Hello, {name}!</h1>
  </Box>
)
```

## Supported Attributes

Supported attributes include [HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes), [SVG attributes](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute), [DOM events](https://developer.mozilla.org/en-US/docs/Web/Events), [Lifecycle Events](#lifecycle-events), and [Keys](#keys). Note that non-standard HTML attribute names are not supported, <samp>onclick</samp> and <samp>class</samp> are valid, but <samp>onClick</samp> or <samp>className</samp> are not.

### Styles

The <samp>style</samp> attribute expects a plain object rather than a string as in HTML.
Each declaration consists of a style name property written in <samp>camelCase</samp> and a value. CSS variables are supported too.

Individual style properties will be diffed and mapped against <samp>[HTMLElement.style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style)</samp> property members of the DOM element - you should therefore use the JavaScript style object [property names](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Properties_Reference), e.g. <samp>backgroundColor</samp> rather than <samp>background-color</samp>.

```jsx
import { h } from "hyperapp"

export const Jumbotron = ({ text }) => (
  <div
    style={{
      color: "white",
      fontSize: "32px",
      textAlign: center,
      backgroundImage: `url(${imgUrl})`
    }}
  >
    {text}
  </div>
)
```

### Lifecycle Events

You can be notified when elements managed by the virtual DOM are created, updated or removed via lifecycle events. Use them for animation, data fetching, wrapping third-party libraries, cleaning up resources, etc.

Note that lifecycle events are attached to virtual DOM nodes, not to components. Consider adding a key to ensure that the event is attached to a specific DOM element, rather than a recycled one.

#### oncreate

This event is fired after the element is created and attached to the DOM. Use it to manipulate the DOM node directly, make a network request, create a slide/fade in animation, etc.

```jsx
import { h } from "hyperapp"

export const Textbox = ({ placeholder }) => (
  <input
    type="text"
    placeholder={placeholder}
    oncreate={element => element.focus()}
  />
)
```

#### onupdate

This event is fired every time we update the element attributes. Use <samp>oldAttributes</samp> inside the event handler to check if any attributes changed or not.

```jsx
import { h } from "hyperapp"

export const Textbox = ({ placeholder }) => (
  <input
    type="text"
    placeholder={placeholder}
    onupdate={(element, oldAttributes) => {
      if (oldAttributes.placeholder !== placeholder) {
        // Handle changes here!
      }
    }}
  />
)
```

#### onremove

This event is fired before the element is removed from the DOM. Use it to create slide/fade out animations. Call <samp>done</samp> inside the function to remove the element. This event is not called in its child elements.

```jsx
import { h } from "hyperapp"

export const MessageWithFadeout = ({ title }) => (
  <div onremove={(element, done) => fadeout(element).then(done)}>
    <h1>{title}</h1>
  </div>
)
```

#### ondestroy

This event is fired after the element has been removed from the DOM, either directly or as a result of a parent being removed. Use it for invalidating timers, canceling a network request, removing global events listeners, etc.

```jsx
import { h } from "hyperapp"

export const Camera = ({ onerror }) => (
  <video
    poster="loading.png"
    oncreate={element => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(stream => (element.srcObject = stream))
        .catch(onerror)
    }}
    ondestroy={element => element.srcObject.getTracks()[0].stop()}
  />
)
```

### Keys

Keys help identify nodes every time we update the DOM. By setting the <samp>key</samp> property on a virtual node, you declare that the node should correspond to a particular DOM element. This allows us to re-order the element into its new position, if the position changed, rather than risk destroying it.

```jsx
import { h } from "hyperapp"

export const ImageGallery = ({ images }) =>
  images.map(({ hash, url, description }) => (
    <li key={hash}>
      <img src={url} alt={description} />
    </li>
  ))
```

Keys must be unique among sibling nodes. Don't use an array index as the key, if the index also specifies the order of siblings. If the position and number of items in a list are fixed, it will make no difference, but if the list is dynamic, the key will change every time the tree is rebuilt.

```jsx
import { h } from "hyperapp"

export const PlayerList = ({ players }) =>
  players
    .slice()
    .sort((player, nextPlayer) => nextPlayer.score - player.score)
    .map(player => (
      <li key={player.username} class={player.isAlive ? "alive" : "dead"}>
        <PlayerProfile {...player} />
      </li>
    ))
```

#### Top-Level Nodes

Keys are not registered on the top-level node of your view. If you are toggling the top-level view, and you must use keys, wrap them in an unchanging node.

## Packages

The Hyperapp community has provided several packages for additional functionality to use with Hyperapp.

* [**@hyperapp/router**](https://github.com/hyperapp/router) - Declarative routing for Hyperapp using the History API.
* [**@hyperapp/transitions**](https://github.com/hyperapp/transitions) - Animate elements as they are appear, disappear and move around on the page.
* [**@hyperapp/render**](https://github.com/hyperapp/render) - Render Hyperapp views to an HTML string.

## Starter Kits

If you are looking to get started with a production app using a build setup quickly and easily, there are community starter kits to help.

* [**Hyperapp Kit**](https://github.com/atomiks/hyperapp-kit) - A starter kit using [Parcel](https://parceljs.org/) that supports prerendering for improved inital page load performance.
* [**Hyperapp One**](https://github.com/selfup/hyperapp-one) - A starter kit using [Webpack](https://webpack.js.org) for quickstarting an application with AirBnB's JavaScript Styleguide.

## Links

- [Slack](https://hyperappjs.herokuapp.com)
- [Twitter](https://twitter.com/hyperappJS)
- [Examples](https://codepen.io/search/pens/?q=hyperapp)
- [/r/hyperapp](https://www.reddit.com/r/hyperapp)

## License

Hyperapp is MIT licensed. See [LICENSE](LICENSE.md).
