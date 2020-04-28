#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const execa = require("execa");
const yargs = require("yargs-parser");
const { copy, removeSync } = require("fs-extra");
const chalk = require("chalk");

function validateArgs(args) {
  const { template, useYarn, _ } = yargs(args);
  if (_.length === 2) {
    console.error(
      `${chalk.red("[ERROR]")} Missing --target directory. ${chalk.dim(
        chalk.underline("https://github.com/pikapkg/create-snowpack-app")
      )}`
    );
    process.exit(1);
  }
  if (typeof template !== "string") {
    console.error(
      `${chalk.red("[ERROR]")} Missing --template argument. ${chalk.dim(
        chalk.underline("https://github.com/pikapkg/create-snowpack-app")
      )}`
    );
    process.exit(1);
  }
  if (_.length > 3) {
    console.error(
      `${chalk.red("[ERROR]")} Unexpected extra arguments. ${chalk.dim(
        chalk.underline("https://github.com/pikapkg/create-snowpack-app")
      )}`
    );
    process.exit(1);
  }
  const targetDirectoryRelative = _[2];
  const targetDirectory = path.resolve(process.cwd(), targetDirectoryRelative);
  if (fs.existsSync(targetDirectory)) {
    console.error(`${chalk.red("[ERROR]")} ${targetDirectory} already exists`);
    process.exit(1);
  }
  return {
    template,
    useYarn: !!yarn,
    targetDirectoryRelative,
    targetDirectory,
  };
}

async function verifyProjectTemplate(dir) {
  const packageManifest = path.join(dir, "package.json");
  const { keywords } = require(packageManifest);
  if (!keywords || !keywords.includes("csa-template")) {
    console.error(
      `\n${chalk.red(
        "[ERROR]"
      )} Template is not properly marked as a CSA template (Missing "csa-template" keyword in package.json).`
    );
    console.error(`${chalk.red("[ERROR]")} Cannot continue safely. Exiting...`);
    process.exit(1);
  }
}

async function cleanProject(dir) {
  const packageManifest = path.join(dir, "package.json");
  removeSync(path.join(dir, "package-lock.json"));
  removeSync(path.join(dir, "node_modules"));

  const {
    scripts,
    webDependencies,
    dependencies,
    devDependencies,
  } = require(packageManifest);
  const { prepare, start, build, test, ...otherScripts } = scripts;
  return fs.promises.writeFile(
    packageManifest,
    JSON.stringify(
      {
        scripts: { prepare, start, build, test, ...otherScripts },
        webDependencies,
        dependencies,
        devDependencies,
      },
      null,
      2
    )
  );
}

const {
  template,
  useYarn,
  targetDirectoryRelative,
  targetDirectory,
} = validateArgs(process.argv);
const installedTemplate = path.join(targetDirectory, "node_modules", template);

(async () => {
  console.log(`\n  - Using template ${chalk.cyan(template)}`);
  console.log(`  - Creating a new project in ${chalk.cyan(targetDirectory)}`);

  fs.mkdirSync(targetDirectory, { recursive: true });
  await execa("npm", ["install", template, "--ignore-scripts"], {
    cwd: targetDirectory,
  });
  await copy(installedTemplate, targetDirectory);
  await verifyProjectTemplate(targetDirectory);
  await cleanProject(targetDirectory);

  console.log(
    `  - Installing package dependencies. This might take a couple of minutes.\n`
  );
  const npmInstallProcess = execa(
    useYarn ? "yarn" : "npm",
    ["install", "--loglevel", "error"],
    {
      cwd: targetDirectory,
      stdio: "inherit",
    }
  );
  npmInstallProcess.stdout && npmInstallProcess.stdout.pipe(process.stdout);
  npmInstallProcess.stderr && npmInstallProcess.stderr.pipe(process.stderr);
  await npmInstallProcess;

  console.log(`\n  - Initializing git repo.\n`);
  await execa("git", ["init"], { cwd: targetDirectory });
  console.log(`  - ${chalk.green("Success!")}`);

  console.log(``);
  console.log(chalk.bold.underline(`Quickstart:`));
  console.log(``);
  console.log(`  cd ${targetDirectoryRelative}`);
  console.log(`  ${useYarn ? "yarn" : "npm"} start`);
  console.log(``);
  console.log(chalk.bold.underline(`All Commands:`));
  console.log(``);
  console.log(`  ${useYarn ? "yarn" : "npm"} start`);
  console.log(`  ${chalk.dim("Starts the development server.")}`);
  console.log(`  ${useYarn ? "yarn" : "npm run"} build`);
  console.log(
    `  ${chalk.dim("Bundles the app into static files for production.")}`
  );
  console.log(`  ${useYarn ? "yarn" : "npm"} test`);
  console.log(`  ${chalk.dim("Starts the test runner.")}`);
  console.log(`  ${useYarn ? "yarn" : "npm"} install`);
  console.log(`  ${chalk.dim("Install all dependencies (npm + snowpack).")}`);
  console.log(`  ${chalk.dim("We already ran this one for you.")}`);
  console.log(``);
})();
