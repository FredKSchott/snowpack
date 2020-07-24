import { h } from '/web_modules/preact.js';
import logo from './logo.png.proxy.js';
import './App.css.proxy.js';

function App() {
  return h("div", {
    className: "App"
  }, h("header", {
    className: "App-header"
  }, h("img", {
    src: logo,
    className: "App-logo",
    alt: "logo"
  }), h("p", null, "Edit ", h("code", null, "src/App.jsx"), " and save to reload."), h("a", {
    className: "App-link",
    href: "https://preactjs.com",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Learn Preact")));
}

export default App;