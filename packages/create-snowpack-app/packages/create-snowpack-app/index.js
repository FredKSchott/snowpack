#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const execa = require("execa");
const yargs = require("yargs-parser");
const { copy, removeSync } = require("fs-extra");
const chalk = require("chalk");

function validateArgs(args) {
  const { template, useYarn, force, target, _ } = yargs(args);
  if (!target && _.length === 2) {
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
  const targetDirectoryRelative = target || _[2];
  const targetDirectory = path.resolve(process.cwd(), targetDirectoryRelative);
  if (fs.existsSync(targetDirectory) && !force) {
    console.error(
      `${chalk.red(
        "[ERROR]"
      )} ${targetDirectory} already exists. Use \`--force\` to overwrite this directory.`
    );
    process.exit(1);
  }
  return {
    template,
    useYarn,
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
      )} The template is not a CSA template (missing "csa-template" keyword in package.json), check the template name to make sure you are using the current template name.`
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
  await fs.promises.writeFile(
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
  await fs.promises.writeFile(
    path.join(dir, ".gitignore"),
    [".build", "build", "web_modules", "node_modules"].join("\n")
  );
}

const {
  template,
  useYarn,
  targetDirectoryRelative,
  targetDirectory,
} = validateArgs(process.argv);
const installedTemplate = path.join(targetDirectory, "node_modules", template);

const currentVersion = process.versions.node;
const requiredVersion = parseInt(currentVersion.split(".")[0], 10);

if (requiredVersion < 10) {
  console.error(
    chalk.red(`Node.js v${currentVersion} is out of date and not supported!`)
  );
  console.error(`Please use Node.js v10.16.0 or higher.`);
  process.exit(1);
}

(async () => {
  console.log(`\n  - Using template ${chalk.cyan(template)}`);
  console.log(`  - Creating a new project in ${chalk.cyan(targetDirectory)}`);

  fs.mkdirSync(targetDirectory, { recursive: true });
  await fs.promises.writeFile(
    path.join(targetDirectory, "package.json"),
    `{"name": "my-csa-app"}`
  );
  try {
    await execa("npm", ["install", template, "--ignore-scripts"], {
      cwd: targetDirectory,
      all: true,
    });
  } catch (err) {
    // Only log output if the command failed
    console.error(err.all);
    throw err;
  }
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
  try {
    await execa("git", ["init"], { cwd: targetDirectory });
    await execa("git", ["add", "-A"], { cwd: targetDirectory });
    await execa("git", ["commit", "-m", "initial commit"], {
      cwd: targetDirectory,
    });
    console.log(`  - ${chalk.green("Success!")}`);
  } catch (err) {
    console.log(`  - ${chalk.yellow("Could not complete.")}`);
  }

  function formatCommand(command, description) {
    return '  ' + command.padEnd(17) + chalk.dim(description)
  }

  console.log(``);
  console.log(chalk.bold.underline(`Quickstart:`));
  console.log(``);
  console.log(`  cd ${targetDirectoryRelative}`);
  console.log(`  ${useYarn ? "yarn" : "npm"} start`);
  console.log(``);
  console.log(chalk.bold.underline(`All Commands:`));
  console.log(``);
  console.log(formatCommand(`${useYarn ? "yarn" : "npm"} install`, "Install your dependencies. (We already ran this one for you!)"));
  console.log(formatCommand(`${useYarn ? "yarn" : "npm"} start`, "Start your development server."));
  console.log(formatCommand(`${useYarn ? "yarn" : "npm run"} build`, "Build your website for production."));
  console.log(formatCommand(`${useYarn ? "yarn" : "npm"} test`, "Run your tests."));
  console.log(``);
})();
