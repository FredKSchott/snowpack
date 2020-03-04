## [3.1.6](https://github.com/vuejs/vue-router/compare/v3.1.5...v3.1.6) (2020-02-26)


### Bug Fixes

* preserve history state when reloading ([a4ec3e2](https://github.com/vuejs/vue-router/commit/a4ec3e2))
* **ts:** add null to Route.name ([#3117](https://github.com/vuejs/vue-router/issues/3117)) ([8f831f2](https://github.com/vuejs/vue-router/commit/8f831f2))
* correctly calculate `path` when `pathMatch` is empty string ([#3111](https://github.com/vuejs/vue-router/issues/3111)) ([38e6ccd](https://github.com/vuejs/vue-router/commit/38e6ccd)), closes [#3106](https://github.com/vuejs/vue-router/issues/3106)



## [3.1.5](https://github.com/vuejs/vue-router/compare/v3.1.4...v3.1.5) (2020-01-15)


### Bug Fixes

* **view:** add passing props to inactive component ([#2773](https://github.com/vuejs/vue-router/issues/2773)) ([0fb1343](https://github.com/vuejs/vue-router/commit/0fb1343)), closes [#2301](https://github.com/vuejs/vue-router/issues/2301)
* **view:** fix deeply nested keep-alive router-views displaying ([#2930](https://github.com/vuejs/vue-router/issues/2930)) ([0c2b1aa](https://github.com/vuejs/vue-router/commit/0c2b1aa)), closes [#2923](https://github.com/vuejs/vue-router/issues/2923)



## [3.1.4](https://github.com/vuejs/vue-router/compare/v3.1.3...v3.1.4) (2020-01-14)


### Bug Fixes

* suppress warning if `pathMatch` is empty ([#3081](https://github.com/vuejs/vue-router/issues/3081)) ([ddc6bc7](https://github.com/vuejs/vue-router/commit/ddc6bc7)), closes [#3072](https://github.com/vuejs/vue-router/issues/3072)
* **link:** correctly warn wrong v-slot usage ([a150291](https://github.com/vuejs/vue-router/commit/a150291)), closes [#3091](https://github.com/vuejs/vue-router/issues/3091)
* **location:** add a copy for params with named locations ([#2802](https://github.com/vuejs/vue-router/issues/2802)) ([2b39f5a](https://github.com/vuejs/vue-router/commit/2b39f5a)), closes [#2800](https://github.com/vuejs/vue-router/issues/2800) [#2938](https://github.com/vuejs/vue-router/issues/2938) [#2938](https://github.com/vuejs/vue-router/issues/2938)


### Features

* **history:** preserve existing history.state ([c0d3376](https://github.com/vuejs/vue-router/commit/c0d3376)), closes [#3006](https://github.com/vuejs/vue-router/issues/3006)



## [3.1.3](https://github.com/vuejs/vue-router/compare/v3.1.2...v3.1.3) (2019-08-30)

### Bug Fixes

- **link:** merge event listeners when provided in an anchor ([e0d4dc4](https://github.com/vuejs/vue-router/commit/e0d4dc4)), closes [#2890](https://github.com/vuejs/vue-router/issues/2890)

### Features

- **errors:** add stack trace to NavigationDuplicated ([5ef5d73](https://github.com/vuejs/vue-router/commit/5ef5d73)), closes [#2881](https://github.com/vuejs/vue-router/issues/2881)
- warn about root paths without a leading slash ([#2591](https://github.com/vuejs/vue-router/issues/2591)) ([7d7e048](https://github.com/vuejs/vue-router/commit/7d7e048)), closes [#2550](https://github.com/vuejs/vue-router/issues/2550) [#2550](https://github.com/vuejs/vue-router/issues/2550)

## [3.1.2](https://github.com/vuejs/vue-router/compare/v3.1.1...v3.1.2) (2019-08-08)

### Bug Fixes

- **types:** prioritize promise based push/replace ([1243e8b](https://github.com/vuejs/vue-router/commit/1243e8b))

### Reverts

- "fix(hash): correctly place query if placed before hash ([#2851](https://github.com/vuejs/vue-router/issues/2851))" ([9b30e4c](https://github.com/vuejs/vue-router/commit/9b30e4c)), closes [#2876](https://github.com/vuejs/vue-router/issues/2876). See more information at https://github.com/vuejs/vue-router/issues/2125#issuecomment-519521424

## [3.1.1](https://github.com/vuejs/vue-router/compare/v3.1.0...v3.1.1) (2019-08-06)

### Bug Fixes

- **link:** silence back navigations errors ([59b6da3](https://github.com/vuejs/vue-router/commit/59b6da3))

# [3.1.0](https://github.com/vuejs/vue-router/compare/v3.0.7...v3.1.0) (2019-08-06)

### Bug Fixes

- **abstract history:** allow router.back in abstract mode when 2 consecutive same routes appear in history stack ([#2771](https://github.com/vuejs/vue-router/issues/2771)) ([8910979](https://github.com/vuejs/vue-router/commit/8910979)), closes [#2607](https://github.com/vuejs/vue-router/issues/2607)
- **hash:** correctly place query if placed before hash ([#2851](https://github.com/vuejs/vue-router/issues/2851)) ([b7715dc](https://github.com/vuejs/vue-router/commit/b7715dc)), closes [#2125](https://github.com/vuejs/vue-router/issues/2125) [#2262](https://github.com/vuejs/vue-router/issues/2262)
- **link:** Fix active links when parent link redirects to child ([#2772](https://github.com/vuejs/vue-router/issues/2772)) ([64785a9](https://github.com/vuejs/vue-router/commit/64785a9)), closes [#2724](https://github.com/vuejs/vue-router/issues/2724)
- adapt error to work on IE9 ([527d6d5](https://github.com/vuejs/vue-router/commit/527d6d5))

### Features

- **alias:** warn against redundant aliases ([04a02c0](https://github.com/vuejs/vue-router/commit/04a02c0)), closes [#2461](https://github.com/vuejs/vue-router/issues/2461) [#2462](https://github.com/vuejs/vue-router/issues/2462)
- **scroll:** handle id selectors starting with a number ([799ceca](https://github.com/vuejs/vue-router/commit/799ceca)), closes [#2163](https://github.com/vuejs/vue-router/issues/2163)
- return a promise with push and replace ([#2862](https://github.com/vuejs/vue-router/issues/2862)) ([d907a13](https://github.com/vuejs/vue-router/commit/d907a13)), closes [#1769](https://github.com/vuejs/vue-router/issues/1769) [#1769](https://github.com/vuejs/vue-router/issues/1769)
- scoped slot for link ([e289dde](https://github.com/vuejs/vue-router/commit/e289dde))
- warn the user for invalid uses of v-slot with Link ([44c63a9](https://github.com/vuejs/vue-router/commit/44c63a9))

## [3.0.7](https://github.com/vuejs/vue-router/compare/v3.0.6...v3.0.7) (2019-07-03)

### Bug Fixes

- apps loaded from Windows file shares not mapped to network drives ([#2774](https://github.com/vuejs/vue-router/issues/2774)) ([c2c78a3](https://github.com/vuejs/vue-router/commit/c2c78a3))
- make callback of next in beforeRouterEnter more consistent ([#2738](https://github.com/vuejs/vue-router/issues/2738)) ([8ac478f](https://github.com/vuejs/vue-router/commit/8ac478f)), closes [#2761](https://github.com/vuejs/vue-router/issues/2761) [#2728](https://github.com/vuejs/vue-router/issues/2728)

## [3.0.6](https://github.com/vuejs/vue-router/compare/v3.0.5...v3.0.6) (2019-04-17)

### Bug Fixes

- revert [#2713](https://github.com/vuejs/vue-router/issues/2713) ([#2723](https://github.com/vuejs/vue-router/issues/2723)) ([ec6eab7](https://github.com/vuejs/vue-router/commit/ec6eab7)), closes [#2719](https://github.com/vuejs/vue-router/issues/2719)

## [3.0.5](https://github.com/vuejs/vue-router/compare/v3.0.4...v3.0.5) (2019-04-15)

### Bug Fixes

- push before creating Vue instance ([#2713](https://github.com/vuejs/vue-router/issues/2713)) ([6974a6f](https://github.com/vuejs/vue-router/commit/6974a6f)), closes [#2712](https://github.com/vuejs/vue-router/issues/2712)
- **router-view:** add condition to see whether the tree is inactive (fix [#2552](https://github.com/vuejs/vue-router/issues/2552)) ([#2592](https://github.com/vuejs/vue-router/issues/2592)) ([e6d8fd2](https://github.com/vuejs/vue-router/commit/e6d8fd2))
- **router-view:** register instance in init hook ([c3abdf6](https://github.com/vuejs/vue-router/commit/c3abdf6)), closes [#2561](https://github.com/vuejs/vue-router/issues/2561) [#2689](https://github.com/vuejs/vue-router/issues/2689) [#2561](https://github.com/vuejs/vue-router/issues/2561) [#2561](https://github.com/vuejs/vue-router/issues/2561)

## [3.0.4](https://github.com/vuejs/vue-router/compare/v3.0.3...v3.0.4) (2019-04-12)

### Bug Fixes

- prevent memory leaks by removing app references ([#2706](https://github.com/vuejs/vue-router/issues/2706)) ([8056105](https://github.com/vuejs/vue-router/commit/8056105)), closes [#2639](https://github.com/vuejs/vue-router/issues/2639)
- **hash:** prevent double decoding ([#2711](https://github.com/vuejs/vue-router/issues/2711)) ([a775fb1](https://github.com/vuejs/vue-router/commit/a775fb1)), closes [#2708](https://github.com/vuejs/vue-router/issues/2708)

### Features

- **esm build:** build ES modules for browser ([#2705](https://github.com/vuejs/vue-router/issues/2705)) ([627027f](https://github.com/vuejs/vue-router/commit/627027f))

## [3.0.3](https://github.com/vuejs/vue-router/compare/v3.0.2...v3.0.3) (2019-04-08)

### Bug Fixes

- removes warning resolving asterisk routes ([e224637](https://github.com/vuejs/vue-router/commit/e224637)), closes [#2505](https://github.com/vuejs/vue-router/issues/2505) [#2505](https://github.com/vuejs/vue-router/issues/2505)
- **normalizeLocation:** create a copy with named locations ([#2286](https://github.com/vuejs/vue-router/issues/2286)) ([53cce99](https://github.com/vuejs/vue-router/commit/53cce99)), closes [#2121](https://github.com/vuejs/vue-router/issues/2121)
- **resolve:** use current location if not provided ([#2390](https://github.com/vuejs/vue-router/issues/2390)) ([7ff4de4](https://github.com/vuejs/vue-router/commit/7ff4de4)), closes [#2385](https://github.com/vuejs/vue-router/issues/2385)
- **types:** allow null/undefined in query params ([ca30a75](https://github.com/vuejs/vue-router/commit/ca30a75)), closes [#2605](https://github.com/vuejs/vue-router/issues/2605)

## [3.0.2](https://github.com/vuejs/vue-router/compare/v3.0.1...v3.0.2) (2018-11-23)

### Bug Fixes

- **errors:** throws with invalid route objects ([#1893](https://github.com/vuejs/vue-router/issues/1893)) ([c837666](https://github.com/vuejs/vue-router/commit/c837666))
- fix the test in async.spec.js ([#1953](https://github.com/vuejs/vue-router/issues/1953)) ([4e9e66b](https://github.com/vuejs/vue-router/commit/4e9e66b))
- initial url path for non ascii urls ([#2375](https://github.com/vuejs/vue-router/issues/2375)) ([c3b0a33](https://github.com/vuejs/vue-router/commit/c3b0a33))
- only setupScroll when support pushState due to possible fallback: false ([#1835](https://github.com/vuejs/vue-router/issues/1835)) ([fac60f6](https://github.com/vuejs/vue-router/commit/fac60f6)), closes [#1834](https://github.com/vuejs/vue-router/issues/1834)
- workaround replaceState bug in Safari ([#2295](https://github.com/vuejs/vue-router/issues/2295)) ([3c7d8ab](https://github.com/vuejs/vue-router/commit/3c7d8ab)), closes [#2195](https://github.com/vuejs/vue-router/issues/2195)
- **hash:** support unicode in initial route ([8369c6b](https://github.com/vuejs/vue-router/commit/8369c6b))
- **history-mode:** correcting indentation in web.config example ([#1948](https://github.com/vuejs/vue-router/issues/1948)) ([4b071f9](https://github.com/vuejs/vue-router/commit/4b071f9))
- **match:** use pathMatch for the param of \* routes ([#1995](https://github.com/vuejs/vue-router/issues/1995)) ([ca1fccd](https://github.com/vuejs/vue-router/commit/ca1fccd)), closes [#1994](https://github.com/vuejs/vue-router/issues/1994)

### Features

- call scrollBehavior with app context ([#1804](https://github.com/vuejs/vue-router/issues/1804)) ([c93a734](https://github.com/vuejs/vue-router/commit/c93a734))

## [3.0.1](https://github.com/vuejs/vue-router/compare/v3.0.0...v3.0.1) (2017-10-13)

### Bug Fixes

- fix props-passing regression ([02ff792](https://github.com/vuejs/vue-router/commit/02ff792)), closes [#1800](https://github.com/vuejs/vue-router/issues/1800)

## [3.0.0](https://github.com/vuejs/vue-router/compare/v2.8.0...v3.0.0) (2017-10-11)

### Features

- **typings:** adapt to the new Vue typings ([#1685](https://github.com/vuejs/vue-router/issues/1685)) ([8855e36](https://github.com/vuejs/vue-router/commit/8855e36))

### BREAKING CHANGES

- **typings:** It is no longer compatible with the old Vue typings

## [2.8.0](https://github.com/vuejs/vue-router/compare/v2.7.0...v2.8.0) (2017-10-11)

### Bug Fixes

- allow insllation on extended Vue copies ([f62c5d6](https://github.com/vuejs/vue-router/commit/f62c5d6))
- avoid first popstate event with async guard together (fix [#1508](https://github.com/vuejs/vue-router/issues/1508)) ([#1661](https://github.com/vuejs/vue-router/issues/1661)) ([3cbc0f3](https://github.com/vuejs/vue-router/commit/3cbc0f3))
- deep clone query when creating routes ([effb114](https://github.com/vuejs/vue-router/commit/effb114)), closes [#1690](https://github.com/vuejs/vue-router/issues/1690)
- fix scroll when going back to initial route ([#1586](https://github.com/vuejs/vue-router/issues/1586)) ([c166822](https://github.com/vuejs/vue-router/commit/c166822))
- handle null values when comparing objects ([#1568](https://github.com/vuejs/vue-router/issues/1568)) ([4e95bd8](https://github.com/vuejs/vue-router/commit/4e95bd8)), closes [#1566](https://github.com/vuejs/vue-router/issues/1566)
- resolve native ES modules ([8a28426](https://github.com/vuejs/vue-router/commit/8a28426))
- send props not defined on the route component in \$attrs. Fixes [#1695](https://github.com/vuejs/vue-router/issues/1695). ([#1702](https://github.com/vuejs/vue-router/issues/1702)) ([a722b6a](https://github.com/vuejs/vue-router/commit/a722b6a))

### Features

- enhance hashHistory to support scrollBehavior ([#1662](https://github.com/vuejs/vue-router/issues/1662)) ([1422eb5](https://github.com/vuejs/vue-router/commit/1422eb5))
- scrollBehavior accept returning a promise ([#1758](https://github.com/vuejs/vue-router/issues/1758)) ([ce13b55](https://github.com/vuejs/vue-router/commit/ce13b55))

# [2.7.0](https://github.com/vuejs/vue-router/compare/v2.6.0...v2.7.0) (2017-06-29)

### Features

- auto resolve ES module default when resolving async components ([d539788](https://github.com/vuejs/vue-router/commit/d539788))
