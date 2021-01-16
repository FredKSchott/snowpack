# Changelog

> _For older releses, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/snowpack)._

## snowpack@3.0.6 [2021-01-13]

- 8f614490 - final cleanup before v3 goes out
- 15d77ea3 - cleanup

## snowpack@3.0.7 [2021-01-13]

- 61bd4c3b - [ci] yarn format
- eb5b366a - cleanup types, release script
- 20e3ed21 - move skypack and esbuild into real dependencies for now
- e63d70fd - fix direct foo.svelte.css references
- 01a80448 - [ci] yarn format

## snowpack@3.0.8 [2021-01-13]

- c2124bd7 - json fix
- e040f071 - Fix postcss-modules being required as a dependency in projects (#2257) <David Bailey>
- c566aa10 - add bundled type support for esinstall and skypack, remove as full deps
- ecf85d52 - move open back to regular dependency
- b0f7280c - [ci] yarn format

## snowpack@3.0.9 [2021-01-13]

- d26c7733 - [ci] yarn format

## snowpack@3.0.10 [2021-01-13]

- 1d071628 - cleanup the bundled build before publishing
- beb3f9a1 - stop ignoring postcss in generated bundle
- 2b797521 - [ci] yarn format


## snowpack@3.0.11 [2021-01-16]

* 58a36d4c - fix bad build conditional check 
* 37f7a55d - remove empty build folders from build 
* 6e01eeb5 - improve build watch output 
* 137c58b0 - fix init file issue 
* e2b74e7b - add fallback deprecation 
* 968720cf - remove rollup from bundle to pass peerDep checks 
* 70d25dad - Resolves #2265 (#2289) <Josh Wilson>
* 7b38b486 - get tests passing 
* e6b618c5 - [ci] yarn format 