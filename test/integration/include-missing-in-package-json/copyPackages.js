const fs = require('fs-extra');
const path = require('path');

fs.readdirSync(path.join(__dirname, 'packages')).forEach((pkg) => {
  fs.copySync(path.join(__dirname, 'packages', pkg), path.join(__dirname, 'node_modules', pkg));
});
