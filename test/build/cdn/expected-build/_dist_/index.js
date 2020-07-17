import __SNOWPACK_ENV__ from '/__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

import React from "https://cdn.pika.dev/react@^16.13.1";
import ReactDOM from "https://cdn.pika.dev/react-dom@^16.13.1";
const App = () => /* @__PURE__ */ React.createElement("div", null, "I’m an app!");
ReactDOM.render(/* @__PURE__ */ React.createElement(App, null), document.getElementById("root"));
if (import.meta.hot) {
  import.meta.hot.accept();
}
