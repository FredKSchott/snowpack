export function wrapEsmProxyResponse(url: string, code: string, ext: string, hasHmr = false) {
  if (ext === '.css') {
    return `
    const styleEl = document.createElement("style");
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(${JSON.stringify(code)}));
    document.head.appendChild(styleEl);
    ${
      hasHmr
        ? `
    import {apply} from '/web_modules/@snowpack/hmr.js';
    console.log('apply', import.meta.url);
    apply(import.meta.url, ({code}) => {
      styleEl.innerHtml = '';
      styleEl.appendChild(document.createTextNode(code));
    });
    `
        : ''
    }
  `;
  }
  return `export default ${JSON.stringify(url)};`;
}
