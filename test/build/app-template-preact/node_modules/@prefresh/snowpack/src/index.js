import { compareSignatures, isComponent } from '@prefresh/utils';

export default function preactRefreshPlugin(config, pluginOptions) {
	return {
		knownEntrypoints: ['@prefresh/core'],
		async transform({ contents, urlPath, isDev }) {
			if (!isDev || !urlPath.endsWith('.js')) return;

			const parts = urlPath.split('/');
			const lastPart = parts[parts.length - 1];

			const postLude = `
        if (import.meta.hot) {
          import.meta.hot.accept(({ module }) => {
            try {
              for (let i in module) {
                if (typeof module[i] === 'function') {
                  if (i in $CurrentModule$) {
                    // We could add a check here on i.name if it's a component.
                    compareSignaturesForPrefreshment(
                      $CurrentModule$[i],
                      module[i]
                    );
                  }
                }
              }
              $CurrentModule$ = module;
            } catch(e) {
              if (import.meta.hot.invalidate) {
                import.meta.hot.invalidate();
              } else {
                window.location.reload();
              }
            }
          });
        }
      `;

			return {
				result: `
          import '@prefresh/core';
          import * as $OriginalModule$ from ${JSON.stringify(urlPath)};
          let $CurrentModule$ = $OriginalModule$;

          const compareSignaturesForPrefreshment = ${compareSignatures.toString()};

          window.$RefreshSig$ = () => {
            let status = 'begin';
            let savedType;
            return (type, key, forceReset, getCustomHooks) => {
              if (!savedType) savedType = type;
              status = window.__PREFRESH__.sign(type || savedType, key, forceReset, getCustomHooks, status);
            };
          };

          window.$RefreshReg$ = (type, id) => {};

          ${contents}
          ${isComponent(lastPart) ? postLude : ''}
        `
			};
		}
	};
}
