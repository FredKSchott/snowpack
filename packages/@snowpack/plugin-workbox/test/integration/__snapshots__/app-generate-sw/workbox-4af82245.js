define("./workbox-4af82245.js",['exports'], function (exports) { 'use strict';

    try {
      self['workbox:core:5.1.3'] && _();
    } catch (e) {}

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    const _cacheNameDetails = {
      googleAnalytics: 'googleAnalytics',
      precache: 'precache-v2',
      prefix: 'workbox',
      runtime: 'runtime',
      suffix: typeof registration !== 'undefined' ? registration.scope : ''
    };

    const _createCacheName = cacheName => {
      return [_cacheNameDetails.prefix, cacheName, _cacheNameDetails.suffix].filter(value => value && value.length > 0).join('-');
    };

    const eachCacheNameDetail = fn => {
      for (const key of Object.keys(_cacheNameDetails)) {
        fn(key);
      }
    };

    const cacheNames = {
      updateDetails: details => {
        eachCacheNameDetail(key => {
          if (typeof details[key] === 'string') {
            _cacheNameDetails[key] = details[key];
          }
        });
      },
      getGoogleAnalyticsName: userCacheName => {
        return userCacheName || _createCacheName(_cacheNameDetails.googleAnalytics);
      },
      getPrecacheName: userCacheName => {
        return userCacheName || _createCacheName(_cacheNameDetails.precache);
      },
      getPrefix: () => {
        return _cacheNameDetails.prefix;
      },
      getRuntimeName: userCacheName => {
        return userCacheName || _createCacheName(_cacheNameDetails.runtime);
      },
      getSuffix: () => {
        return _cacheNameDetails.suffix;
      }
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */

    const getFriendlyURL = url => {
      const urlObj = new URL(String(url), location.href); // See https://github.com/GoogleChrome/workbox/issues/2323
      // We want to include everything, except for the origin if it's same-origin.

      return urlObj.href.replace(new RegExp(`^${location.origin}`), '');
    };

    /*
      Copyright 2019 Google LLC
      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    const logger =  (() => {
      // Don't overwrite this value if it's already set.
      // See https://github.com/GoogleChrome/workbox/pull/2284#issuecomment-560470923
      if (!('__WB_DISABLE_DEV_LOGS' in self)) {
        self.__WB_DISABLE_DEV_LOGS = false;
      }

      let inGroup = false;
      const methodToColorMap = {
        debug: `#7f8c8d`,
        log: `#2ecc71`,
        warn: `#f39c12`,
        error: `#c0392b`,
        groupCollapsed: `#3498db`,
        groupEnd: null
      };

      const print = function (method, args) {
        if (self.__WB_DISABLE_DEV_LOGS) {
          return;
        }

        if (method === 'groupCollapsed') {
          // Safari doesn't print all console.groupCollapsed() arguments:
          // https://bugs.webkit.org/show_bug.cgi?id=182754
          if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
            console[method](...args);
            return;
          }
        }

        const styles = [`background: ${methodToColorMap[method]}`, `border-radius: 0.5em`, `color: white`, `font-weight: bold`, `padding: 2px 0.5em`]; // When in a group, the workbox prefix is not displayed.

        const logPrefix = inGroup ? [] : ['%cworkbox', styles.join(';')];
        console[method](...logPrefix, ...args);

        if (method === 'groupCollapsed') {
          inGroup = true;
        }

        if (method === 'groupEnd') {
          inGroup = false;
        }
      };

      const api = {};
      const loggerMethods = Object.keys(methodToColorMap);

      for (const key of loggerMethods) {
        const method = key;

        api[method] = (...args) => {
          print(method, args);
        };
      }

      return api;
    })();

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    const messages = {
      'invalid-value': ({
        paramName,
        validValueDescription,
        value
      }) => {
        if (!paramName || !validValueDescription) {
          throw new Error(`Unexpected input to 'invalid-value' error.`);
        }

        return `The '${paramName}' parameter was given a value with an ` + `unexpected value. ${validValueDescription} Received a value of ` + `${JSON.stringify(value)}.`;
      },
      'not-an-array': ({
        moduleName,
        className,
        funcName,
        paramName
      }) => {
        if (!moduleName || !className || !funcName || !paramName) {
          throw new Error(`Unexpected input to 'not-an-array' error.`);
        }

        return `The parameter '${paramName}' passed into ` + `'${moduleName}.${className}.${funcName}()' must be an array.`;
      },
      'incorrect-type': ({
        expectedType,
        paramName,
        moduleName,
        className,
        funcName
      }) => {
        if (!expectedType || !paramName || !moduleName || !funcName) {
          throw new Error(`Unexpected input to 'incorrect-type' error.`);
        }

        return `The parameter '${paramName}' passed into ` + `'${moduleName}.${className ? className + '.' : ''}` + `${funcName}()' must be of type ${expectedType}.`;
      },
      'incorrect-class': ({
        expectedClass,
        paramName,
        moduleName,
        className,
        funcName,
        isReturnValueProblem
      }) => {
        if (!expectedClass || !moduleName || !funcName) {
          throw new Error(`Unexpected input to 'incorrect-class' error.`);
        }

        if (isReturnValueProblem) {
          return `The return value from ` + `'${moduleName}.${className ? className + '.' : ''}${funcName}()' ` + `must be an instance of class ${expectedClass.name}.`;
        }

        return `The parameter '${paramName}' passed into ` + `'${moduleName}.${className ? className + '.' : ''}${funcName}()' ` + `must be an instance of class ${expectedClass.name}.`;
      },
      'missing-a-method': ({
        expectedMethod,
        paramName,
        moduleName,
        className,
        funcName
      }) => {
        if (!expectedMethod || !paramName || !moduleName || !className || !funcName) {
          throw new Error(`Unexpected input to 'missing-a-method' error.`);
        }

        return `${moduleName}.${className}.${funcName}() expected the ` + `'${paramName}' parameter to expose a '${expectedMethod}' method.`;
      },
      'add-to-cache-list-unexpected-type': ({
        entry
      }) => {
        return `An unexpected entry was passed to ` + `'workbox-precaching.PrecacheController.addToCacheList()' The entry ` + `'${JSON.stringify(entry)}' isn't supported. You must supply an array of ` + `strings with one or more characters, objects with a url property or ` + `Request objects.`;
      },
      'add-to-cache-list-conflicting-entries': ({
        firstEntry,
        secondEntry
      }) => {
        if (!firstEntry || !secondEntry) {
          throw new Error(`Unexpected input to ` + `'add-to-cache-list-duplicate-entries' error.`);
        }

        return `Two of the entries passed to ` + `'workbox-precaching.PrecacheController.addToCacheList()' had the URL ` + `${firstEntry._entryId} but different revision details. Workbox is ` + `unable to cache and version the asset correctly. Please remove one ` + `of the entries.`;
      },
      'plugin-error-request-will-fetch': ({
        thrownError
      }) => {
        if (!thrownError) {
          throw new Error(`Unexpected input to ` + `'plugin-error-request-will-fetch', error.`);
        }

        return `An error was thrown by a plugins 'requestWillFetch()' method. ` + `The thrown error message was: '${thrownError.message}'.`;
      },
      'invalid-cache-name': ({
        cacheNameId,
        value
      }) => {
        if (!cacheNameId) {
          throw new Error(`Expected a 'cacheNameId' for error 'invalid-cache-name'`);
        }

        return `You must provide a name containing at least one character for ` + `setCacheDetails({${cacheNameId}: '...'}). Received a value of ` + `'${JSON.stringify(value)}'`;
      },
      'unregister-route-but-not-found-with-method': ({
        method
      }) => {
        if (!method) {
          throw new Error(`Unexpected input to ` + `'unregister-route-but-not-found-with-method' error.`);
        }

        return `The route you're trying to unregister was not  previously ` + `registered for the method type '${method}'.`;
      },
      'unregister-route-route-not-registered': () => {
        return `The route you're trying to unregister was not previously ` + `registered.`;
      },
      'queue-replay-failed': ({
        name
      }) => {
        return `Replaying the background sync queue '${name}' failed.`;
      },
      'duplicate-queue-name': ({
        name
      }) => {
        return `The Queue name '${name}' is already being used. ` + `All instances of backgroundSync.Queue must be given unique names.`;
      },
      'expired-test-without-max-age': ({
        methodName,
        paramName
      }) => {
        return `The '${methodName}()' method can only be used when the ` + `'${paramName}' is used in the constructor.`;
      },
      'unsupported-route-type': ({
        moduleName,
        className,
        funcName,
        paramName
      }) => {
        return `The supplied '${paramName}' parameter was an unsupported type. ` + `Please check the docs for ${moduleName}.${className}.${funcName} for ` + `valid input types.`;
      },
      'not-array-of-class': ({
        value,
        expectedClass,
        moduleName,
        className,
        funcName,
        paramName
      }) => {
        return `The supplied '${paramName}' parameter must be an array of ` + `'${expectedClass}' objects. Received '${JSON.stringify(value)},'. ` + `Please check the call to ${moduleName}.${className}.${funcName}() ` + `to fix the issue.`;
      },
      'max-entries-or-age-required': ({
        moduleName,
        className,
        funcName
      }) => {
        return `You must define either config.maxEntries or config.maxAgeSeconds` + `in ${moduleName}.${className}.${funcName}`;
      },
      'statuses-or-headers-required': ({
        moduleName,
        className,
        funcName
      }) => {
        return `You must define either config.statuses or config.headers` + `in ${moduleName}.${className}.${funcName}`;
      },
      'invalid-string': ({
        moduleName,
        funcName,
        paramName
      }) => {
        if (!paramName || !moduleName || !funcName) {
          throw new Error(`Unexpected input to 'invalid-string' error.`);
        }

        return `When using strings, the '${paramName}' parameter must start with ` + `'http' (for cross-origin matches) or '/' (for same-origin matches). ` + `Please see the docs for ${moduleName}.${funcName}() for ` + `more info.`;
      },
      'channel-name-required': () => {
        return `You must provide a channelName to construct a ` + `BroadcastCacheUpdate instance.`;
      },
      'invalid-responses-are-same-args': () => {
        return `The arguments passed into responsesAreSame() appear to be ` + `invalid. Please ensure valid Responses are used.`;
      },
      'expire-custom-caches-only': () => {
        return `You must provide a 'cacheName' property when using the ` + `expiration plugin with a runtime caching strategy.`;
      },
      'unit-must-be-bytes': ({
        normalizedRangeHeader
      }) => {
        if (!normalizedRangeHeader) {
          throw new Error(`Unexpected input to 'unit-must-be-bytes' error.`);
        }

        return `The 'unit' portion of the Range header must be set to 'bytes'. ` + `The Range header provided was "${normalizedRangeHeader}"`;
      },
      'single-range-only': ({
        normalizedRangeHeader
      }) => {
        if (!normalizedRangeHeader) {
          throw new Error(`Unexpected input to 'single-range-only' error.`);
        }

        return `Multiple ranges are not supported. Please use a  single start ` + `value, and optional end value. The Range header provided was ` + `"${normalizedRangeHeader}"`;
      },
      'invalid-range-values': ({
        normalizedRangeHeader
      }) => {
        if (!normalizedRangeHeader) {
          throw new Error(`Unexpected input to 'invalid-range-values' error.`);
        }

        return `The Range header is missing both start and end values. At least ` + `one of those values is needed. The Range header provided was ` + `"${normalizedRangeHeader}"`;
      },
      'no-range-header': () => {
        return `No Range header was found in the Request provided.`;
      },
      'range-not-satisfiable': ({
        size,
        start,
        end
      }) => {
        return `The start (${start}) and end (${end}) values in the Range are ` + `not satisfiable by the cached response, which is ${size} bytes.`;
      },
      'attempt-to-cache-non-get-request': ({
        url,
        method
      }) => {
        return `Unable to cache '${url}' because it is a '${method}' request and ` + `only 'GET' requests can be cached.`;
      },
      'cache-put-with-no-response': ({
        url
      }) => {
        return `There was an attempt to cache '${url}' but the response was not ` + `defined.`;
      },
      'no-response': ({
        url,
        error
      }) => {
        let message = `The strategy could not generate a response for '${url}'.`;

        if (error) {
          message += ` The underlying error is ${error}.`;
        }

        return message;
      },
      'bad-precaching-response': ({
        url,
        status
      }) => {
        return `The precaching request for '${url}' failed with an HTTP ` + `status of ${status}.`;
      },
      'non-precached-url': ({
        url
      }) => {
        return `createHandlerBoundToURL('${url}') was called, but that URL is ` + `not precached. Please pass in a URL that is precached instead.`;
      },
      'add-to-cache-list-conflicting-integrities': ({
        url
      }) => {
        return `Two of the entries passed to ` + `'workbox-precaching.PrecacheController.addToCacheList()' had the URL ` + `${url} with different integrity values. Please remove one of them.`;
      },
      'missing-precache-entry': ({
        cacheName,
        url
      }) => {
        return `Unable to find a precached response in ${cacheName} for ${url}.`;
      }
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */

    const generatorFunction = (code, details = {}) => {
      const message = messages[code];

      if (!message) {
        throw new Error(`Unable to find message for code '${code}'.`);
      }

      return message(details);
    };

    const messageGenerator =  generatorFunction;

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Workbox errors should be thrown with this class.
     * This allows use to ensure the type easily in tests,
     * helps developers identify errors from workbox
     * easily and allows use to optimise error
     * messages correctly.
     *
     * @private
     */

    class WorkboxError extends Error {
      /**
       *
       * @param {string} errorCode The error code that
       * identifies this particular error.
       * @param {Object=} details Any relevant arguments
       * that will help developers identify issues should
       * be added as a key on the context object.
       */
      constructor(errorCode, details) {
        const message = messageGenerator(errorCode, details);
        super(message);
        this.name = errorCode;
        this.details = details;
      }

    }

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /*
     * This method throws if the supplied value is not an array.
     * The destructed values are required to produce a meaningful error for users.
     * The destructed and restructured object is so it's clear what is
     * needed.
     */

    const isArray = (value, details) => {
      if (!Array.isArray(value)) {
        throw new WorkboxError('not-an-array', details);
      }
    };

    const hasMethod = (object, expectedMethod, details) => {
      const type = typeof object[expectedMethod];

      if (type !== 'function') {
        details['expectedMethod'] = expectedMethod;
        throw new WorkboxError('missing-a-method', details);
      }
    };

    const isType = (object, expectedType, details) => {
      if (typeof object !== expectedType) {
        details['expectedType'] = expectedType;
        throw new WorkboxError('incorrect-type', details);
      }
    };

    const isInstance = (object, expectedClass, details) => {
      if (!(object instanceof expectedClass)) {
        details['expectedClass'] = expectedClass;
        throw new WorkboxError('incorrect-class', details);
      }
    };

    const isOneOf = (value, validValues, details) => {
      if (!validValues.includes(value)) {
        details['validValueDescription'] = `Valid values are ${JSON.stringify(validValues)}.`;
        throw new WorkboxError('invalid-value', details);
      }
    };

    const isArrayOfClass = (value, expectedClass, details) => {
      const error = new WorkboxError('not-array-of-class', details);

      if (!Array.isArray(value)) {
        throw error;
      }

      for (const item of value) {
        if (!(item instanceof expectedClass)) {
          throw error;
        }
      }
    };

    const finalAssertExports =  {
      hasMethod,
      isArray,
      isInstance,
      isOneOf,
      isType,
      isArrayOfClass
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */

    const quotaErrorCallbacks = new Set();

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Runs all of the callback functions, one at a time sequentially, in the order
     * in which they were registered.
     *
     * @memberof module:workbox-core
     * @private
     */

    async function executeQuotaErrorCallbacks() {
      {
        logger.log(`About to run ${quotaErrorCallbacks.size} ` + `callbacks to clean up caches.`);
      }

      for (const callback of quotaErrorCallbacks) {
        await callback();

        {
          logger.log(callback, 'is complete.');
        }
      }

      {
        logger.log('Finished running callbacks.');
      }
    }

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    const pluginUtils = {
      filter: (plugins, callbackName) => {
        return plugins.filter(plugin => callbackName in plugin);
      }
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Checks the list of plugins for the cacheKeyWillBeUsed callback, and
     * executes any of those callbacks found in sequence. The final `Request` object
     * returned by the last plugin is treated as the cache key for cache reads
     * and/or writes.
     *
     * @param {Object} options
     * @param {Request} options.request
     * @param {string} options.mode
     * @param {Array<Object>} [options.plugins=[]]
     * @return {Promise<Request>}
     *
     * @private
     * @memberof module:workbox-core
     */

    const _getEffectiveRequest = async ({
      request,
      mode,
      plugins = []
    }) => {
      const cacheKeyWillBeUsedPlugins = pluginUtils.filter(plugins, "cacheKeyWillBeUsed"
      /* CACHE_KEY_WILL_BE_USED */
      );
      let effectiveRequest = request;

      for (const plugin of cacheKeyWillBeUsedPlugins) {
        effectiveRequest = await plugin["cacheKeyWillBeUsed"
        /* CACHE_KEY_WILL_BE_USED */
        ].call(plugin, {
          mode,
          request: effectiveRequest
        });

        if (typeof effectiveRequest === 'string') {
          effectiveRequest = new Request(effectiveRequest);
        }

        {
          finalAssertExports.isInstance(effectiveRequest, Request, {
            moduleName: 'Plugin',
            funcName: "cacheKeyWillBeUsed"
            /* CACHE_KEY_WILL_BE_USED */
            ,
            isReturnValueProblem: true
          });
        }
      }

      return effectiveRequest;
    };
    /**
     * This method will call cacheWillUpdate on the available plugins (or use
     * status === 200) to determine if the Response is safe and valid to cache.
     *
     * @param {Object} options
     * @param {Request} options.request
     * @param {Response} options.response
     * @param {Event} [options.event]
     * @param {Array<Object>} [options.plugins=[]]
     * @return {Promise<Response>}
     *
     * @private
     * @memberof module:workbox-core
     */


    const _isResponseSafeToCache = async ({
      request,
      response,
      event,
      plugins = []
    }) => {
      let responseToCache = response;
      let pluginsUsed = false;

      for (const plugin of plugins) {
        if ("cacheWillUpdate"
        /* CACHE_WILL_UPDATE */
        in plugin) {
          pluginsUsed = true;
          const pluginMethod = plugin["cacheWillUpdate"
          /* CACHE_WILL_UPDATE */
          ];
          responseToCache = await pluginMethod.call(plugin, {
            request,
            response: responseToCache,
            event
          });

          {
            if (responseToCache) {
              finalAssertExports.isInstance(responseToCache, Response, {
                moduleName: 'Plugin',
                funcName: "cacheWillUpdate"
                /* CACHE_WILL_UPDATE */
                ,
                isReturnValueProblem: true
              });
            }
          }

          if (!responseToCache) {
            break;
          }
        }
      }

      if (!pluginsUsed) {
        {
          if (responseToCache) {
            if (responseToCache.status !== 200) {
              if (responseToCache.status === 0) {
                logger.warn(`The response for '${request.url}' is an opaque ` + `response. The caching strategy that you're using will not ` + `cache opaque responses by default.`);
              } else {
                logger.debug(`The response for '${request.url}' returned ` + `a status code of '${response.status}' and won't be cached as a ` + `result.`);
              }
            }
          }
        }

        responseToCache = responseToCache && responseToCache.status === 200 ? responseToCache : undefined;
      }

      return responseToCache ? responseToCache : null;
    };
    /**
     * This is a wrapper around cache.match().
     *
     * @param {Object} options
     * @param {string} options.cacheName Name of the cache to match against.
     * @param {Request} options.request The Request that will be used to look up
     *     cache entries.
     * @param {Event} [options.event] The event that prompted the action.
     * @param {Object} [options.matchOptions] Options passed to cache.match().
     * @param {Array<Object>} [options.plugins=[]] Array of plugins.
     * @return {Response} A cached response if available.
     *
     * @private
     * @memberof module:workbox-core
     */


    const matchWrapper = async ({
      cacheName,
      request,
      event,
      matchOptions,
      plugins = []
    }) => {
      const cache = await self.caches.open(cacheName);
      const effectiveRequest = await _getEffectiveRequest({
        plugins,
        request,
        mode: 'read'
      });
      let cachedResponse = await cache.match(effectiveRequest, matchOptions);

      {
        if (cachedResponse) {
          logger.debug(`Found a cached response in '${cacheName}'.`);
        } else {
          logger.debug(`No cached response found in '${cacheName}'.`);
        }
      }

      for (const plugin of plugins) {
        if ("cachedResponseWillBeUsed"
        /* CACHED_RESPONSE_WILL_BE_USED */
        in plugin) {
          const pluginMethod = plugin["cachedResponseWillBeUsed"
          /* CACHED_RESPONSE_WILL_BE_USED */
          ];
          cachedResponse = await pluginMethod.call(plugin, {
            cacheName,
            event,
            matchOptions,
            cachedResponse,
            request: effectiveRequest
          });

          {
            if (cachedResponse) {
              finalAssertExports.isInstance(cachedResponse, Response, {
                moduleName: 'Plugin',
                funcName: "cachedResponseWillBeUsed"
                /* CACHED_RESPONSE_WILL_BE_USED */
                ,
                isReturnValueProblem: true
              });
            }
          }
        }
      }

      return cachedResponse;
    };
    /**
     * Wrapper around cache.put().
     *
     * Will call `cacheDidUpdate` on plugins if the cache was updated, using
     * `matchOptions` when determining what the old entry is.
     *
     * @param {Object} options
     * @param {string} options.cacheName
     * @param {Request} options.request
     * @param {Response} options.response
     * @param {Event} [options.event]
     * @param {Array<Object>} [options.plugins=[]]
     * @param {Object} [options.matchOptions]
     *
     * @private
     * @memberof module:workbox-core
     */


    const putWrapper = async ({
      cacheName,
      request,
      response,
      event,
      plugins = [],
      matchOptions
    }) => {
      {
        if (request.method && request.method !== 'GET') {
          throw new WorkboxError('attempt-to-cache-non-get-request', {
            url: getFriendlyURL(request.url),
            method: request.method
          });
        }
      }

      const effectiveRequest = await _getEffectiveRequest({
        plugins,
        request,
        mode: 'write'
      });

      if (!response) {
        {
          logger.error(`Cannot cache non-existent response for ` + `'${getFriendlyURL(effectiveRequest.url)}'.`);
        }

        throw new WorkboxError('cache-put-with-no-response', {
          url: getFriendlyURL(effectiveRequest.url)
        });
      }

      const responseToCache = await _isResponseSafeToCache({
        event,
        plugins,
        response,
        request: effectiveRequest
      });

      if (!responseToCache) {
        {
          logger.debug(`Response '${getFriendlyURL(effectiveRequest.url)}' will ` + `not be cached.`, responseToCache);
        }

        return;
      }

      const cache = await self.caches.open(cacheName);
      const updatePlugins = pluginUtils.filter(plugins, "cacheDidUpdate"
      /* CACHE_DID_UPDATE */
      );
      const oldResponse = updatePlugins.length > 0 ? await matchWrapper({
        cacheName,
        matchOptions,
        request: effectiveRequest
      }) : null;

      {
        logger.debug(`Updating the '${cacheName}' cache with a new Response for ` + `${getFriendlyURL(effectiveRequest.url)}.`);
      }

      try {
        await cache.put(effectiveRequest, responseToCache);
      } catch (error) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/DOMException#exception-QuotaExceededError
        if (error.name === 'QuotaExceededError') {
          await executeQuotaErrorCallbacks();
        }

        throw error;
      }

      for (const plugin of updatePlugins) {
        await plugin["cacheDidUpdate"
        /* CACHE_DID_UPDATE */
        ].call(plugin, {
          cacheName,
          event,
          oldResponse,
          newResponse: responseToCache,
          request: effectiveRequest
        });
      }
    };

    const cacheWrapper = {
      put: putWrapper,
      match: matchWrapper
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Wrapper around the fetch API.
     *
     * Will call requestWillFetch on available plugins.
     *
     * @param {Object} options
     * @param {Request|string} options.request
     * @param {Object} [options.fetchOptions]
     * @param {ExtendableEvent} [options.event]
     * @param {Array<Object>} [options.plugins=[]]
     * @return {Promise<Response>}
     *
     * @private
     * @memberof module:workbox-core
     */

    const wrappedFetch = async ({
      request,
      fetchOptions,
      event,
      plugins = []
    }) => {
      if (typeof request === 'string') {
        request = new Request(request);
      } // We *should* be able to call `await event.preloadResponse` even if it's
      // undefined, but for some reason, doing so leads to errors in our Node unit
      // tests. To work around that, explicitly check preloadResponse's value first.


      if (event instanceof FetchEvent && event.preloadResponse) {
        const possiblePreloadResponse = await event.preloadResponse;

        if (possiblePreloadResponse) {
          {
            logger.log(`Using a preloaded navigation response for ` + `'${getFriendlyURL(request.url)}'`);
          }

          return possiblePreloadResponse;
        }
      }

      {
        finalAssertExports.isInstance(request, Request, {
          paramName: 'request',
          expectedClass: Request,
          moduleName: 'workbox-core',
          className: 'fetchWrapper',
          funcName: 'wrappedFetch'
        });
      }

      const failedFetchPlugins = pluginUtils.filter(plugins, "fetchDidFail"
      /* FETCH_DID_FAIL */
      ); // If there is a fetchDidFail plugin, we need to save a clone of the
      // original request before it's either modified by a requestWillFetch
      // plugin or before the original request's body is consumed via fetch().

      const originalRequest = failedFetchPlugins.length > 0 ? request.clone() : null;

      try {
        for (const plugin of plugins) {
          if ("requestWillFetch"
          /* REQUEST_WILL_FETCH */
          in plugin) {
            const pluginMethod = plugin["requestWillFetch"
            /* REQUEST_WILL_FETCH */
            ];
            const requestClone = request.clone();
            request = await pluginMethod.call(plugin, {
              request: requestClone,
              event
            });

            if ("test" !== 'production') {
              if (request) {
                finalAssertExports.isInstance(request, Request, {
                  moduleName: 'Plugin',
                  funcName: "cachedResponseWillBeUsed"
                  /* CACHED_RESPONSE_WILL_BE_USED */
                  ,
                  isReturnValueProblem: true
                });
              }
            }
          }
        }
      } catch (err) {
        throw new WorkboxError('plugin-error-request-will-fetch', {
          thrownError: err
        });
      } // The request can be altered by plugins with `requestWillFetch` making
      // the original request (Most likely from a `fetch` event) to be different
      // to the Request we make. Pass both to `fetchDidFail` to aid debugging.


      const pluginFilteredRequest = request.clone();

      try {
        let fetchResponse; // See https://github.com/GoogleChrome/workbox/issues/1796

        if (request.mode === 'navigate') {
          fetchResponse = await fetch(request);
        } else {
          fetchResponse = await fetch(request, fetchOptions);
        }

        if ("test" !== 'production') {
          logger.debug(`Network request for ` + `'${getFriendlyURL(request.url)}' returned a response with ` + `status '${fetchResponse.status}'.`);
        }

        for (const plugin of plugins) {
          if ("fetchDidSucceed"
          /* FETCH_DID_SUCCEED */
          in plugin) {
            fetchResponse = await plugin["fetchDidSucceed"
            /* FETCH_DID_SUCCEED */
            ].call(plugin, {
              event,
              request: pluginFilteredRequest,
              response: fetchResponse
            });

            if ("test" !== 'production') {
              if (fetchResponse) {
                finalAssertExports.isInstance(fetchResponse, Response, {
                  moduleName: 'Plugin',
                  funcName: "fetchDidSucceed"
                  /* FETCH_DID_SUCCEED */
                  ,
                  isReturnValueProblem: true
                });
              }
            }
          }
        }

        return fetchResponse;
      } catch (error) {
        {
          logger.error(`Network request for ` + `'${getFriendlyURL(request.url)}' threw an error.`, error);
        }

        for (const plugin of failedFetchPlugins) {
          await plugin["fetchDidFail"
          /* FETCH_DID_FAIL */
          ].call(plugin, {
            error,
            event,
            originalRequest: originalRequest.clone(),
            request: pluginFilteredRequest.clone()
          });
        }

        throw error;
      }
    };

    const fetchWrapper = {
      fetch: wrappedFetch
    };

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    let supportStatus;
    /**
     * A utility function that determines whether the current browser supports
     * constructing a new `Response` from a `response.body` stream.
     *
     * @return {boolean} `true`, if the current browser can successfully
     *     construct a `Response` from a `response.body` stream, `false` otherwise.
     *
     * @private
     */

    function canConstructResponseFromBodyStream() {
      if (supportStatus === undefined) {
        const testResponse = new Response('');

        if ('body' in testResponse) {
          try {
            new Response(testResponse.body);
            supportStatus = true;
          } catch (error) {
            supportStatus = false;
          }
        }

        supportStatus = false;
      }

      return supportStatus;
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Allows developers to copy a response and modify its `headers`, `status`,
     * or `statusText` values (the values settable via a
     * [`ResponseInit`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#Syntax}
     * object in the constructor).
     * To modify these values, pass a function as the second argument. That
     * function will be invoked with a single object with the response properties
     * `{headers, status, statusText}`. The return value of this function will
     * be used as the `ResponseInit` for the new `Response`. To change the values
     * either modify the passed parameter(s) and return it, or return a totally
     * new object.
     *
     * @param {Response} response
     * @param {Function} modifier
     * @memberof module:workbox-core
     */

    async function copyResponse(response, modifier) {
      const clonedResponse = response.clone(); // Create a fresh `ResponseInit` object by cloning the headers.

      const responseInit = {
        headers: new Headers(clonedResponse.headers),
        status: clonedResponse.status,
        statusText: clonedResponse.statusText
      }; // Apply any user modifications.

      const modifiedResponseInit = modifier ? modifier(responseInit) : responseInit; // Create the new response from the body stream and `ResponseInit`
      // modifications. Note: not all browsers support the Response.body stream,
      // so fall back to reading the entire body into memory as a blob.

      const body = canConstructResponseFromBodyStream() ? clonedResponse.body : await clonedResponse.blob();
      return new Response(body, modifiedResponseInit);
    }

    try {
      self['workbox:precaching:5.1.3'] && _();
    } catch (e) {}

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */

    const REVISION_SEARCH_PARAM = '__WB_REVISION__';
    /**
     * Converts a manifest entry into a versioned URL suitable for precaching.
     *
     * @param {Object|string} entry
     * @return {string} A URL with versioning info.
     *
     * @private
     * @memberof module:workbox-precaching
     */

    function createCacheKey(entry) {
      if (!entry) {
        throw new WorkboxError('add-to-cache-list-unexpected-type', {
          entry
        });
      } // If a precache manifest entry is a string, it's assumed to be a versioned
      // URL, like '/app.abcd1234.js'. Return as-is.


      if (typeof entry === 'string') {
        const urlObject = new URL(entry, location.href);
        return {
          cacheKey: urlObject.href,
          url: urlObject.href
        };
      }

      const {
        revision,
        url
      } = entry;

      if (!url) {
        throw new WorkboxError('add-to-cache-list-unexpected-type', {
          entry
        });
      } // If there's just a URL and no revision, then it's also assumed to be a
      // versioned URL.


      if (!revision) {
        const urlObject = new URL(url, location.href);
        return {
          cacheKey: urlObject.href,
          url: urlObject.href
        };
      } // Otherwise, construct a properly versioned URL using the custom Workbox
      // search parameter along with the revision info.


      const cacheKeyURL = new URL(url, location.href);
      const originalURL = new URL(url, location.href);
      cacheKeyURL.searchParams.set(REVISION_SEARCH_PARAM, revision);
      return {
        cacheKey: cacheKeyURL.href,
        url: originalURL.href
      };
    }

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * @param {string} groupTitle
     * @param {Array<string>} deletedURLs
     *
     * @private
     */

    const logGroup = (groupTitle, deletedURLs) => {
      logger.groupCollapsed(groupTitle);

      for (const url of deletedURLs) {
        logger.log(url);
      }

      logger.groupEnd();
    };
    /**
     * @param {Array<string>} deletedURLs
     *
     * @private
     * @memberof module:workbox-precaching
     */


    function printCleanupDetails(deletedURLs) {
      const deletionCount = deletedURLs.length;

      if (deletionCount > 0) {
        logger.groupCollapsed(`During precaching cleanup, ` + `${deletionCount} cached ` + `request${deletionCount === 1 ? ' was' : 's were'} deleted.`);
        logGroup('Deleted Cache Requests', deletedURLs);
        logger.groupEnd();
      }
    }

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * @param {string} groupTitle
     * @param {Array<string>} urls
     *
     * @private
     */

    function _nestedGroup(groupTitle, urls) {
      if (urls.length === 0) {
        return;
      }

      logger.groupCollapsed(groupTitle);

      for (const url of urls) {
        logger.log(url);
      }

      logger.groupEnd();
    }
    /**
     * @param {Array<string>} urlsToPrecache
     * @param {Array<string>} urlsAlreadyPrecached
     *
     * @private
     * @memberof module:workbox-precaching
     */


    function printInstallDetails(urlsToPrecache, urlsAlreadyPrecached) {
      const precachedCount = urlsToPrecache.length;
      const alreadyPrecachedCount = urlsAlreadyPrecached.length;

      if (precachedCount || alreadyPrecachedCount) {
        let message = `Precaching ${precachedCount} file${precachedCount === 1 ? '' : 's'}.`;

        if (alreadyPrecachedCount > 0) {
          message += ` ${alreadyPrecachedCount} ` + `file${alreadyPrecachedCount === 1 ? ' is' : 's are'} already cached.`;
        }

        logger.groupCollapsed(message);

        _nestedGroup(`View newly precached URLs.`, urlsToPrecache);

        _nestedGroup(`View previously precached URLs.`, urlsAlreadyPrecached);

        logger.groupEnd();
      }
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Performs efficient precaching of assets.
     *
     * @memberof module:workbox-precaching
     */

    class PrecacheController {
      /**
       * Create a new PrecacheController.
       *
       * @param {string} [cacheName] An optional name for the cache, to override
       * the default precache name.
       */
      constructor(cacheName) {
        this._cacheName = cacheNames.getPrecacheName(cacheName);
        this._urlsToCacheKeys = new Map();
        this._urlsToCacheModes = new Map();
        this._cacheKeysToIntegrities = new Map();
      }
      /**
       * This method will add items to the precache list, removing duplicates
       * and ensuring the information is valid.
       *
       * @param {
       * Array<module:workbox-precaching.PrecacheController.PrecacheEntry|string>
       * } entries Array of entries to precache.
       */


      addToCacheList(entries) {
        {
          finalAssertExports.isArray(entries, {
            moduleName: 'workbox-precaching',
            className: 'PrecacheController',
            funcName: 'addToCacheList',
            paramName: 'entries'
          });
        }

        const urlsToWarnAbout = [];

        for (const entry of entries) {
          // See https://github.com/GoogleChrome/workbox/issues/2259
          if (typeof entry === 'string') {
            urlsToWarnAbout.push(entry);
          } else if (entry && entry.revision === undefined) {
            urlsToWarnAbout.push(entry.url);
          }

          const {
            cacheKey,
            url
          } = createCacheKey(entry);
          const cacheMode = typeof entry !== 'string' && entry.revision ? 'reload' : 'default';

          if (this._urlsToCacheKeys.has(url) && this._urlsToCacheKeys.get(url) !== cacheKey) {
            throw new WorkboxError('add-to-cache-list-conflicting-entries', {
              firstEntry: this._urlsToCacheKeys.get(url),
              secondEntry: cacheKey
            });
          }

          if (typeof entry !== 'string' && entry.integrity) {
            if (this._cacheKeysToIntegrities.has(cacheKey) && this._cacheKeysToIntegrities.get(cacheKey) !== entry.integrity) {
              throw new WorkboxError('add-to-cache-list-conflicting-integrities', {
                url
              });
            }

            this._cacheKeysToIntegrities.set(cacheKey, entry.integrity);
          }

          this._urlsToCacheKeys.set(url, cacheKey);

          this._urlsToCacheModes.set(url, cacheMode);

          if (urlsToWarnAbout.length > 0) {
            const warningMessage = `Workbox is precaching URLs without revision ` + `info: ${urlsToWarnAbout.join(', ')}\nThis is generally NOT safe. ` + `Learn more at https://bit.ly/wb-precache`;

            {
              logger.warn(warningMessage);
            }
          }
        }
      }
      /**
       * Precaches new and updated assets. Call this method from the service worker
       * install event.
       *
       * @param {Object} options
       * @param {Event} [options.event] The install event (if needed).
       * @param {Array<Object>} [options.plugins] Plugins to be used for fetching
       * and caching during install.
       * @return {Promise<module:workbox-precaching.InstallResult>}
       */


      async install({
        event,
        plugins
      } = {}) {
        {
          if (plugins) {
            finalAssertExports.isArray(plugins, {
              moduleName: 'workbox-precaching',
              className: 'PrecacheController',
              funcName: 'install',
              paramName: 'plugins'
            });
          }
        }

        const toBePrecached = [];
        const alreadyPrecached = [];
        const cache = await self.caches.open(this._cacheName);
        const alreadyCachedRequests = await cache.keys();
        const existingCacheKeys = new Set(alreadyCachedRequests.map(request => request.url));

        for (const [url, cacheKey] of this._urlsToCacheKeys) {
          if (existingCacheKeys.has(cacheKey)) {
            alreadyPrecached.push(url);
          } else {
            toBePrecached.push({
              cacheKey,
              url
            });
          }
        }

        const precacheRequests = toBePrecached.map(({
          cacheKey,
          url
        }) => {
          const integrity = this._cacheKeysToIntegrities.get(cacheKey);

          const cacheMode = this._urlsToCacheModes.get(url);

          return this._addURLToCache({
            cacheKey,
            cacheMode,
            event,
            integrity,
            plugins,
            url
          });
        });
        await Promise.all(precacheRequests);
        const updatedURLs = toBePrecached.map(item => item.url);

        {
          printInstallDetails(updatedURLs, alreadyPrecached);
        }

        return {
          updatedURLs,
          notUpdatedURLs: alreadyPrecached
        };
      }
      /**
       * Deletes assets that are no longer present in the current precache manifest.
       * Call this method from the service worker activate event.
       *
       * @return {Promise<module:workbox-precaching.CleanupResult>}
       */


      async activate() {
        const cache = await self.caches.open(this._cacheName);
        const currentlyCachedRequests = await cache.keys();
        const expectedCacheKeys = new Set(this._urlsToCacheKeys.values());
        const deletedURLs = [];

        for (const request of currentlyCachedRequests) {
          if (!expectedCacheKeys.has(request.url)) {
            await cache.delete(request);
            deletedURLs.push(request.url);
          }
        }

        {
          printCleanupDetails(deletedURLs);
        }

        return {
          deletedURLs
        };
      }
      /**
       * Requests the entry and saves it to the cache if the response is valid.
       * By default, any response with a status code of less than 400 (including
       * opaque responses) is considered valid.
       *
       * If you need to use custom criteria to determine what's valid and what
       * isn't, then pass in an item in `options.plugins` that implements the
       * `cacheWillUpdate()` lifecycle event.
       *
       * @private
       * @param {Object} options
       * @param {string} options.cacheKey The string to use a cache key.
       * @param {string} options.url The URL to fetch and cache.
       * @param {string} [options.cacheMode] The cache mode for the network request.
       * @param {Event} [options.event] The install event (if passed).
       * @param {Array<Object>} [options.plugins] An array of plugins to apply to
       * fetch and caching.
       * @param {string} [options.integrity] The value to use for the `integrity`
       * field when making the request.
       */


      async _addURLToCache({
        cacheKey,
        url,
        cacheMode,
        event,
        plugins,
        integrity
      }) {
        const request = new Request(url, {
          integrity,
          cache: cacheMode,
          credentials: 'same-origin'
        });
        let response = await fetchWrapper.fetch({
          event,
          plugins,
          request
        }); // Allow developers to override the default logic about what is and isn't
        // valid by passing in a plugin implementing cacheWillUpdate(), e.g.
        // a `CacheableResponsePlugin` instance.

        let cacheWillUpdatePlugin;

        for (const plugin of plugins || []) {
          if ('cacheWillUpdate' in plugin) {
            cacheWillUpdatePlugin = plugin;
          }
        }

        const isValidResponse = cacheWillUpdatePlugin ? // Use a callback if provided. It returns a truthy value if valid.
        // NOTE: invoke the method on the plugin instance so the `this` context
        // is correct.
        await cacheWillUpdatePlugin.cacheWillUpdate({
          event,
          request,
          response
        }) : // Otherwise, default to considering any response status under 400 valid.
        // This includes, by default, considering opaque responses valid.
        response.status < 400; // Consider this a failure, leading to the `install` handler failing, if
        // we get back an invalid response.

        if (!isValidResponse) {
          throw new WorkboxError('bad-precaching-response', {
            url,
            status: response.status
          });
        } // Redirected responses cannot be used to satisfy a navigation request, so
        // any redirected response must be "copied" rather than cloned, so the new
        // response doesn't contain the `redirected` flag. See:
        // https://bugs.chromium.org/p/chromium/issues/detail?id=669363&desc=2#c1


        if (response.redirected) {
          response = await copyResponse(response);
        }

        await cacheWrapper.put({
          event,
          plugins,
          response,
          // `request` already uses `url`. We may be able to reuse it.
          request: cacheKey === url ? request : new Request(cacheKey),
          cacheName: this._cacheName,
          matchOptions: {
            ignoreSearch: true
          }
        });
      }
      /**
       * Returns a mapping of a precached URL to the corresponding cache key, taking
       * into account the revision information for the URL.
       *
       * @return {Map<string, string>} A URL to cache key mapping.
       */


      getURLsToCacheKeys() {
        return this._urlsToCacheKeys;
      }
      /**
       * Returns a list of all the URLs that have been precached by the current
       * service worker.
       *
       * @return {Array<string>} The precached URLs.
       */


      getCachedURLs() {
        return [...this._urlsToCacheKeys.keys()];
      }
      /**
       * Returns the cache key used for storing a given URL. If that URL is
       * unversioned, like `/index.html', then the cache key will be the original
       * URL with a search parameter appended to it.
       *
       * @param {string} url A URL whose cache key you want to look up.
       * @return {string} The versioned URL that corresponds to a cache key
       * for the original URL, or undefined if that URL isn't precached.
       */


      getCacheKeyForURL(url) {
        const urlObject = new URL(url, location.href);
        return this._urlsToCacheKeys.get(urlObject.href);
      }
      /**
       * This acts as a drop-in replacement for [`cache.match()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)
       * with the following differences:
       *
       * - It knows what the name of the precache is, and only checks in that cache.
       * - It allows you to pass in an "original" URL without versioning parameters,
       * and it will automatically look up the correct cache key for the currently
       * active revision of that URL.
       *
       * E.g., `matchPrecache('index.html')` will find the correct precached
       * response for the currently active service worker, even if the actual cache
       * key is `'/index.html?__WB_REVISION__=1234abcd'`.
       *
       * @param {string|Request} request The key (without revisioning parameters)
       * to look up in the precache.
       * @return {Promise<Response|undefined>}
       */


      async matchPrecache(request) {
        const url = request instanceof Request ? request.url : request;
        const cacheKey = this.getCacheKeyForURL(url);

        if (cacheKey) {
          const cache = await self.caches.open(this._cacheName);
          return cache.match(cacheKey);
        }

        return undefined;
      }
      /**
       * Returns a function that can be used within a
       * {@link module:workbox-routing.Route} that will find a response for the
       * incoming request against the precache.
       *
       * If for an unexpected reason there is a cache miss for the request,
       * this will fall back to retrieving the `Response` via `fetch()` when
       * `fallbackToNetwork` is `true`.
       *
       * @param {boolean} [fallbackToNetwork=true] Whether to attempt to get the
       * response from the network if there's a precache miss.
       * @return {module:workbox-routing~handlerCallback}
       */


      createHandler(fallbackToNetwork = true) {
        return async ({
          request
        }) => {
          try {
            const response = await this.matchPrecache(request);

            if (response) {
              return response;
            } // This shouldn't normally happen, but there are edge cases:
            // https://github.com/GoogleChrome/workbox/issues/1441


            throw new WorkboxError('missing-precache-entry', {
              cacheName: this._cacheName,
              url: request instanceof Request ? request.url : request
            });
          } catch (error) {
            if (fallbackToNetwork) {
              {
                logger.debug(`Unable to respond with precached response. ` + `Falling back to network.`, error);
              }

              return fetch(request);
            }

            throw error;
          }
        };
      }
      /**
       * Returns a function that looks up `url` in the precache (taking into
       * account revision information), and returns the corresponding `Response`.
       *
       * If for an unexpected reason there is a cache miss when looking up `url`,
       * this will fall back to retrieving the `Response` via `fetch()` when
       * `fallbackToNetwork` is `true`.
       *
       * @param {string} url The precached URL which will be used to lookup the
       * `Response`.
       * @param {boolean} [fallbackToNetwork=true] Whether to attempt to get the
       * response from the network if there's a precache miss.
       * @return {module:workbox-routing~handlerCallback}
       */


      createHandlerBoundToURL(url, fallbackToNetwork = true) {
        const cacheKey = this.getCacheKeyForURL(url);

        if (!cacheKey) {
          throw new WorkboxError('non-precached-url', {
            url
          });
        }

        const handler = this.createHandler(fallbackToNetwork);
        const request = new Request(url);
        return () => handler({
          request
        });
      }

    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    let precacheController;
    /**
     * @return {PrecacheController}
     * @private
     */

    const getOrCreatePrecacheController = () => {
      if (!precacheController) {
        precacheController = new PrecacheController();
      }

      return precacheController;
    };

    /*
      Copyright 2018 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Removes any URL search parameters that should be ignored.
     *
     * @param {URL} urlObject The original URL.
     * @param {Array<RegExp>} ignoreURLParametersMatching RegExps to test against
     * each search parameter name. Matches mean that the search parameter should be
     * ignored.
     * @return {URL} The URL with any ignored search parameters removed.
     *
     * @private
     * @memberof module:workbox-precaching
     */

    function removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching = []) {
      // Convert the iterable into an array at the start of the loop to make sure
      // deletion doesn't mess up iteration.
      for (const paramName of [...urlObject.searchParams.keys()]) {
        if (ignoreURLParametersMatching.some(regExp => regExp.test(paramName))) {
          urlObject.searchParams.delete(paramName);
        }
      }

      return urlObject;
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Generator function that yields possible variations on the original URL to
     * check, one at a time.
     *
     * @param {string} url
     * @param {Object} options
     *
     * @private
     * @memberof module:workbox-precaching
     */

    function* generateURLVariations(url, {
      ignoreURLParametersMatching,
      directoryIndex,
      cleanURLs,
      urlManipulation
    } = {}) {
      const urlObject = new URL(url, location.href);
      urlObject.hash = '';
      yield urlObject.href;
      const urlWithoutIgnoredParams = removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching);
      yield urlWithoutIgnoredParams.href;

      if (directoryIndex && urlWithoutIgnoredParams.pathname.endsWith('/')) {
        const directoryURL = new URL(urlWithoutIgnoredParams.href);
        directoryURL.pathname += directoryIndex;
        yield directoryURL.href;
      }

      if (cleanURLs) {
        const cleanURL = new URL(urlWithoutIgnoredParams.href);
        cleanURL.pathname += '.html';
        yield cleanURL.href;
      }

      if (urlManipulation) {
        const additionalURLs = urlManipulation({
          url: urlObject
        });

        for (const urlToAttempt of additionalURLs) {
          yield urlToAttempt.href;
        }
      }
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * This function will take the request URL and manipulate it based on the
     * configuration options.
     *
     * @param {string} url
     * @param {Object} options
     * @return {string} Returns the URL in the cache that matches the request,
     * if possible.
     *
     * @private
     */

    const getCacheKeyForURL = (url, options) => {
      const precacheController = getOrCreatePrecacheController();
      const urlsToCacheKeys = precacheController.getURLsToCacheKeys();

      for (const possibleURL of generateURLVariations(url, options)) {
        const possibleCacheKey = urlsToCacheKeys.get(possibleURL);

        if (possibleCacheKey) {
          return possibleCacheKey;
        }
      }
    };

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * Adds a `fetch` listener to the service worker that will
     * respond to
     * [network requests]{@link https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#Custom_responses_to_requests}
     * with precached assets.
     *
     * Requests for assets that aren't precached, the `FetchEvent` will not be
     * responded to, allowing the event to fall through to other `fetch` event
     * listeners.
     *
     * NOTE: when called more than once this method will replace the previously set
     * configuration options. Calling it more than once is not recommended outside
     * of tests.
     *
     * @private
     * @param {Object} [options]
     * @param {string} [options.directoryIndex=index.html] The `directoryIndex` will
     * check cache entries for a URLs ending with '/' to see if there is a hit when
     * appending the `directoryIndex` value.
     * @param {Array<RegExp>} [options.ignoreURLParametersMatching=[/^utm_/]] An
     * array of regex's to remove search params when looking for a cache match.
     * @param {boolean} [options.cleanURLs=true] The `cleanURLs` option will
     * check the cache for the URL with a `.html` added to the end of the end.
     * @param {workbox.precaching~urlManipulation} [options.urlManipulation]
     * This is a function that should take a URL and return an array of
     * alternative URLs that should be checked for precache matches.
     */

    const addFetchListener = ({
      ignoreURLParametersMatching = [/^utm_/],
      directoryIndex = 'index.html',
      cleanURLs = true,
      urlManipulation
    } = {}) => {
      const cacheName = cacheNames.getPrecacheName(); // See https://github.com/Microsoft/TypeScript/issues/28357#issuecomment-436484705

      self.addEventListener('fetch', event => {
        const precachedURL = getCacheKeyForURL(event.request.url, {
          cleanURLs,
          directoryIndex,
          ignoreURLParametersMatching,
          urlManipulation
        });

        if (!precachedURL) {
          {
            logger.debug(`Precaching did not find a match for ` + getFriendlyURL(event.request.url));
          }

          return;
        }

        let responsePromise = self.caches.open(cacheName).then(cache => {
          return cache.match(precachedURL);
        }).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          } // Fall back to the network if we don't have a cached response
          // (perhaps due to manual cache cleanup).


          {
            logger.warn(`The precached response for ` + `${getFriendlyURL(precachedURL)} in ${cacheName} was not found. ` + `Falling back to the network instead.`);
          }

          return fetch(precachedURL);
        });

        {
          responsePromise = responsePromise.then(response => {
            // Workbox is going to handle the route.
            // print the routing details to the console.
            logger.groupCollapsed(`Precaching is responding to: ` + getFriendlyURL(event.request.url));
            logger.log(`Serving the precached url: ${precachedURL}`);
            logger.groupCollapsed(`View request details here.`);
            logger.log(event.request);
            logger.groupEnd();
            logger.groupCollapsed(`View response details here.`);
            logger.log(response);
            logger.groupEnd();
            logger.groupEnd();
            return response;
          });
        }

        event.respondWith(responsePromise);
      });
    };

    /*
      Copyright 2019 Google LLC
      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    let listenerAdded = false;
    /**
     * Add a `fetch` listener to the service worker that will
     * respond to
     * [network requests]{@link https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#Custom_responses_to_requests}
     * with precached assets.
     *
     * Requests for assets that aren't precached, the `FetchEvent` will not be
     * responded to, allowing the event to fall through to other `fetch` event
     * listeners.
     *
     * @param {Object} [options]
     * @param {string} [options.directoryIndex=index.html] The `directoryIndex` will
     * check cache entries for a URLs ending with '/' to see if there is a hit when
     * appending the `directoryIndex` value.
     * @param {Array<RegExp>} [options.ignoreURLParametersMatching=[/^utm_/]] An
     * array of regex's to remove search params when looking for a cache match.
     * @param {boolean} [options.cleanURLs=true] The `cleanURLs` option will
     * check the cache for the URL with a `.html` added to the end of the end.
     * @param {module:workbox-precaching~urlManipulation} [options.urlManipulation]
     * This is a function that should take a URL and return an array of
     * alternative URLs that should be checked for precache matches.
     *
     * @memberof module:workbox-precaching
     */

    function addRoute(options) {
      if (!listenerAdded) {
        addFetchListener(options);
        listenerAdded = true;
      }
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    const plugins = [];
    const precachePlugins = {
      /*
       * @return {Array}
       * @private
       */
      get() {
        return plugins;
      },

      /*
       * @param {Array} newPlugins
       * @private
       */
      add(newPlugins) {
        plugins.push(...newPlugins);
      }

    };

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */

    const installListener = event => {
      const precacheController = getOrCreatePrecacheController();
      const plugins = precachePlugins.get();
      event.waitUntil(precacheController.install({
        event,
        plugins
      }).catch(error => {
        {
          logger.error(`Service worker installation failed. It will ` + `be retried automatically during the next navigation.`);
        } // Re-throw the error to ensure installation fails.


        throw error;
      }));
    };

    const activateListener = event => {
      const precacheController = getOrCreatePrecacheController();
      event.waitUntil(precacheController.activate());
    };
    /**
     * Adds items to the precache list, removing any duplicates and
     * stores the files in the
     * ["precache cache"]{@link module:workbox-core.cacheNames} when the service
     * worker installs.
     *
     * This method can be called multiple times.
     *
     * Please note: This method **will not** serve any of the cached files for you.
     * It only precaches files. To respond to a network request you call
     * [addRoute()]{@link module:workbox-precaching.addRoute}.
     *
     * If you have a single array of files to precache, you can just call
     * [precacheAndRoute()]{@link module:workbox-precaching.precacheAndRoute}.
     *
     * @param {Array<Object|string>} [entries=[]] Array of entries to precache.
     *
     * @memberof module:workbox-precaching
     */


    function precache(entries) {
      const precacheController = getOrCreatePrecacheController();
      precacheController.addToCacheList(entries);

      if (entries.length > 0) {
        // NOTE: these listeners will only be added once (even if the `precache()`
        // method is called multiple times) because event listeners are implemented
        // as a set, where each listener must be unique.
        // See https://github.com/Microsoft/TypeScript/issues/28357#issuecomment-436484705
        self.addEventListener('install', installListener);
        self.addEventListener('activate', activateListener);
      }
    }

    /*
      Copyright 2019 Google LLC

      Use of this source code is governed by an MIT-style
      license that can be found in the LICENSE file or at
      https://opensource.org/licenses/MIT.
    */
    /**
     * This method will add entries to the precache list and add a route to
     * respond to fetch events.
     *
     * This is a convenience method that will call
     * [precache()]{@link module:workbox-precaching.precache} and
     * [addRoute()]{@link module:workbox-precaching.addRoute} in a single call.
     *
     * @param {Array<Object|string>} entries Array of entries to precache.
     * @param {Object} [options] See
     * [addRoute() options]{@link module:workbox-precaching.addRoute}.
     *
     * @memberof module:workbox-precaching
     */

    function precacheAndRoute(entries, options) {
      precache(entries);
      addRoute(options);
    }

    exports.precacheAndRoute = precacheAndRoute;

});
//# sourceMappingURL=workbox-4af82245.js.map
