import type {CommandOptions, SnowpackBuildResult} from '../types';
import {logger} from '../logger';
import {
  createBuildState,
  maybeCleanBuildDirectory,
  addBuildFilesFromMountpoints,
  buildFiles,
  buildDependencies,
  optimize,
  writeToDisk,
  postBuildCleanup,
  startWatch,
} from '../build/process';

export async function build(commandOptions: CommandOptions): Promise<SnowpackBuildResult> {
  const buildState = await createBuildState(commandOptions);

  // Start by cleaning the directory
  maybeCleanBuildDirectory(buildState);

  await addBuildFilesFromMountpoints(buildState);
  await buildFiles(buildState);
  await buildDependencies(buildState);
  await writeToDisk(buildState);

  // "--watch" mode - Start watching the file system.
  if (buildState.isWatch) {
    return startWatch(buildState);
  }

  await optimize(buildState);
  await postBuildCleanup(buildState);

  return {
    onFileChange: () => {
      throw new Error('build().onFileChange() only supported in "watch" mode.');
    },
    shutdown: () => {
      throw new Error('build().shutdown() only supported in "watch" mode.');
    },
  };
}

export async function command(commandOptions: CommandOptions) {
  try {
    commandOptions.config.devOptions.output =
      commandOptions.config.devOptions.output ||
      (commandOptions.config.buildOptions.watch ? 'dashboard' : 'stream');
    await build(commandOptions);
  } catch (err) {
    logger.error(err.message);
    logger.error(err.stack);
    process.exit(1);
  }

  if (commandOptions.config.buildOptions.watch) {
    // We intentionally never want to exit in watch mode!
    return new Promise(() => {});
  }
}
