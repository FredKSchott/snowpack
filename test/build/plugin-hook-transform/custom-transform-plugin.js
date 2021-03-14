const MagicString = require('magic-string');

module.exports = function () {
  return {
    transform: async ({id, fileExt, contents}) => {
      const ms = new MagicString(contents);
      ms.appendLeft(contents.indexOf('console.log'), `console.log('transformed');\n`);
      const map = ms.generateMap({hires: false, includeContent: true});
      // Due to Windows issue, we set "sources" here (and not in generateMap())
      map.sources = [id];
      return {
        contents: ms.toString(),
        // Try returning both object and string map formats.
        map: fileExt === '.js' ? map : map.toString(),
      };
    },
  };
};
