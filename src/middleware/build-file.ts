import cacache from 'cacache';
import {promises as fs} from 'fs';
import path from 'path';

import {FileBuilder, isDirectoryImport} from '../commands/build-util';
import {command as installCommand} from '../commands/install';
import {SnowpackPluginBuildResult} from '../config';
import {srcFileExtensionMapping} from '../files';
import {
  findMatchingMountScript,
  resolveDependencyManifest,
  updateLockfileHash,
  DEV_DEPENDENCIES_DIR,
  BUILD_CACHE,
} from '../util';
import {transformEsmImports} from '../rewrite-imports';
import {MiddlewareContext} from '.';

interface BuildFileOptions {
  context: MiddlewareContext;
  fileBuilder?: FileBuilder;
  fileContents: string;
  filePath: string;
  reqPath: string;
}

export default async function buildFile({
  context,
  fileBuilder,
  fileContents,
  filePath,
  reqPath,
}: BuildFileOptions): Promise<SnowpackPluginBuildResult> {
  const {commandOptions, dependencyImportMap, dependencyImportMapLoc, messageBus} = context;
  const {filesBeingBuilt, inMemoryBuildCache} = context.cache;
  const {config, cwd} = commandOptions;
  let builtFileResult: SnowpackPluginBuildResult;
  let fileBuilderPromise = filesBeingBuilt.get(filePath);
  if (fileBuilderPromise) {
    builtFileResult = await fileBuilderPromise;
  } else {
    fileBuilderPromise = (async () => {
      let _builtFileResult: SnowpackPluginBuildResult = {result: fileContents};
      if (fileBuilder) {
        _builtFileResult =
          (await fileBuilder({
            contents: fileContents,
            filePath,
            isDev: true,
          })) || _builtFileResult;
      }
      for (const plugin of config.plugins) {
        if (plugin.transform) {
          _builtFileResult.result =
            (
              await plugin.transform({
                contents: _builtFileResult.result,
                urlPath: reqPath,
                isDev: true,
              })
            )?.result || _builtFileResult.result;
        }
      }
      return _builtFileResult;
    })();
    try {
      filesBeingBuilt.set(filePath, fileBuilderPromise);
      builtFileResult = await fileBuilderPromise;
    } finally {
      filesBeingBuilt.delete(filePath);
    }
  }
  const ext = path.extname(filePath).substr(1);
  if (ext === 'js' || srcFileExtensionMapping[ext] === 'js') {
    let missingWebModule: {spec: string; pkgName: string} | null = null;
    builtFileResult.result = await transformEsmImports(builtFileResult.result, (spec) => {
      if (spec.startsWith('http')) {
        return spec;
      }
      let mountScript = findMatchingMountScript(config.scripts, spec);
      if (mountScript) {
        let {fromDisk, toUrl} = mountScript.args;
        spec = spec.replace(fromDisk, toUrl);
      }
      if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
        const ext = path.extname(spec).substr(1);
        if (!ext) {
          if (isDirectoryImport(filePath, spec)) {
            return spec + '/index.js';
          } else {
            return spec + '.js';
          }
        }
        const extToReplace = srcFileExtensionMapping[ext];
        if (extToReplace) {
          spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
        }
        if (!spec.endsWith('.module.css') && (extToReplace || ext) !== 'js') {
          spec = spec + '.proxy.js';
        }
        return spec;
      }
      if (dependencyImportMap.imports[spec]) {
        let resolvedImport = path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
        const extName = path.extname(resolvedImport);
        if (extName && extName !== '.js') {
          resolvedImport = resolvedImport + '.proxy.js';
        }
        return resolvedImport;
      }
      let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
      if (missingPackageName.startsWith('@')) {
        missingPackageName += '/' + deepPackagePathParts.shift();
      }
      const [depManifestLoc] = resolveDependencyManifest(missingPackageName, cwd);
      const doesPackageExist = !!depManifestLoc;
      if (doesPackageExist && !context.currentlyRunningCommand) {
        context.isLiveReloadPaused = true;
        messageBus.emit('INSTALLING');
        context.currentlyRunningCommand = installCommand(commandOptions);
        context.currentlyRunningCommand.then(async () => {
          context.dependencyImportMap = JSON.parse(
            await fs
              .readFile(dependencyImportMapLoc, {encoding: 'utf-8'})
              .catch(() => `{"imports": {}}`),
          );
          await updateLockfileHash(DEV_DEPENDENCIES_DIR);
          await cacache.rm.all(BUILD_CACHE);
          inMemoryBuildCache.clear();
          messageBus.emit('INSTALL_COMPLETE');
          context.isLiveReloadPaused = false;
          context.currentlyRunningCommand = null;
        });
      } else if (!doesPackageExist) {
        missingWebModule = {
          spec: spec,
          pkgName: missingPackageName,
        };
      }
      const extName = path.extname(spec);
      if (extName && extName !== '.js') {
        spec = spec + '.proxy';
      }
      return `/web_modules/${spec}.js`;
    });

    messageBus.emit('MISSING_WEB_MODULE', {
      id: filePath,
      data: missingWebModule,
    });
  }

  return builtFileResult;
}
