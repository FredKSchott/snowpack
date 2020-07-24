import './App.css.proxy.js';

const defaultExport = {
  data() {
    return {
      message: "Learn Vue"
    };
  }
};

import { createVNode as _createVNode, createTextVNode as _createTextVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createBlock as _createBlock } from "/web_modules/vue.js"

const _hoisted_1 = { class: "App" }
const _hoisted_2 = { class: "App-header" }
const _hoisted_3 = /*#__PURE__*/_createVNode("img", {
  src: "/logo.svg",
  class: "App-logo",
  alt: "logo"
}, null, -1)
const _hoisted_4 = /*#__PURE__*/_createVNode("p", null, [
  /*#__PURE__*/_createTextVNode(" Edit "),
  /*#__PURE__*/_createVNode("code", null, "src/App.vue"),
  /*#__PURE__*/_createTextVNode(" and save to reload. ")
], -1)
const _hoisted_5 = {
  class: "App-link",
  href: "https://vuejs.org",
  target: "_blank",
  rel: "noopener noreferrer"
}

export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", _hoisted_1, [
    _createVNode("header", _hoisted_2, [
      _hoisted_3,
      _hoisted_4,
      _createVNode("a", _hoisted_5, _toDisplayString(_ctx.message), 1)
    ])
  ]))
}

defaultExport.render = render
export default defaultExport