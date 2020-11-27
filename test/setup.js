/**
 * This contains no tests; it only sets up the directory.
 */
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const execa = require('execa');

// setup for /tests/build/*
async function setupBuildTests() {
  // set NODE_ENV = 'test'
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  console.time(`Building tests…`);
  await Promise.all(
    glob
      .sync(path.join(__dirname, 'build', '*/package.json'))
      .map(path.dirname)
      .map((testdir) => {
        const capitalize = testdir === 'entrypoint-ids' && os.platform() === 'win32';
        return execa('yarn', ['testbuild'], {cwd: capitalize ? testdir.toUpperCase() : testdir});
      }),
  );
  console.timeEnd(`Building tests…`);

  // reset NODE_ENV
  process.env.NODE_ENV = originalEnv;
}
setupBuildTests();
