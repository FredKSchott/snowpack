const path = require('path');
const pluginTOC = require('eleventy-plugin-nesting-toc');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const child_process = require('child_process');

const {DateTime} = require('luxon');
// const pluginRss = require("@11ty/eleventy-plugin-rss");
// const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy(path.join(__dirname, 'css'));
  eleventyConfig.addPassthroughCopy(path.join(__dirname, 'img'));
  eleventyConfig.addPassthroughCopy(path.join(__dirname, 'assets'));
  eleventyConfig.addPassthroughCopy(path.join(__dirname, 'favicon'));
  // eleventyConfig.addPlugin(pluginRss);
  // eleventyConfig.addPlugin(pluginSyntaxHighlight);
  // eleventyConfig.setDataDeepMerge(true);

  // eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

  // eleventyConfig.addFilter("absUrl", url => {
  //   return 'https://www.pika.dev' + url;
  // });

  eleventyConfig.addFilter('readableDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('LLLL dd, yyyy');
  });

  // // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  // eleventyConfig.addFilter('htmlDateString', (dateObj) => {
  //   return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  // });

  // // Get the first `n` elements of a collection.
  // eleventyConfig.addFilter("head", (array, n) => {
  //   if( n < 0 ) {
  //     return array.slice(n);
  //   }

  //   return array.slice(0, n);
  // });

  // // eleventyConfig.addCollection("tagList", require("./_11ty/getTagList"));

  // // eleventyConfig.addPassthroughCopy("img");
  // // eleventyConfig.addPassthroughCopy("css");

  // /* Markdown Plugins */
  // let markdownIt = require("markdown-it");
  // let markdownItAnchor = require("markdown-it-anchor");
  // let options = {
  //   html: true,
  //   breaks: true,
  //   linkify: true
  // };
  // let opts = {
  //   permalink: true,
  //   permalinkClass: "direct-link",
  //   permalinkSymbol: "#"
  // };

  // eleventyConfig.setLibrary("md", markdownIt(options)
  //   .use(markdownItAnchor, opts)
  // );

  // eleventyConfig.setBrowserSyncConfig({
  //   callbacks: {
  //     ready: function(err, browserSync) {
  //       const content_404 = fs.readFileSync('_site/404.html');

  //       browserSync.addMiddleware("*", (req, res) => {
  //         // Provides the 404 content without redirect.
  //         res.write(content_404);
  //         res.end();
  //       });
  //     }
  //   }
  // });

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ['h2', 'h3'],
    // wrapperClass: 'grid-toc',
  });

  // Example Markdown configuration (to add IDs to the headers)
  const markdownIt = require('markdown-it');
  const markdownItAnchor = require('markdown-it-anchor');
  eleventyConfig.setLibrary(
    'md',
    markdownIt({
      html: true,
      linkify: true,
      typographer: true,
    }).use(markdownItAnchor, {}),
  );

  // Only run in --serve mode.
  if (process.argv.includes('--serve')) {
    function onWatchEvent() {
      child_process.execSync('cat ../docs/* > index.md', {
        cwd: __dirname,
        encoding: 'utf8',
      });
    }
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(path.join(__dirname, '../docs/*.md'), {
      persistent: true,
      ignoreInitial: true,
      disableGlobbing: false,
    });
    watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
    watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
    watcher.on('unlink', (fileLoc) => onWatchEvent(fileLoc));
  }
  
  return {
    // templateFormats: [
    //   "md",
    //   "njk",
    //   "html",
    //   "liquid"
    // ],

    // // If your site lives in a different subdirectory, change this.
    // // Leading or trailing slashes are all normalized away, so don’t worry about it.
    // // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // // This is only used for URLs (it does not affect your file structure)
    // pathPrefix: "/",

    // markdownTemplateEngine: "liquid",
    // htmlTemplateEngine: "njk",
    // dataTemplateEngine: "njk",
    // passthroughFileCopy: true,
    dir: {
      input: path.join(__dirname, '.'),
      includes: '_eleventy',
      // data: path.join(__dirname, 'data'),
      output: path.join(__dirname, '_site'),
    },
  };
};
