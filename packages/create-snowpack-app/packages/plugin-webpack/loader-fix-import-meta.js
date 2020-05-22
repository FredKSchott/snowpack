// Until Webpack supports import.meta, we just have to strip it.
module.exports = function (source) {
  return source.replace(/import\.meta/g, "({})");
};
