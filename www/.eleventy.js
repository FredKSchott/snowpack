const pluginTOC = require('eleventy-plugin-nesting-toc');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const { DateTime } = require('luxon');
const pluginRss = require('@11ty/eleventy-plugin-rss');

module.exports = function (eleventyConfig) {
  eleventyConfig.setTemplateFormats([
    // Templates:
    'html',
    'njk',
    'md',
    // Static Assets:
    'css',
    'jpeg',
    'jpg',
    'png',
    'svg',
    'woff',
    'woff2',
    'mp4',
    'webmanifest',
  ]);
  eleventyConfig.addPassthroughCopy('static');
  eleventyConfig.addPassthroughCopy('favicon');
  eleventyConfig.addPassthroughCopy('img');

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ['h2', 'h3'],
    // wrapperClass: 'snow-toc',
  });

  eleventyConfig.addFilter('readableDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat(
      'LLLL dd, yyyy',
    );
  });

  eleventyConfig.addFilter('toSearchEntry', function (str) {
    return str.replace(/<a class="direct-link"[^>]*>#<\/a\>/g, '');
  });

  eleventyConfig.addFilter('toJSON', function (obj) {
    return JSON.stringify(obj);
  });

  eleventyConfig.addFilter('toDocPath', function (str) {
    return str.replace(/^\.\/\_template/, `${process.env.VERCEL_GIT_COMMIT_REF || 'main'}/docs`)
  })

  eleventyConfig.setLibrary(
    'md',
    markdownIt({
      html: true,
      linkify: true,
      typographer: true,
    }).use(markdownItAnchor, {}),
  );

  return {
    dir: {
      input: '_template',
      data: '../_data',
      includes: '../_includes',
      output: 'eleventy',
    },
  };
};
