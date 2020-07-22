
const code = ".App {\n  text-align: center;\n}\n\n.App-header {\n  background-color: #282c34;\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  font-size: calc(10px + 2vmin);\n  color: white;\n}\n\n.App-link {\n  color: #61dafb;\n}\n\n.App-logo {\n  height: 40vmin;\n  pointer-events: none;\n  margin-bottom: 1rem;\n  animation: App-logo-spin infinite 1.6s ease-in-out alternate;\n}\n@keyframes App-logo-spin {\n  from {\n    transform: scale(1);\n  }\n  to {\n    transform: scale(1.06);\n  }\n}\n";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);