const fs = require('fs');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');
const snowpack = require('../../../snowpack');
const {getFile} = require('../../test-utils');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

 

function generateContentsMap(dir) {
  const contentMap = {};
  const allFiles = glob.sync(dir + '**/*', {nodir: true});
  allFiles.sort((a, b) => a.localeCompare(b, {numeric: true}));
  allFiles.forEach((file) => {
    contentMap[path.relative(dir, file)] = fs.readFileSync(file, 'utf8');
  });
  return contentMap;
}

describe('config: mount', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, 'a')]: '/a',
        [path.resolve(TEST_ROOT, 'src/b')]: '/new-b',
        [path.resolve(TEST_ROOT, 'src/c')]: '/deep/c',
        [path.resolve(TEST_ROOT, 'src/d')]: '/bad/d/',
        [path.resolve(TEST_ROOT, 'src/e/f')]: '/e',
        [path.resolve(TEST_ROOT, 'src/g')]: {url: '/new-g'},
        [path.resolve(TEST_ROOT, 'src/h')]: {url: '/h', static: true},
        [path.resolve(TEST_ROOT, 'src/i')]: {url: '/i', static: false, resolve: false},
        [path.resolve(TEST_ROOT, 'src/j')]: {url: '/j', static: true, resolve: false},
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  describe('basic', () => {
    const tests = [
      {
        name: 'allows direct mappings',
        given: 'a',
        expect: 'a',
      },
      {
        name: 'allows renamed mappings',
        given: 'src/b',
        expect: 'new-b',
      },
      {
        name: 'allows renamed mappings 2',
        given: 'src/c',
        expect: 'deep/c',
      },
      {
        name: 'allows ending file slash',
        given: 'src/d',
        expect: 'bad/d', // this mount key has a trailing slash in config, but it should still appear at this path
      },
      {
        name: 'allows renamed mappings 3',
        given: 'src/e/f',
        expect: 'e',
      },
      {
        name: 'static + resolve',
        given: 'src/j',
        expect: 'j',
      },
    ];

    tests.forEach((t) => {
      it(t.name, () => {
        const given = generateContentsMap(path.join(__dirname, t.given));
        const expected = generateContentsMap(path.join(__dirname, 'build', t.expect));
        expect(given).toEqual(expected);
      });
    });
  });

  describe('advanced', () => {
    it('url', () => {
      const $ = cheerio.load( getFile(result, TEST_OUT, './new-g/main.html'));
      expect( getFile(result, TEST_OUT, './new-g/index.js')).toEqual(expect.stringContaining(`import "./dep.js";`)); // formatter ran
      expect($('script[type="module"]').attr('src')).toBe('/_dist_/index.js'); // JS resolved
    });

    it('static', () => {
      const $ = cheerio.load( getFile(result, TEST_OUT, './h/main.html'));
      expect($('script[type="module"]').attr('src')).toBe('/_dist_/index.js'); // JS resolved
    });

    it('resolve: false', () => {
      expect( getFile(result, TEST_OUT, './i/index.js')).toEqual(expect.stringContaining(`import "./dep";`)); // JS not resolved
    });
  });
});
