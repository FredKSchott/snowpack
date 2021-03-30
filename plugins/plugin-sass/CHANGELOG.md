# Changelog

> *For older releses, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/plugins/plugin-sass).*

## @snowpack/plugin-sass@1.3.1 [2021-03-16]

* 85377715 - fix wrong argument to parseCompilerOption(array[]) (#2547) <Danzo7>
* edef1986 - Fix Sass partial changes not triggering recompiles in Dev (#2792) <Mark Miller>
* b0c6b5a0 - [ci] yarn format <matthewp>
* 549c3ca5 - Properly find npm install sass when running outside of snowpack project (#2812) <Matthew Phillips>
* 397f06e6 - SASS plugin, fix default argument Array check (#2670) <Leon Montealegre>
* 123f2c96 - add loadPath support via compilerOptions instead of includePaths 
* cbfe71d2 - [ci] yarn format 
* 6c56f4bd - add includePaths option to plugin-sass (#2443) <Danzo7>
* 3b4b1a06 - add warning if compilerOptions is used 
* f94f5a55 - [ci] yarn format 
* b702f698 - more testing cleanup 
* 7b38b486 - get tests passing 
* 71bb73b5 - [ci] yarn format 
* 48d8b9c7 - skip failing windows sass test 

## @snowpack/plugin-sass@1.4.0 [2021-03-23]

* c71a3888 - Improve @snowpack/plugin-sass resolution (#2964) <Drew Powers>