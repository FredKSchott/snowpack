---
layout: layouts/content.njk
title: Command Line API
---

### Commands

TODO

### Flags

```bash
# Show helpful info
$ snowpack --help

# Show additional debugging logs
$ snowpack --verbose

# {installOptions: {dest: 'CUSTOM_DIR/'}}
$ snowpack install --dest CUSTOM_DIR/

# {devOptions: {bundle: true}}
$ snowpack dev --bundle

# {devOptions: {bundle: false}}
$ snowpack dev --no-bundle

# {buildOptions: {clean: true}}
$ snowpack build --clean
```

**CLI flags will be merged with (and take priority over) your config file values.** Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--config [path]`** Set the path to your project config file.
- **`--help`** Show this help.
- **`--version`** Show the current version.
- **`--reload`** Clear the local cache. Useful for troubleshooting installer issues.
