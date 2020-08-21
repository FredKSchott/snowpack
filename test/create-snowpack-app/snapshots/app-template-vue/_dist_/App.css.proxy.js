
const code = "\n.App {\r\n  text-align: center;\n}\n.App-header {\r\n  background-color: #f9f6f6;\r\n  color: #32485f;\r\n  min-height: 100vh;\r\n  display: flex;\r\n  flex-direction: column;\r\n  align-items: center;\r\n  justify-content: center;\r\n  font-size: calc(10px + 2vmin);\n}\n.App-link {\r\n  color: #00c185;\n}\n.App-logo {\r\n  height: 40vmin;\r\n  pointer-events: none;\r\n  margin-bottom: 1rem;\r\n  animation: App-logo-spin infinite 1.6s ease-in-out alternate;\n}\n@keyframes App-logo-spin {\nfrom {\r\n    transform: scale(1);\n}\nto {\r\n    transform: scale(1.06);\n}\n}\r\n";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);