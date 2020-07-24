
const code = "\n.App {\n  text-align: center;\n}\n.App-header {\n  background-color: #f9f6f6;\n  color: #32485f;\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  font-size: calc(10px + 2vmin);\n}\n.App-link {\n  color: #00c185;\n}\n.App-logo {\n  height: 40vmin;\n  pointer-events: none;\n  margin-bottom: 1rem;\n  animation: App-logo-spin infinite 1.6s ease-in-out alternate;\n}\n@keyframes App-logo-spin {\nfrom {\n    transform: scale(1);\n}\nto {\n    transform: scale(1.06);\n}\n}\n";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);