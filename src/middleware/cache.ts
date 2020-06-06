import {SnowpackPluginBuildResult} from '../config';

export interface MiddlewareCache {
  inMemoryBuildCache: Map<string, Buffer>;
  inMemoryResourceCache: Map<string, string>;
  filesBeingDeleted: Set<string>;
  filesBeingBuilt: Map<string, Promise<SnowpackPluginBuildResult>>;
}

export default function createCache(): MiddlewareCache {
  return {
    inMemoryBuildCache: new Map<string, Buffer>(),
    inMemoryResourceCache: new Map<string, string>(),
    filesBeingDeleted: new Set<string>(),
    filesBeingBuilt: new Map<string, Promise<SnowpackPluginBuildResult>>(),
  };
}
