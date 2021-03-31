# Changelog

> _For older releses, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/esinstall)._

## esinstall@1.0.2 [2021-01-13]

- 15d77ea3 - cleanup

## esinstall@1.0.3 [2021-01-16]

- 6b105339 - add esinstall missing import hint (#2299)
- 15a27ac9 - support additional main fields in sub-dependencies (#2298) <Aaron Ross>


## esinstall@1.0.4 [2021-01-27]

* 150cdf30 - Fix explodeExportMap expanding dirs (#2493) <Drew Powers>
* 977621dc - properly scan named imports from events polyfill package 

## esinstall@1.0.5 [2021-02-04]

* ec3c29fd - Pin rollup version to fix tree shaking bugs (#2572) <Matthew Phillips>
* 4ffc1c10 - add support for internal export map imports (#2507) 

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

## esinstall@1.1.1 [2021-03-20]

* e50cb745 - fix better handling for unscannable cjs packages 
* 1232e252 - add back cjs-cjs compat from an earlier pr (#2934) 