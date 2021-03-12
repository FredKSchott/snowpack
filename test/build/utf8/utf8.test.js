const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('utf8', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it("Unicode characters aren't escaped in html", () => {
    expect(files['/index.html']).toEqual(
      expect.stringContaining("проверка юникода"),
    );
  });

  it("Unicode characters aren't escaped in typescript", () => {
    expect(files['/index.js']).toEqual(
      expect.stringContaining("юникод не эскейпится 👌"),
    );
  });
});
