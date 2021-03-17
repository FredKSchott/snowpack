const path = require('path');
const {setupBuildTest, readFiles, stripWS} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('import-glob', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('import.meta.glob is transformed correctly', () => {
    expect(stripWS(files['/_dist_/glob.js']))
      .toEqual(`import * as __SNOWPACK_ENV__ from '../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"./pages/a.js": () => import("./pages/a.js"),
\t"./pages/b.js": () => import("./pages/b.js"),
\t"./pages/c.js": () => import("./pages/c.js")
};`);
  });

  it('import.meta.glob with an absolute glob is transformed relative to the project root', () => {
    expect(stripWS(files['/_dist_/globAbsolute.js']))
      .toEqual(`import * as __SNOWPACK_ENV__ from '../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"./pages/a.js": () => import("./pages/a.js"),
\t"./pages/b.js": () => import("./pages/b.js"),
\t"./pages/c.js": () => import("./pages/c.js")
};`);
  });

  it('import.meta.globEager is transformed correctly', () => {
    expect(stripWS(files['/_dist_/globEager.js']))
      .toEqual(`import * as __glob__0_0 from './pages/a.js';
import * as __glob__0_1 from './pages/b.js';
import * as __glob__0_2 from './pages/c.js';
import * as __SNOWPACK_ENV__ from '../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"./pages/a.js": __glob__0_0,
\t"./pages/b.js": __glob__0_1,
\t"./pages/c.js": __glob__0_2
};`);
  });

  it('import.meta.glob supports aliases', () => {
    expect(stripWS(files['/_dist_/globAlias.js']))
      .toEqual(`import * as __SNOWPACK_ENV__ from '../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"./pages/a.js": () => import("./pages/a.js"),
\t"./pages/b.js": () => import("./pages/b.js"),
\t"./pages/c.js": () => import("./pages/c.js")
};`);
  });

  it('import.meta.glob supports aliases from deeply nested directory', () => {
    expect(stripWS(files['/_dist_/deep/nest/globAlias.js']))
      .toEqual(`import * as __SNOWPACK_ENV__ from '../../../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"../../pages/a.js": () => import("../../pages/a.js"),
\t"../../pages/b.js": () => import("../../pages/b.js"),
\t"../../pages/c.js": () => import("../../pages/c.js")
};`);
  });

  it('import.meta.glob supports absolute globs from deeply nested directory', () => {
    expect(stripWS(files['/_dist_/deep/nest/globAbsolute.js']))
      .toEqual(`import * as __SNOWPACK_ENV__ from '../../../_snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;
const modules = {
\t"../../pages/a.js": () => import("../../pages/a.js"),
\t"../../pages/b.js": () => import("../../pages/b.js"),
\t"../../pages/c.js": () => import("../../pages/c.js")
};`);
  });

  it('import.meta.glob does not import its own source file', () => {
    expect(stripWS(files['/_dist_/globSelf.js'])).not.toContain('globSelf.js');
  });
});
