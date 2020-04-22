const execa = require("execa");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs-parser");
const { copy } = require("fs-extra");

(async () => {
  const { template, _ } = yargs(process.argv);
  console.log(_);
  if (_.length === 2) {
    console.log(`Missing target directory`);
    process.exit(1);
  }
  if (!template) {
    console.log(`Missing --template`);
    process.exit(1);
  }
  if (_.length > 3) {
    console.log(`Unexpected multiple arguments`);
    process.exit(1);
  }

  const targetDirectory = path.resolve(process.cwd(), _[2]);

  fs.mkdirSync(targetDirectory, { recursive: true });
  console.log(targetDirectory);
  execa.sync("npm", ["init", "--yes"], {
    cwd: targetDirectory,
  });
  console.log(
    execa.sync("npm", ["install", template, "--ignore-scripts"], {
      cwd: targetDirectory,
    })
  );

  const installedTemplate = path.join(
    targetDirectory,
    "node_modules",
    template
  );
  console.log(installedTemplate);
  await copy(installedTemplate, targetDirectory);

  const newRootPackageManifest = path.join(targetDirectory, "package.json");
  const {
    scripts,
    dependencies,
    devDependencies,
  } = require(newRootPackageManifest);
  const { install, start, build, test, ...otherScripts } = scripts;
  await fs.promises.writeFile(
    newRootPackageManifest,
    JSON.stringify(
      {
        scripts: { install, start, build, test, ...otherScripts },
        dependencies,
        devDependencies,
      },
      null,
      2
    )
  );

  // 1. verify target directory
  // 2. verify template
  // mkdir target
  // const tarballUrl = `npm view level dist.tarball`
  // download and unpack tarball to tmp directory

  // copy pkg/template dir to target-directory
  // 3. install package
})();
