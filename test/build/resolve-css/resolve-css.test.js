const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('CSS resolution', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('resolved all CSS files', () => {
    // test that all files made it into the final bundle
    ['build/a.css', 'build/b.css', 'build/c.css', 'build/d/d.css', 'build/_dist_/f.css'].forEach(
      (filename) => {
        expect(files['/styles.css']).toEqual(expect.stringContaining(`/* ${filename} */`));
      },
    );
  });

  it('didn’t double-import', () => {
    // test that no duplication occurred
    expect(files['/styles.css'].match(/\/\* build\/a\.css \*\//)).toHaveLength(1);
  });
});
