const MagicString = require('magic-string');

module.exports = function () {
  return {
    transform: async ({id, fileExt, contents}) => {
      const ms = new MagicString(contents);
      ms.appendLeft(contents.indexOf('console.log'), `console.log('transformed');\n`);
      const map = ms.generateMap({source: id, hires: false, includeContent: true});
      return {
        contents: ms.toString(),
        // Try returning both object and string map formats.
        map: fileExt === '.js' ? map : map.toString()
      }
    },
  };
};
