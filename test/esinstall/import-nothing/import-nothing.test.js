const {install} = require('../../../esinstall/lib');

describe('error-no-dep-list', () => {
  it('importing nothing', async () => {
    return expect(() =>
      install(
        [
          /* nothing! */
        ],
        {cwd: __dirname},
      ),
    ).rejects.toThrowError(`No ESM dependencies found!
  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at https://www.skypack.dev`);
  });
});
