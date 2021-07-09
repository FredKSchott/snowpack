import fs from 'fs';
import colors from 'kleur/colors';
import {Config, InitConfig} from '../../@types/snowpack';
import {logger} from '../util/logger';

/** Sanitize & normalize config, and set defaults */
export function normalizeConfig(config: Partial<Config>, cwd: URL): InitConfig {
  // defaults (overwrite below)
  const normalizedConfig: InitConfig = {
    buildOptions: {
      out: './dist/',
    },
    devOptions: {
      hmr: true,
      hmrDelay: 0,
      hmrPort: 12321,
      hostname: 'localhost',
      port: 8080,
      secure: {
        cert: Buffer.from(''),
        key: Buffer.from(''),
      },
      static: './public/',
    },
    entryPoints: [],
    exclude: [
      '**/_*.{sass,scss}', // ignore Sass partials from scanning
      '**.d.ts', // ignore TypeScript defs
      '**/node_modules/**', // We want to ignore all node_modules directories.
    ],
    mode: 'development',
    srcRoot: './src/',
  };

  // buildOptions
  if (typeof config.buildOptions === 'object') {
    if (typeof config.buildOptions.out === 'string') config.buildOptions.out.replace(/\/?$/, '/');
  }

  // devOptions
  if (typeof config.devOptions === 'object') {
    // devOptions.hmr
    if (typeof config.devOptions.hmr === 'boolean')
      normalizedConfig.devOptions.hmr = config.devOptions.hmr;
    // devOptions.hostname
    if (typeof config.devOptions.hostname === 'string')
      normalizedConfig.devOptions.hostname = config.devOptions.hostname;
    // devOptions.port
    if (typeof config.devOptions.port === 'number')
      normalizedConfig.devOptions.port = config.devOptions.port;
    // devOptions.secure
    if (config.devOptions.secure === true) {
      try {
        normalizedConfig.devOptions.secure = {
          cert: fs.readFileSync(new URL('./snowpack.crt', cwd)),
          key: fs.readFileSync(new URL('./snowpack.key', cwd)),
        };
      } catch (e) {
        logger.error(`✘ No HTTPS credentials found!`);
        logger.info(`You can specify HTTPS credentials via either:

    - Including credentials in your project config under ${colors.yellow(`devOptions.secure`)}.
    - Including ${colors.yellow('snowpack.crt')} and ${colors.yellow(
          'snowpack.key',
        )} files in your project's root directory.

      You can automatically generate credentials for your project via either:

    - ${colors.cyan('devcert')}: ${colors.yellow('npx devcert-cli generate localhost')}
      https://github.com/davewasmer/devcert-cli (no install required)

    - ${colors.cyan('mkcert')}: ${colors.yellow(
          'mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost',
        )}
      https://github.com/FiloSottile/mkcert (install required)`);
        process.exit(1);
      }
    } else if (typeof config.devOptions.secure === 'object') {
      normalizedConfig.devOptions.secure = config.devOptions.secure;
    }
    // devOptions.static
    if (config.devOptions.static)
      normalizedConfig.devOptions.static = config.devOptions.static.replace(/\/?$/, '/');
  }

  // entryPoints
  if (Array.isArray(config.entryPoints)) normalizedConfig.entryPoints = config.entryPoints;

  // exclude
  if (typeof config.exclude === 'string') {
    normalizedConfig.exclude.push(config.exclude);
  } else if (Array.isArray(config.exclude)) {
    normalizedConfig.exclude.push(...config.exclude);
  }
  normalizedConfig.exclude.push(`${normalizedConfig.buildOptions.out}**`); // also ignore output dir

  // mode
  if (config.mode) normalizedConfig.mode = config.mode;

  return normalizedConfig;
}
