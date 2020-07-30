const fs = require('fs').promises;
const path = require('path');

module.exports = function () {
  return {
    optimize: async ({buildDirectory}) => {
      await fs.writeFile(path.join(buildDirectory, 'artifact.txt'), 'TEST: Directory optimized!');
    },
  };
};
