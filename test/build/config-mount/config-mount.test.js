const fs = require('fs');
const path = require('path');
const glob = require('glob');
const cheerio = require('cheerio');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

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
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
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
      const $ = cheerio.load(files['/new-g/main.html']);
      expect(files['/new-g/index.js']).toEqual(expect.stringContaining(`import "./dep.js";`)); // formatter ran
      expect($('script[type="module"]').attr('src')).toBe('/g/index.js'); // JS resolved
    });

    it('static', () => {
      const $ = cheerio.load(files['/h/main.html']);
      expect($('script[type="module"]').attr('src')).toBe('/_dist_/index.js'); // JS resolved
    });

    it('resolve: false', () => {
      expect(files['/i/index.js']).toEqual(expect.stringContaining(`import "./dep";`)); // JS not resolved
    });
  });
});
