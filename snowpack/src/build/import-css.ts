import postCss from 'postcss';
import postCssModules from 'postcss-modules';
import {logger} from '../logger';

const cssModuleNames = new Map<string, string>();

/** Generate CSS Modules for a given URL */
export async function cssModules({
  contents,
  url,
}: {
  contents: string;
  url: string;
}): Promise<{css: string; json: any}> {
  let json: any = {};
  const processor = postCss([
    postCssModules({
      getJSON: (_, moduleNames) => {
        json = moduleNames;
        cssModuleNames.set(url, JSON.stringify(moduleNames));
      },
    }),
  ]);

  const result = await processor.process(contents, {from: url, to: url});
  // log any warnings that happened.
  result
    .warnings()
    .forEach((element) => logger.warn(`${url} - ${element.text}`, {name: 'snowpack:cssmodules'}));
  return {
    css: result.css,
    json,
  };
}

/** Return CSS Modules JSON from URL */
export function cssModuleJSON(url: string) {
  return cssModuleNames.get(url) || '{}';
}
