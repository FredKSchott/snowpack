module.exports = function (eleventyConfig) {
  // Pass-through or process all the files that you use in your project
  eleventyConfig.setTemplateFormats(["html", "js", "njk", "svg", "md", "css"]);

  return {
    dir: {
      includes: "../_includes",
    },
  };
};
