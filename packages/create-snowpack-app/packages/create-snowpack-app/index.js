#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const execa = require("execa");
const yargs = require("yargs-parser");
const { copy, removeSync } = require("fs-extra");
const colors = require("kleur");

const errorAlert = `${colors.red("[ERROR]")}`;
const errorLink = `${colors.dim(
  colors.underline("https://github.com/pikapkg/create-snowpack-app")
)}`;

let installer = "npm";

function validateArgs(args) {
  const { template, useYarn, usePnpm, force, target, _ } = yargs(args);
  if (useYarn && usePnpm) {
    console.error(
      `${errorAlert} You can not use Yarn and pnpm at the same time. ${errorLink}`
    );
    process.exit(1);
  }
  if (!target && _.length === 2) {
    console.error(`${errorAlert} Missing --target directory. ${errorLink}`);
    process.exit(1);
  }
  if (typeof template !== "string") {
    console.error(`${errorAlert} Missing --template argument. ${errorLink}`);
    process.exit(1);
  }
  if (_.length > 3) {
    console.error(`${errorAlert} Unexpected extra arguments. ${errorLink}`);
    process.exit(1);
  }
  const targetDirectoryRelative = target || _[2];
  const targetDirectory = path.resolve(process.cwd(), targetDirectoryRelative);
  if (fs.existsSync(targetDirectory) && !force) {
    console.error(
      `${errorAlert} ${targetDirectory} already exists. Use \`--force\` to overwrite this directory.`
    );
    process.exit(1);
  }
  return {
    template,
    useYarn,
    usePnpm,
    targetDirectoryRelative,
    targetDirectory,
  };
}

async function verifyProjectTemplate(isLocalTemplate, { template, dir}) {
  let keywords
  if (isLocalTemplate) {
    const packageManifest = path.join(dir, "package.json");
    keywords = require(packageManifest).keywords
  } else {
    try {
      const {stdout} = await execa("npm", ["info", template, "keywords", '--json']);
      keywords = JSON.parse(stdout)
    } catch (err) {
      console.log()
      if (err.stderr) {
        console.error(`${errorAlert} Unable to find "${colors.cyan(template)}" in the npm registry.`)
      } else {
        console.log(err)
      }
      console.error(`${errorAlert} Cannot continue safely. Exiting...`);
      process.exit(1);
    }
  }
  
  if (!keywords || !keywords.includes("csa-template")) {
    console.error(
      `\n${errorAlert} The template is not a CSA template (missing "${colors.yellow('csa-template')}" keyword in package.json), check the template name to make sure you are using the current template name.`
    );
    console.error(`${errorAlert} Cannot continue safely. Exiting...`);
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
  usePnpm,
  targetDirectoryRelative,
  targetDirectory,
} = validateArgs(process.argv);

if (useYarn) {
  installer = "yarn";
} else if (usePnpm) {
  installer = "pnpm";
}

const isLocalTemplate = template.startsWith("."); // must start with a `.` to be considered local
const installedTemplate = isLocalTemplate
  ? path.resolve(targetDirectory, template) // handle local template
  : path.join(targetDirectory, "node_modules", template); // handle template from npm/yarn

const currentVersion = process.versions.node;
const requiredVersion = parseInt(currentVersion.split(".")[0], 10);

if (requiredVersion < 10) {
  console.error(
    colors.red(`Node.js v${currentVersion} is out of date and not supported!`)
  );
  console.error(`Please use Node.js v10.16.0 or higher.`);
  process.exit(1);
}

(async () => {
  await verifyProjectTemplate(isLocalTemplate, { dir: installedTemplate, template })

  console.log(`\n  - Using template ${colors.cyan(template)}`);
  console.log(`  - Creating a new project in ${colors.cyan(targetDirectory)}`);

  fs.mkdirSync(targetDirectory, { recursive: true });
  await fs.promises.writeFile(
    path.join(targetDirectory, "package.json"),
    `{"name": "my-csa-app"}`
  );
  // fetch from npm or GitHub if not local (which will be most of the time)
  if (!isLocalTemplate) {
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
  }
  await copy(installedTemplate, targetDirectory);
  await cleanProject(targetDirectory);

  console.log(
    `  - Installing package dependencies. This might take a couple of minutes.\n`
  );
  const npmInstallOptions = {
    cwd: targetDirectory,
    stdio: "inherit",
  };

  function installProcess(packageManager) {
    switch (packageManager) {
      case "npm":
        return execa(
          "npm",
          ["install", "--loglevel", "error"],
          npmInstallOptions
        );
      case "yarn":
        return execa("yarn", ["--silent"], npmInstallOptions);
      case "pnpm":
        return execa(
          "pnpm",
          ["install", "--reporter=silent"],
          npmInstallOptions
        );
      default:
        throw new Error("Unspecified package installer.");
    }
  }

  const npmInstallProcess = installProcess(installer);
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
    console.log(`  - ${colors.green("Success!")}`);
  } catch (err) {
    console.log(`  - ${colors.yellow("Could not complete.")}`);
  }

  function formatCommand(command, description) {
    return "  " + command.padEnd(17) + colors.dim(description);
  }

  console.log(``);
  console.log(colors.bold(colors.underline(`Quickstart:`)));
  console.log(``);
  console.log(`  cd ${targetDirectoryRelative}`);
  console.log(`  ${installer} start`);
  console.log(``);
  console.log(colors.bold(colors.underline(`All Commands:`)));
  console.log(``);
  console.log(
    formatCommand(
      `${installer} install`,
      "Install your dependencies. (We already ran this one for you!)"
    )
  );
  console.log(
    formatCommand(`${installer} start`, "Start your development server.")
  );
  console.log(
    formatCommand(
      `${installer} run build`,
      "Build your website for production."
    )
  );
  console.log(formatCommand(`${installer} test`, "Run your tests."));
  console.log(``);
})();
