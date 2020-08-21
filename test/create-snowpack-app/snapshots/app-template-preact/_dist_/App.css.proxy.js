
const code = ".App {\r\n  text-align: center;\r\n}\r\n\r\n.App-header {\r\n  background-color: #282c34;\r\n  min-height: 100vh;\r\n  display: flex;\r\n  flex-direction: column;\r\n  align-items: center;\r\n  justify-content: center;\r\n  font-size: calc(10px + 2vmin);\r\n  color: white;\r\n}\r\n\r\n.App-link {\r\n  color: #61dafb;\r\n}\r\n\r\n.App-logo {\r\n  height: 40vmin;\r\n  pointer-events: none;\r\n  margin-bottom: 1rem;\r\n  animation: App-logo-spin infinite 1.6s ease-in-out alternate;\r\n}\r\n@keyframes App-logo-spin {\r\n  from {\r\n    transform: scale(1);\r\n  }\r\n  to {\r\n    transform: scale(1.06);\r\n  }\r\n}\r\n";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);