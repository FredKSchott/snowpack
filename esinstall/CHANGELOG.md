# Changelog

> _For older releases, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/esinstall)._

<!-- add changelog entries here - do not delete! -->

## esinstall@1.1.4 [2021-04-05]

* 9eb50368 - update deps (#2928) 
* d542762a - Add execa dependency for esinstall (#3075) <Matthew Phillips>

## esinstall@1.1.3 [2021-04-01]

* 332d69ed - Adding property expr to solve #2945 (#3063) <Nahuel Veron>

## esinstall@1.1.2 [2021-03-31]

* 56c5a231 - fix typo in changelog 
* 836338b5 - add react-transition-group to bad cjs scanner list 
* 22dd802e - no longer need tslib workaround 
* 74c4661e - add "events" to bad cjs scanning packages list 
* 40f02cf4 - reorder changelog entries 
* fc6c1417 - Improve CSS error message (#2973) <Drew Powers>

## esinstall@1.1.1 [2021-03-20]

* e50cb745 - fix better handling for unscannable cjs packages 
* 1232e252 - add back cjs-cjs compat from an earlier pr (#2934) 

## esinstall@1.1.0 [2021-03-19]

* a800bf3d - finalize picomatch support (#2912) 
* b2738967 - improve cjs<>esm conversion of named exports (#2859) 
* c3ecc7da - [ci] yarn format <natemoo-re>
* 92057561 - Fix: warn on missing export (#2826) <Nate Moore>
* bea1c56c - Simplify. cleanup, enhance snowpack internals (#2707) 
* 6f514a0d - [ci] yarn format <matthewp>
* 8280627d - fix issue with types package (#2768) 
* bb1ca50a - url not needed in esinstall 
* 19cdf5ca - ignore data imports from build or scan 
* 435692d0 - make stats optional, speed up perf (#2708) 
* b82c472e - [ci] yarn format 
* 81d9ff88 - fix unnecessary filtering of absolute aliases (#2424) <Jon Rimmer>
* c0501f72 - [ci] yarn format <matthewp>
* d3b6f769 - Support packages that use export maps but have no main (#2659) <Matthew Phillips>
* 520112b6 - Update the changelog <Matthew Phillips>

## esinstall@1.0.5 [2021-02-04]

* ec3c29fd - Pin rollup version to fix tree shaking bugs (#2572) <Matthew Phillips>
* 4ffc1c10 - add support for internal export map imports (#2507) 

## esinstall@1.0.4 [2021-01-27]

* 150cdf30 - Fix explodeExportMap expanding dirs (#2493) <Drew Powers>
* 977621dc - properly scan named imports from events polyfill package 

## esinstall@1.0.3 [2021-01-16]

- 6b105339 - add esinstall missing import hint (#2299)
- 15a27ac9 - support additional main fields in sub-dependencies (#2298) <Aaron Ross>

## esinstall@1.0.2 [2021-01-13]

- 15d77ea3 - cleanup
