
const code = "@import \"../../TEST_WMU/bootstrap/dist/css/bootstrap.min.css.proxy.js\"";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);