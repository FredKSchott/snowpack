import { h, render } from '/web_modules/preact.js';
import '/web_modules/preact/devtools.js';
import App from './App.js';
import './index.css.proxy.js';
render(h(App, null), document.getElementById('root'));