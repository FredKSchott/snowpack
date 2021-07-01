module.exports = async () => {
  // enable NO_COLOR mode for Jest
  process.env.NO_COLOR = true;
  // Clear the temp directory
  const path = require('path');
  const del = require('del');
  const fs = require('fs');
  await del(path.join(__dirname, 'test', '__temp__'));
  fs.mkdirSync(path.join(__dirname, 'test', '__temp__'));
};
