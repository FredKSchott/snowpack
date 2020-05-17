import execa from 'execa';
import {promises as fs} from 'fs';
import npmRunPath from 'npm-run-path';
import path from 'path';
import rimraf from 'rimraf';
const {copy} = require('fs-extra');
const cwd = process.cwd();

export function parcelBundlePlugin(config, args) {
  return {
    async bundle({srcDirectory, destDirectory, log, jsFilePaths}) {
      // Prepare the new build directory by copying over all static assets
      // This is important since sometimes Parcel doesn't pick these up.
      await copy(srcDirectory, destDirectory, {
        filter: (srcLoc) => {
          return !jsFilePaths.has(srcLoc);
        },
      });
      const tempBuildManifest = JSON.parse(
        await fs.readFile(path.join(cwd, 'package.json'), {encoding: 'utf-8'}),
      );
      delete tempBuildManifest.name;
      delete tempBuildManifest.babel;
      tempBuildManifest.devDependencies = tempBuildManifest.devDependencies || {};
      tempBuildManifest.devDependencies['@babel/core'] =
        tempBuildManifest.devDependencies['@babel/core'] || '^7.9.0';
      tempBuildManifest.browserslist =
        tempBuildManifest.browserslist || '>0.75%, not ie 11, not UCAndroid >0, not OperaMini all';
      await fs.writeFile(
        path.join(srcDirectory, 'package.json'),
        JSON.stringify(tempBuildManifest, null, 2),
      );
      await fs.writeFile(
        path.join(srcDirectory, '.babelrc'),
        `{"plugins": [[${JSON.stringify(require.resolve('@babel/plugin-syntax-import-meta'))}]]}`, // JSON.stringify is needed because on windows, \ in paths need to be escaped
      );
      const fallbackFile = await fs.readFile(path.join(srcDirectory, config.devOptions.fallback), {
        encoding: 'utf-8',
      });
      await fs.writeFile(
        path.join(srcDirectory, config.devOptions.fallback),
        fallbackFile.replace(/type\=\"module\"/g, ''),
      );
      // Remove PostCSS config since it's no longer needed. Parcel does its own optimization.
      rimraf.sync(path.join(srcDirectory, 'postcss.config.js'));
      rimraf.sync(path.join(srcDirectory, '.postcssrc'));
      rimraf.sync(path.join(srcDirectory, '.postcssrc.js'));

      const parcelOptions = ['build', config.devOptions.fallback, '--out-dir', destDirectory];

      if (config.homepage) {
        parcelOptions.push('--public-url', config.homepage);
      }

      const bundleAppPromise = execa('parcel', parcelOptions, {
        cwd: srcDirectory,
        env: npmRunPath.env(),
        extendEnv: true,
      });
      bundleAppPromise.stdout?.on('data', (b) => log(b.toString()));
      bundleAppPromise.stderr?.on('data', (b) => log(b.toString()));

      return bundleAppPromise;
    },
  };
}
