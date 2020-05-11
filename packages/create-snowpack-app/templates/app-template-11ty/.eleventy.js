module.exports = function (eleventyConfig) {
  eleventyConfig.setTemplateFormats([
    // Templates:
    "html",
    "njk",
    "md",
    // Static Assets:
    "css",
    "svg",
    "png",
    "jpg",
    "jpeg",
  ]);
  eleventyConfig.addPassthroughCopy("static");

  return {
    dir: {
      input: "_template",
      includes: "../_includes",
      output: "_output",
    },
  };
};
