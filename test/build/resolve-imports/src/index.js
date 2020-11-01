// Path aliases
import {flatten} from 'array-flatten';
import * as aliasedDep from 'aliased-dep';
console.log(flatten, aliasedDep);

// Importing a file
import sort from './sort'; // relative import
import sort_ from '/_dist_/sort.js'; // absolute import
import sort__ from '@app/sort'; // bare import using alias
import sort___ from '@app/sort.js'; // bare import using alias + extension
import sort____ from '@/sort'; // bare import using alias with trailing slash
import sort_____ from '@sort'; // bare import using file alias
console.log(sort, sort_, sort__, sort___, sort___, sort____, sort_____);

// Note: file does not need to exist for these checks:
import svelteFile from './foo.svelte'; // plugin-provided file extension
import svelteFile_ from './foo'; // plugin-provided, missing file extension
import svelteFile__ from '/foo.svelte'; // absolute URL, plugin-provided file extension
import svelteFile___ from '/foo'; // absolute URL, missing file extension
console.log(svelteFile, svelteFile_, svelteFile__, svelteFile___);

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
