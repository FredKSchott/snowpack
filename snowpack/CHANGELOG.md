# Changelog

> _For older releases, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/snowpack)._

<!-- add changelog entries here - do not delete! -->

## snowpack@3.6.2 [2021-06-24]

* 33cd5648 - Pass real filepath to transform plugins (#3483) <Drew Powers>

## snowpack@3.6.1 [2021-06-23]

* 110043e2 - Check externals before resolving entrypoint (#3479) <Matthew Phillips>

## snowpack@3.6.0 [2021-06-22]

* fb7eaaa4 - Allow `external` CommonJS modules to be imported properly in Node (#3473) <Matthew Phillips>
* 8cff0336 - Make import.meta.url be the file URL in SSR (#3472) <Matthew Phillips>
* 29e609aa - [#3188] Add ant-design/icons to NEVER_PEER_PACKAGES (#3443) <manish gowardipe>
* ded85e8a - Minor optimization on resolving path starts with '.' (#3361) <Jacty>
* ffee2c57 - allow configuring loader (#3377) <Michael St Clair>
* b8c76b00 - Fix websocket proxying (#3225) <Gael du Plessix>

## snowpack@3.5.9 [2021-06-16]

* 343274e2 - [ci] yarn format <matthewp>
* d93d01ec - Fix race condition reading existing import-map.json files (#3453) <Matthew Phillips>

## snowpack@3.5.8 [2021-06-16]

* 611dac9a - [ci] yarn format <matthewp>
* 7a1ae463 - Handle runtime invalidation for proxy files (#3449) <Matthew Phillips>

## snowpack@3.5.7 [2021-06-10]

* 6e7f137b - [ci] yarn format <matthewp>
* dc44eb75 - Disconnect the HMR server when snowpack is shutdown (#3439) <Matthew Phillips>

## snowpack@3.5.6 [2021-06-07]

* f0534bb7 - [ci] yarn format <matthewp>
* 6ef3695d - Allow Snowpack to scan .astro files for imports (#3423) <Matthew Phillips>

## snowpack@3.5.5 [2021-06-04]

* d61fb0a8 - [ci] yarn format <matthewp>
* aed6a8fd - Modules marked as `external` should always be treated as external (#3408) <Matthew Phillips>
* cd6ec781 - [ci] yarn format <matthewp>
* 64b377e3 - Correctly handle subpackage imports marked as external (#3407) <Matthew Phillips>

## snowpack@3.5.4 [2021-06-01]

* 78d6ecf1 - Fix: remove external override (#3401) <Nate Moore>

## snowpack@3.5.3 [2021-06-01]

* c659b7c3 - [ci] yarn format <natemoo-re>
* b375b8a3 - Fix `external` behavior for local package source and SSR. (#3399) <Nate Moore>

## snowpack@3.5.2 [2021-05-27]

* 0f65cdf2 - fix: construct NotFoundError before throwing (#3380) <Nate Moore>

## snowpack@3.5.1 [2021-05-21]

* 398ad9f1 - Allow clean shutdown of dev server (#3349) <Drew Powers>

## snowpack@3.5.0 [2021-05-20]

* 91bb53c0 - Don’t cache .css files for Tailwind projects (#3326) <Drew Powers>
* 48f9c524 - [ci] yarn format <drwpow>
* 84e39f8a - Enable cache directory path to be set explicitly (#3064) <François Wouts>
* 45e2a22b - Avoid uncaught exception when file is deleted (#3313) <Adam Hupp>
* e321bbee - resolve `.css` ESM imports to `.css.{js,ts}` if there's no `.css` file on disk (#3315) <Matt Mulder>

## snowpack@3.4.0 [2021-05-13]

* 4403595e - Sourcemaps (#3271) <Luke Jackson>
* fa7a5e3f - Typo (#3291) <Jacty>
* 680272eb - Fix appending port 80 to url sometimes breaks hmr connectivity #3268 (#3269) <Mark Dorrill>
* dc60a025 - chore: update create-snowpack-app template deps (#3233) <Drew Powers>

## snowpack@3.3.7 [2021-04-29]

* 5e34b829 - Fix missing build files from load plugins (#3230) <Drew Powers>

## snowpack@3.3.6 [2021-04-29]

* 9ad97afe - fix: CSS Modules exporting {} when no mount config (#3229) <Drew Powers>
* ff1eaf66 - [ci] yarn format <drwpow>
* 0707fd63 - fix: add mounted node_modules to ignore list (#3227) <Ivo Reis>
* f53e1833 - chore: bump Snowpack version (#3228) <Drew Powers>
* 3701201b - Support packageOptions.rollup.plugins (#3123) <Spike>
* cea40a05 - Removes console log (#3204) <Luke Jackson>
* 3af6e064 - [ci] yarn format <matthewp>
* 1902f5c2 - Correctly resolve preload urls from build manifest (#3201) <Luke Jackson>

## snowpack@3.3.4 [2021-04-20]

* 8f044398 - Restore proxy SSR rewriting for CSS Modules proxy (#3191) <Drew Powers>
* 870b34c2 - Take the result of the first plugin (#3190) <Matthew Phillips>
* 758bdb27 - Fix Sass + CSS Modules (#3186) <Drew Powers>
* 5e58fc64 - fix: Race condition in symlink directory read (#3181) <Bjørn Stabell>
* 28ea1f86 - [ci] yarn format <natemoo-re>
* e6861227 - Support mounting within node_modules directory (#3134) 
* a089d86a - Test fixtures continued (#3100) <Luke Jackson>

## snowpack@3.3.3 [2021-04-16]

* 1f82543d - Fix publicPath option in esbuild (#3175) <Drew Powers>
* 83294444 - Add CSS Modules in Build SSR (#3170) <Drew Powers>

## snowpack@3.3.2 [2021-04-16]

* dfd200a8 - [ci] yarn format <matthewp>
* fa96e618 - Use a separate PackageSource for each config (#3164) <Matthew Phillips>

## snowpack@3.3.1 [2021-04-15]

* 35e38b6c - [ci] yarn format <matthewp>
* a3951e31 - Refactor the build to improve reusability (#3157) <Matthew Phillips>

## snowpack@3.3.0 [2021-04-14]

* d9956f73 - add explicit "mode" config (#3135) 
* 25ed2885 - [ci] yarn format 
* 6a15f872 - Fix env.js always having MODE and NODE_ENV as development (#3132) <Francisco Sousa>
* 63e30d32 - Revert "improve node_modules excluding" 
* 3b3402bb - improve node_modules excluding 
* 48618f05 - fix: remove tailing slash in import specifier as esinstall do (#3102) <yqrashawn>
* b0481aa8 - Honor devOptions.hmr option, fixes #3105 (#3114) <Matt Walker>
* 42da07e4 - fix: sourcemap config copy paste typo in config.ts in pr #2793 (#3115) <yqrashawn>
* 9eb50368 - update deps (#2928) 
* deacbcd0 - Streaming Package Imports v2 (#3028) 
* 18b9f09b - Simplify test suite (#2858) 

## snowpack@3.2.2 [2021-04-01]

* a643af33 - Detect Sass partial changes in dev (#3060) <Drew Powers>

## snowpack@3.2.1 [2021-03-31]

* 0663c1ac - fix HMR issue 

## snowpack@3.2.0 [2021-03-31]

* 56c5a231 - fix typo in changelog 
* c3971f10 - add snowpack release notes 
* 40f02cf4 - reorder changelog entries 
* a25f407d - Update CHANGELOG.md 
* c9dacc29 - Update CHANGELOG.md 
* a676d665 - fix website package.json 
* 68df7237 - support remote import if specifier has version in it 
* 16f58b99 - [ci] yarn format 
* d3859c8d - fix lint 
* 598f05a7 - Feat: import.meta.glob and import.meta.globEager support (#2881) <Nate Moore>
* 57a65bb8 - [ci] yarn format 
* 685f2200 - add docs, cleanup handler 
* 5fe83d4d - [ci] yarn format 
* 844cbcbe - routes support upgrade event (#2988) <dishuostec>
* a17dd97c - Fix: Only import directory/index.js as a fallback mechanism (#3018) <François Wouts>
* e340dea9 - Do not exclude folders starting with a dot (#2962) <Matthew Phillips>
* fc6c1417 - Improve CSS error message (#2973) <Drew Powers>
* b41b14b0 - Await promises in local source (#2972) <Drew Powers>

## snowpack@3.1.2 [2021-03-20]

* e50cb745 - fix better handling for unscannable cjs packages
* 1232e252 - add back cjs-cjs compat from an earlier pr (#2934)

## snowpack@3.1.1 [2021-03-19]

* f53498ba - Fix preact regression (#2926) 

## snowpack@3.1.0 [2021-03-19]

* 872bfc74 - [ci] yarn format <natemoo-re>
* c8aee80f - Support compound output file extensions (#2593) <Edward Faulkner>
* 8dbd6af3 - [ci] yarn format <natemoo-re>
* 88d3a9a9 - handle legacy package urls (#2915) 
* 094b7a12 - Add `openUrl` option to config (#2902) <Dan Marshall>
* aba028c4 - [ci] yarn format <natemoo-re>
* 4de244ef - Add support for custom TLS key files via devOptions.secure = { cert, key } (#2356) <Aral Balkan>
* da049ce4 - [ci] yarn format <natemoo-re>
* b569d35b - add getUrlForPackage utility (#2913) <Nate Moore>
* d826a60c - Remove enumerability of converted ESM in SSR (#2920) <Matthew Phillips>
* 941110cd - fix esbuild 0.9.x breaking change (#2914) 
* 35289b4b - improve import scanner perf (#2900) 
* a800bf3d - finalize picomatch support (#2912) 
* d33076a3 - Speed up exclusions with picomatch  (#2904) <Ismail Syed>
* 84e034cc - [ci] yarn format 
* f35bc421 - fix debug log 
* 81fd028e - [ci] yarn format <natemoo-re>
* 7c8236e8 - Add config.env property to support non-prefixed env variables (#2390) <moonrailgun>
* 337cfd7a - only target actual imports (Regex Fix) (#2817) <Danzo7>
* aa953cca - refactor: update to esbuild 0.9 (#2886) <Ludovico Fischer>
* cd4f344b - [ci] yarn format <natemoo-re>
* 0fce7efd - Support buildOptions.jsxInject in config (#2884) <Nate Moore>
* dc503c84 - speed up mount scanning with fdir (#2876) 
* e8dead62 - improve handling of "." & ".." imports (#2877) 
* a178f286 - run transform on all dependencies (#2878) 
* 27321b83 - collect known imports by package and version 
* 3a6ad53a - update (#2363) <Myou Aki>
* b2738967 - improve cjs<>esm conversion of named exports (#2859) 
* 3ba7fede - feat: support specifying sourcemap type in config.optimize.sourcemap (#2793) <yqrashawn>
* 03ceb62d - Resolve missing extensions (#2839) <Drew Powers>
* 28689888 - [ci] yarn format 
* 689f58e9 - SSR fixes (#2853) <Matthew Phillips>
* 3549e43c - Fix Mac OS devOptions.open bug (#2798) <joakim-mjardner>
* 21461ce5 - Update @snowpack/plugin-postcss API (#2854) <Drew Powers>
* 9fbe93fb - fix: revert snowpack to v3.0.13 for CI tests (#2851) <Nate Moore>
* 339d3cf1 - [ci] yarn format <natemoo-re>
* ea4ebd17 - Proper loading of ESM config files (#2834) <Nate Moore>
* 8f022949 - snowpack@3.1.0-pre.12 
* 9d987e4a - fix watching logic and dashboard output 
* 15428ae4 - [ci] yarn format 
* bea1c56c - Simplify. cleanup, enhance snowpack internals (#2707) 
* 43677e89 - Add import support for .interface files, alongside .svelte, and .vue. (#2380) <Aral Balkan>
* 3d457a8e - fix(ssr-loader): support css modules (#2528) <Nate Moore>
* 23d7b450 - fix: recognise dot as a valid relative import (#2662) <Jon Rimmer>
* 582808c3 - [ci] yarn format 
* deabcb0e - don't escape utf-8 characters by cheerio and esbuild (#2755) <bsl-zcs>
* d35d50b4 - [ci] yarn format 
* b756b49d - Fix snowpack add/rm for npm packages with @ prefix (#2665) <Nigel>
* 58df86d4 - add a tip if someone uses process.env 
* fdda447d - dont match meta paths to routes 

## snowpack@3.0.13 [2021-02-23]

* 74d0be10 - add resolve for bundled package 


## snowpack@3.0.12 [2021-02-23]

* d3b6f769 - Support packages that use export maps but have no main (#2659) <Matthew Phillips>
* 2ae933be - add true logger error message 
* 0de849ee - Catch WebSocket message parse errors (#2470) <Ben Foxall>
* da75ff23 - remove circular dependencies in util (#2366) 
* bfa32aff - proper default browser support for mac (#2364) 
* 1c44c22d - fix bad url access in import maps, snowpack add 
* 76dca31a - add octet-stream handling 
* 10f3461b - [ci] yarn format 
* 615f13a7 - Add isHmrEnabled and isSSR to plugin transform. (#2332) <Chris Thomas>
* 65008c63 - fix: prettier snowpack/src/build dir (#2346) <ZYSzys>
* 690d3b1d - update prettier to use explicit formatting 
* f07105a9 - Add root level export of clearCache (#2330) <Kevin Scott>
* 137139b4 - [ci] yarn format 
* e0f01181 - fix: prettier format (#2316) <ZYSzys>
* 0fc858cf - fix bad optimize external filter 
* fb167098 - load plugins relative to config root 
* 85ddf618 - add JS API docs (#2315) 
* 49b29f97 - [ci] yarn format 

## snowpack@3.0.11 [2021-01-16]

- 58a36d4c - fix bad build conditional check
- 37f7a55d - remove empty build folders from build
- 6e01eeb5 - improve build watch output
- 137c58b0 - fix init file issue
- e2b74e7b - add fallback deprecation
- 968720cf - remove rollup from bundle to pass peerDep checks
- 70d25dad - Resolves #2265 (#2289) <Josh Wilson>
- 7b38b486 - get tests passing
- e6b618c5 - [ci] yarn format

## snowpack@3.0.10 [2021-01-13]

- 1d071628 - cleanup the bundled build before publishing
- beb3f9a1 - stop ignoring postcss in generated bundle
- 2b797521 - [ci] yarn format

## snowpack@3.0.9 [2021-01-13]

- d26c7733 - [ci] yarn format

## snowpack@3.0.8 [2021-01-13]

- c2124bd7 - json fix
- e040f071 - Fix postcss-modules being required as a dependency in projects (#2257) <David Bailey>
- c566aa10 - add bundled type support for esinstall and skypack, remove as full deps
- ecf85d52 - move open back to regular dependency
- b0f7280c - [ci] yarn format

## snowpack@3.0.7 [2021-01-13]

- 61bd4c3b - [ci] yarn format
- eb5b366a - cleanup types, release script
- 20e3ed21 - move skypack and esbuild into real dependencies for now
- e63d70fd - fix direct foo.svelte.css references
- 01a80448 - [ci] yarn format

## snowpack@3.0.6 [2021-01-13]

- 8f614490 - final cleanup before v3 goes out
- 15d77ea3 - cleanup
