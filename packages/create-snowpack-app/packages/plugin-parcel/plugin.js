const path = require("path");
const { promises: fs } = require("fs");
const execa = require("execa");
const npmRunPath = require("npm-run-path");
const { copy } = require("fs-extra");
const cwd = process.cwd();
const util = require("util");
const glob = require("glob");
const readFolderAsync = util.promisify(glob);

module.exports = function parcelBundlePlugin(config, options) {
  return {
    type: "bundle",
    defaultBuildScript: "bundle:*",
    async bundle({ srcDirectory, destDirectory, log, jsFilePaths }) {
      // Prepare the new build directory by copying over all static assets
      // This is important since sometimes Parcel doesn't pick these up.
      await copy(srcDirectory, destDirectory, {
        filter: (srcLoc) => {
          return !jsFilePaths.has(srcLoc);
        },
      });
      const tempBuildManifest = JSON.parse(
        await fs.readFile(path.join(cwd, "package.json"), { encoding: "utf-8" })
      );
      delete tempBuildManifest.name;
      delete tempBuildManifest.babel;
      tempBuildManifest.devDependencies =
        tempBuildManifest.devDependencies || {};
      tempBuildManifest.devDependencies["@babel/core"] =
        tempBuildManifest.devDependencies["@babel/core"] || "^7.9.0";
      tempBuildManifest.browserslist =
        tempBuildManifest.browserslist ||
        ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all";
      await fs.writeFile(
        path.join(srcDirectory, "package.json"),
        JSON.stringify(tempBuildManifest, null, 2)
      );
      await fs.writeFile(
        path.join(srcDirectory, ".babelrc"),
        `{"plugins": [[${JSON.stringify(
          require.resolve("@babel/plugin-syntax-import-meta")
        )}]]}` // JSON.stringify is needed because on windows, \ in paths need to be escaped
      );
      const fallbackFile = await fs.readFile(
        path.join(srcDirectory, config.devOptions.fallback),
        {
          encoding: "utf-8",
        }
      );
      await fs.writeFile(
        path.join(srcDirectory, config.devOptions.fallback),
        fallbackFile.replace(/type\=\"module\"/g, "")
      );
      // Remove PostCSS config since it's no longer needed. Parcel does its own optimization.
      await fs
        .unlink(path.join(srcDirectory, "postcss.config.js"))
        .catch((/* ignore */) => null);
      await fs
        .unlink(path.join(srcDirectory, ".postcssrc"))
        .catch((/* ignore */) => null);
      await fs
        .unlink(path.join(srcDirectory, ".postcssrc.js"))
        .catch((/* ignore */) => null);

      // Get all html files from the output folder
      const pattern = srcDirectory + "/**/*.html";
      const files = await readFolderAsync(pattern);

      const parcelOptions = ["build", ...files, "--out-dir", destDirectory];

      // config.homepage is legacy, remove in future version
      const baseUrl = config.buildOptions.baseUrl || config.homepage;
      if (baseUrl) {
        parcelOptions.push("--public-url", baseUrl);
      }

      const bundleAppPromise = execa("parcel", parcelOptions, {
        cwd: srcDirectory,
        env: npmRunPath.env(),
        extendEnv: true,
      });
      if (bundleAppPromise.stdout) {
        bundleAppPromise.stdout.on("data", (b) => log(b.toString()));
      }
      if (bundleAppPromise.stderr) {
        bundleAppPromise.stderr.on("data", (b) => log(b.toString()));
      }

      return bundleAppPromise;
    },
  };
};
