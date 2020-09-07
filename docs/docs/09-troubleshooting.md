## Troubleshooting

### No such file or directory

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

This error message would sometimes occur in older versions of Snowpack.

**To solve this issue:** Upgrade to Snowpack `v2.6.0` or higher. If you continue to see this unexpected error in newer versions of Snowpack, please file an issue.

### Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.

### Uncaught SyntaxError: The requested module '/web_modules/XXXXXX.js' does not provide an export named 'YYYYYY'

Snowpack follow's Node.js's CJS-ESM interoperability strategy, where Common.js packages are always exported to the default export (`import react`) and do not support named exports (`import * as react`). Many packages, however, document these named exports in their READMEs and assume that your bundler will support it. We automatically add support for named exports to a small number of very popular packages (like React) that use this sort of documentation.

**To solve this issue:** Add the failing package to `installOptions.namedExports` and Snowpack will create those named exports for you automatically (note: you may need to re-run Snowpack with the `--reload` flag to apply this update).

```json
// snowpack.config.json
{
  "installOptions": {
    "namedExports": ["someModule"]
  }
}
```

