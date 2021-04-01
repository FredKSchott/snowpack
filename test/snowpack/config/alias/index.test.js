const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('alias', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Rewrites imports as expected', async () => {
    const result = await testFixture(
      {
        alias: {
          'aliased-dep': 'array-flatten',
          '@app': './src',
          '@/': './src/',
          '%': '.',
          '@sort': './src/sort.js',
          $public: './public',
        },
        mount: {
          './src': '/_dist_',
          './public': '/',
        },
        buildOptions: {
          baseUrl: 'https://example.com/foo',
          metaUrlPath: '/TEST_WMU/',
        },
        plugins: ['@snowpack/plugin-svelte', './simple-file-extension-change-plugin.js'],
      },
      {
        'packages/css-package-a/style.css': dedent`
          body {
            color: red;
          }
        `,
        'packages/css-package-a/package.json': dedent`
          {
            "name": "css-package-a",
            "version": "1.2.3"
          }
        `,
        'packages/css-package-b/style.css': dedent`
          body {
            color: blue;
          }
        `,
        'packages/css-package-b/package.json': dedent`
          {
            "name": "css-package-a",
            "version": "1.2.3"
          }
        `,
        'public/robots.txt': dedent`
          THIS IS A ROBOTS.TXT TEST FILE            
        `,
        'src/foo.svelte': dedent`
          <div class="Foo" />           
        `,
        'src/index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="Web site created using create-snowpack-app" />
              <title>Snowpack App</title>
            </head>
            <body>
              <script type="module" src="%PUBLIC_URL%/_dist_/index.js"></script>
              <script type="module">
                // Path aliases
                import {flatten} from 'array-flatten';
                import * as aliasedDep from 'aliased-dep';
                console.log(flatten, aliasedDep);

                // Importing a relative URL
                import sort from './sort'; // relative import
                import sort_ from '@app/sort'; // bare import using alias
                import sort__ from '@app/sort.js'; // bare import using alias + extension
                import sort___ from '@/sort'; // bare import using alias with trailing slash
                import sort____ from '@sort'; // bare import using file alias
                console.log(sort, sort_, sort__, sort___, sort____);

                // Importing a 1:1 built file
                import oneToOneBuild from './test-mjs.mjs'; // plugin-provided file extension
                import oneToOneBuild_ from './test-mjs'; // plugin-provided, missing file extension
                console.log(oneToOneBuild, oneToOneBuild_);

                // Importing a 1:N built file
                import oneToManyBuild from './foo.svelte'; // plugin-provided file extension
                console.log(oneToManyBuild);

                // Importing an absolute URL: we don't touch these
                import absoluteUrl from '/_dist_/sort.js'; // absolute import
                import absoluteUrl_ from '/_dist_/foo.svelte.js'; // absolute URL, plugin-provided file extension
                import absoluteUrl__ from '/_dist_/test-mjs.js'; // absolute URL, missing file extension
                console.log(absoluteUrl, absoluteUrl_, absoluteUrl__);

                // Importing a directory index.js file
                import components from './components'; // relative import
                import components_ from './components/index'; // relative import with index appended
                import components__ from './components/index.js'; // relative import with index appended
                import components___ from '@app/components'; // bare import using alias
                import components____ from '@app/components/index'; // bare import using alias and index appended
                import components_____ from '@app/components/index.js'; // bare import using alias and index.js appended
                console.log(
                  components,
                  components_,
                  components__,
                  components___,
                  components____,
                  components_____,
                );

                // Importing something that isn't JS
                import styles from './components/style.css'; // relative import
                import styles_ from '@app/components/style.css'; // relative import
                console.log(styles, styles_);

                import robotsTxtRef from '../public/robots.txt';
                import robotsTxtRef_ from '$public/robots.txt';
                console.log(robotsTxtRef, robotsTxtRef_);
              </script>

              <!-- exception test 1: comments should be ignored -->
              <!-- <script type="module" src="preact"></script> -->

              <!-- exception test 2: ignore script tags that aren’t type="module" -->
              <script src="svelte"></script>

              <!-- exception test 3: obviously ignore HTML (this tests our RegEx) -->
              <pre><code>import React from 'react';</code></pre>

              <script></script>
            </body>
          </html>
        `,
        'src/index.js': dedent`
          // Path aliases
          import {flatten} from 'array-flatten';
          import * as aliasedDep from 'aliased-dep';
          console.log(flatten, aliasedDep);

          // Importing a relative URL
          import sort from './sort'; // relative import
          import sort_ from '@app/sort'; // bare import using alias
          import sort__ from '@app/sort.js'; // bare import using alias + extension
          import sort___ from '@/sort'; // bare import using alias with trailing slash
          import sort____ from '@sort'; // bare import using file alias
          console.log(sort, sort_, sort__, sort___, sort____);

          // Importing a 1:1 built file
          import oneToOneBuild from './test-mjs.mjs'; // plugin-provided file extension
          import oneToOneBuild_ from './test-mjs'; // plugin-provided, missing file extension
          console.log(oneToOneBuild, oneToOneBuild_);

          // Importing a 1:N built file
          import oneToManyBuild from './foo.svelte'; // plugin-provided file extension
          console.log(oneToManyBuild);

          // Importing an absolute URL: we don't touch these
          import absoluteUrl from '/_dist_/sort.js'; // absolute URL
          import absoluteUrl_ from '/_dist_/foo.svelte.js'; // absolute URL
          import absoluteUrl__ from '/_dist_/test-mjs.js'; // absolute URL
          console.log(absoluteUrl, absoluteUrl_, absoluteUrl__);

          // Importing a directory index.js file
          import components from './components'; // relative import
          import components______ from './components/'; // relative import with trailing slash
          import components_ from './components/index'; // relative import with index appended
          import components__ from './components/index.js'; // relative import with index appended
          import components___ from '@app/components'; // bare import using alias
          import components____ from '@app/components/index'; // bare import using alias and index appended
          import components_____ from '@app/components/index.js'; // bare import using alias and index.js appended
          import components2 from '%/src/components'; // alias % to '.'
          console.log(
            components,
            components_,
            components__,
            components___,
            components____,
            components_____,
            components______,
            components2,
          );

          // Importing something that isn't JS
          import styles from './components/style.css'; // relative import
          import styles_ from '@app/components/style.css'; // relative import
          console.log(styles, styles_);

          import adSvg from '@fortawesome/fontawesome-free/svgs/solid/ad.svg';
          console.log(adSvg);

          // Importing across mounted directories
          import robotsTxtRef from '../public/robots.txt';
          import robotsTxtRef_ from '$public/robots.txt';
          console.log(robotsTxtRef, robotsTxtRef_);
        `,
        'src/sort.js': dedent`
          export default (arr) => arr.sort();         
        `,
        'src/test-mjs.mjs': dedent`
          // Path aliases
          import {flatten} from 'array-flatten';
          console.log(flatten);       
        `,
        'src/components/index.js': dedent`
          import sort from '../sort';
          console.log(sort);
          
          export default 'Button';             
        `,
        'src/components/style.css': dedent`
          /* Include 2+ imports to make sure regex isn't borked. */
          @import 'css-package-a/style.css';
          @import '@css/package-b/style.css';            
        `,
        'src/nested/index.js': dedent`
          import sort from '../sort';
          console.log(sort);
          
          export default 'Button';        
        `,
        'src/nested/foo.js': dedent`
          // importing index.js by shortcut
          import index from '.';
          import index_ from './';
          import index__ from '..';
          import index___ from '../';
          console.log(index, index_, index__, index___);
        `,
        'simple-file-extension-change-plugin.js': dedent`
          const {load} = require('signal-exit');

          module.exports = function () {
            return {
              resolve: {
                input: ['.svelte'],
                output: ['.js', '.css'],
              },
              load() {
                // Not tested in this test.
                return null;
              },
            };
          };          
        `,
        'package.json': dedent`
          {
            "private": true,
            "version": "1.0.1",
            "name": "@snowpack/test-build-config-alias",
            "dependencies": {
              "@fortawesome/fontawesome-free": "^5.14.0",
              "array-flatten": "^3.0.0",
              "snowpack": "^3.0.0",
              "css-package-a": "file:./packages/css-package-a",
              "@css/package-b": "file:./packages/css-package-b"
            }
          }
        `,
      },
    );

    expect(result['_dist_/index.html']).toMatchSnapshot();
    expect(result['_dist_/index.js']).toMatchSnapshot();
    expect(result['_dist_/nested/foo.js']).toMatchSnapshot();
  });
});
