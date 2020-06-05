import chalk from 'chalk';
import isNodeBuiltin from 'is-builtin-module';
import {Plugin} from 'rollup';

/**
 * rollup-plugin-catch-unresolved
 *
 * Catch any unresolved imports to give proper warnings (Rollup default is to ignore).
 */
export function rollupPluginCatchUnresolved(): Plugin {
  return {
    name: 'snowpack:rollup-plugin-catch-unresolved',
    resolveId(id, importer) {
      if (!isNodeBuiltin(id)) {
        console.error(
          chalk.red(
            chalk.bold(`! ${id}`) + ` is imported by '${importer}', but could not be resolved.`,
          ),
        );
        return false;
      }

      console.error(
        chalk.red(
          chalk.bold(`! ${id}`) +
            ` is a Node.js built-in module that does not exist in the browser.\n`,
        ),
      );
      console.error(
        `  1. Search pika.dev for a more web-friendly package alternative${
          importer ? ` to ${chalk.bold(importer)}.` : '.'
        }`,
      );
      console.error(
        `  2. Or, add this rollup plugin to your installer to polyfill Node.js packages:\n\n` +
          chalk.dim(
            `      // snowpack.config.js\n` +
              `      module.exports = {\n` +
              `        installOptions: {\n` +
              `          rollup: {plugins: [require("rollup-plugin-node-polyfills")()]}\n` +
              `        }\n` +
              `      };\n`,
          ),
      );
      return false;
    },
  };
}
