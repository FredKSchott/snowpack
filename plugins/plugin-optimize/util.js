/**
 * Copy/paste from Snowpack utils, at least until there’s some common import
 */
const path = require('path');

exports.HTML_JS_REGEX = /<script[^>]+type="?module"?[^>]*>/gims;

/** determine if remote package or not */
exports.isRemoteModule = function isRemoteModule(specifier) {
  return (
    specifier.startsWith('//') ||
    specifier.startsWith('http://') ||
    specifier.startsWith('https://')
  );
};

const CLOSING_HEAD_TAG = /<\s*\/\s*head\s*>/gi;

/** Append HTML before closing </head> tag */
exports.appendHTMLToHead = function appendHTMLToHead(doc, htmlToAdd) {
  const closingHeadMatch = doc.match(CLOSING_HEAD_TAG);
  // if no <head> tag found, throw an error (we can’t load your app properly)
  if (!closingHeadMatch) {
    throw new Error(`No <head> tag found in HTML (this is needed to optimize your app):\n${doc}`);
  }
  // if multiple <head> tags found, also freak out
  if (closingHeadMatch.length > 1) {
    throw new Error(`Multiple <head> tags found in HTML (perhaps commented out?):\n${doc}`);
  }
  return doc.replace(closingHeadMatch[0], htmlToAdd + closingHeadMatch[0]);
};

const CLOSING_BODY_TAG = /<\s*\/\s*body\s*>/gi;

/** Append HTML before closing </body> tag */
exports.appendHTMLToBody = function appendHTMLToBody(doc, htmlToAdd) {
  const closingBodyMatch = doc.match(CLOSING_BODY_TAG);
  // if no <body> tag found, throw an error (we can’t load your app properly)
  if (!closingBodyMatch) {
    throw new Error(`No <body> tag found in HTML (this is needed to load your app):\n\n${doc}`);
  }
  // if multiple <body> tags found, also freak out
  if (closingBodyMatch.length > 1) {
    throw new Error(`Multiple <body> tags found in HTML (perhaps commented out?):\n\n${doc}`);
  }
  return doc.replace(closingBodyMatch[0], htmlToAdd + closingBodyMatch[0]);
};

/** URL relative */
exports.relativeURL = function relativeURL(path1, path2) {
  let url = path.relative(path1, path2).replace(/\\/g, '/');
  if (!url.startsWith('./') && !url.startsWith('../')) {
    url = './' + url;
  }
  return url;
};

/** Remove \ and / from beginning of string */
exports.removeLeadingSlash = function removeLeadingSlash(path) {
  return path.replace(/^[/\\]+/, '');
};
