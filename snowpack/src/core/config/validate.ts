import {Config} from '../../@types/snowpack';

/** Does a config object have a property defined? */
function expect(obj: any, prop: string, {type, name}: {type: string; name: string}) {
  if (typeof obj !== 'object') return;
  if (!obj.hasOwnProperty(prop) || obj[prop] === undefined) return;
  if (
    (type === 'Array' && !Array.isArray(obj[prop])) ||
    (type !== 'Array' && typeof obj[prop] !== type)
  ) {
    throw new Error(`[config] ${name} expected ${type}, received ${typeof obj[prop]}`);
  }
}

/** Loop through all options, throw errors if mismatch */
export function validateConfig(config: Partial<Config>) {
  // buildOptions
  if (config.buildOptions) {
    // boolean: buildOptions.ssr, buildOptions.watch
    for (const k of ['ssr', 'watch']) {
      expect(config.buildOptions, k, {type: 'boolean', name: `buildOptions.${k}`});
    }
  }

  // devOptions
  if (config.devOptions) {
    // devOptions.hmr
    expect(config.devOptions, 'hmr', {type: 'boolean', name: 'devOptions.hmr'});
    // devOptions.hmrDelay
    expect(config.devOptions, 'hmrDelay', {type: 'number', name: 'devOptions.hmrDelay'});
    // devOptions.hmrPort
    expect(config.devOptions, 'hmrPort', {type: 'number', name: 'devOptions.hmrPort'});
    // devOptions.hostname
    expect(config.devOptions, 'hostname', {type: 'string', name: 'devOptions.hostname'});
    // devOptions.port
    expect(config.devOptions, 'port', {type: 'number', name: 'devOptions.port'});
    // devOptions.secure
    if (typeof config.devOptions.secure === 'object') {
      for (const k of ['cert', 'key']) {
        if (!Buffer.isBuffer(config.devOptions.secure[k]))
          throw new Error(
            `[config] devOptions.secure.${k} must pass the key directly (ex: ${k}: fs.readFileSync('/path/to/cert'))`,
          );
      }
    } else if (
      typeof config.devOptions.secure !== 'boolean' &&
      config.devOptions.secure !== undefined
    ) {
      throw new Error(
        `[config] devOptions.secure must be a boolean or an object (ex: { cert: fs.readFileSync('/path/to/snowpack.crt'), key: fs.readFileSync('/path/to/snowpack.key') })`,
      );
    }
    // devOptions.static
    expect(config.devOptions, 'static', {type: 'string', name: 'devOptions.static'});
  }

  // mode
  if (config.mode) {
    if (!new Set(['development', 'production', 'test']).has(config.mode)) {
      throw new Error(
        `[config] mode must be "development", "production", or "test". Received "${config.mode}"`,
      );
    }
  }

  // srcRoot
  expect(config, 'srcRoot', {type: 'string', name: 'srcRoot'});

  // TODO: throw on deprecated options
}
