
const code = "body{margin:0;font-family:Arial, Helvetica, sans-serif}.App.svelte-1wibndw{text-align:center}.App-header.svelte-1wibndw{background-color:#F9F6F6;color:#333;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:calc(10px + 2vmin)}.App-link.svelte-1wibndw{color:#ff3e00}.App-logo.svelte-1wibndw{height:40vmin;pointer-events:none;margin-bottom:1.0rem;animation:svelte-1wibndw-App-logo-spin infinite 1.6s ease-in-out alternate}@keyframes svelte-1wibndw-App-logo-spin{from{transform:scale(1)}to{transform:scale(1.06)}}";

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);