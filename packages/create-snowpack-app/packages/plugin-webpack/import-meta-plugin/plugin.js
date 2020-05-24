/**
MIT License

Copyright (c) 2018 open-wc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// TODO: Remove one
const path = require("path");
const regex = /import\.meta/g;
function toBrowserPath(filePath, _path = path) {
  return filePath.replace(
    new RegExp(_path.sep === "\\" ? "\\\\" : _path.sep, "g"),
    "/"
  );
}

/**
 * Webpack loader to rewrite `import.meta` in modules with url data to the source code file location.
 *
 * @example
 * return import.meta;
 * // becomes: return ({ url: `${window.location.protocol}//${window.location.host}/relative/path/to/file.js` });
 *
 * return import.meta.url;
 * // becomes: return ({ url: `${window.location.protocol}//${window.location.host}/relative/path/to/file.js` }).url;
 */
module.exports = function (source) {
  const relativePath = this.context.substring(
    this.context.indexOf(this.rootContext) + this.rootContext.length + 1,
    this.resource.lastIndexOf(path.sep) + 1
  );

  const browserPath = toBrowserPath(relativePath);

  const fileName = this.resource.substring(
    this.resource.lastIndexOf(path.sep) + 1
  );

  let found = false;
  let rewrittenSource = source.replace(regex, () => {
    found = true;
    return `({ url: getAbsoluteUrl('${browserPath}/${fileName}') })`;
  });

  if (found) {
    return `
      function getAbsoluteUrl(relativeUrl) {
        const publicPath = __webpack_public_path__;

        let url = '';

        if (!publicPath || publicPath.indexOf('://') < 0) {
          url += window.location.protocol + '//' + window.location.host;
        }

        if (publicPath) {
          url += publicPath;
        } else {
          url += '/';
        }

        return url + relativeUrl;
      }
${rewrittenSource}`;
  } else {
    return source;
  }
};
