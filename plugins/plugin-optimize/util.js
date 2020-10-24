/**
 * Copy/paste from Snowpack utils, at least until there’s some common import
 */
const path = require('path');
const colors = require('kleur/colors');

/** log somethin */
function log(msg, level = 'log') {
  console[level](`${colors.dim('[@snowpack/plugin-optimize]')} ${msg}`);
}
exports.log = log;

/** determine if remote package or not */
function isRemoteModule(specifier) {
  return (
    specifier.startsWith('//') ||
    specifier.startsWith('http://') ||
    specifier.startsWith('https://')
  );
}
exports.isRemoteModule = isRemoteModule;

/** Insert any string into the middle of another string at position */
function insert(string, insertion, pos = 0) {
  return string.substring(0, pos - 1) + insertion + string.substring(pos);
}
exports.insert = insert;

/** URL relative */
function projectURL(url, buildDirectory) {
  return path.relative(buildDirectory, url).replace(/\\/g, '/').replace(/^\/?/, '/');
}
exports.projectURL = projectURL;

/** Remove \ and / from beginning of string */
function removeLeadingSlash(path) {
  return path.replace(/^[/\\]+/, '');
}
exports.removeLeadingSlash = removeLeadingSlash;

/** Build Import */
function formatManifest({manifest, buildDirectory, generatedFiles, preloadCSS}) {
  const format = (url) => projectURL(url, buildDirectory);

  const sorted = Object.entries(manifest).map(([k, v]) => {
    const entry = v.entry.map(format);
    const css = v.css.map(format);
    const js = v.js
      .filter((f) => (preloadCSS && !f.endsWith('.css.proxy.js')) || true) // if preloading CSS, omit .css.proxy.js files
      .map(format);
    entry.sort((a, b) => a.localeCompare(b));
    css.sort((a, b) => a.localeCompare(b));
    js.sort((a, b) => a.localeCompare(b));
    return [format(k), {entry, css, js}];
  });
  sorted.sort((a, b) => a[0].localeCompare(b[0]));
  return {
    imports: Object.fromEntries(sorted),
    generated: generatedFiles.map(format),
  };
}
exports.formatManifest = formatManifest;
