module.exports = async () => {
    // enable NO_COLOR mode for Jest
    process.env.NO_COLOR = true; 
    // Clear the temp directory
    const path = require('path');
    const rimraf = require('rimraf');
    const fs = require('fs');
    rimraf.sync(path.join(__dirname, 'test', '__temp__'));
    fs.mkdirSync(path.join(__dirname, 'test', '__temp__'));
};