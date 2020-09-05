import WebSocket from 'ws';
import type http from 'http';
import type http2 from 'http2';

interface Dependency {
  dependents: Set<string>;
  dependencies: Set<string>;
  isHmrEnabled: boolean;
  isHmrAccepted: boolean;
  needsReplacement: boolean;
  needsReplacementCount: number;
}

export class EsmHmrEngine {
  clients: Set<WebSocket> = new Set();
  dependencyTree = new Map<string, Dependency>();
  private liveReloadDelayMs: number = 0;
  private currentBatch: object[] = [];
  private currentBatchTimeout: NodeJS.Timer | null = null;

  constructor(
    options: {server?: http.Server | http2.Http2Server; liveReloadDelayMs?: number} = {},
  ) {
    const wss = options.server
      ? new WebSocket.Server({noServer: true})
      : new WebSocket.Server({port: 12321});
    if (options.server) {
      options.server.on('upgrade', (req, socket, head) => {
        // Only handle upgrades to ESM-HMR requests, ignore others.
        if (req.headers['sec-websocket-protocol'] !== 'esm-hmr') {
          return;
        }
        wss.handleUpgrade(req, socket, head, (client) => {
          wss.emit('connection', client, req);
        });
      });
    }
    wss.on('connection', (client) => {
      this.connectClient(client);
      this.registerListener(client);
    });
    if (options.liveReloadDelayMs) {
      this.liveReloadDelayMs = options.liveReloadDelayMs;
    }
  }

  registerListener(client: WebSocket) {
    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'hotAccept') {
        const entry = this.getEntry(message.id, true) as Dependency;
        entry.isHmrAccepted = true;
        entry.isHmrEnabled = true;
      }
    });
  }

  createEntry(sourceUrl: string) {
    const newEntry: Dependency = {
      dependencies: new Set(),
      dependents: new Set(),
      needsReplacement: false,
      needsReplacementCount: 0,
      isHmrEnabled: false,
      isHmrAccepted: false,
    };
    this.dependencyTree.set(sourceUrl, newEntry);
    return newEntry;
  }

  getEntry(sourceUrl: string, createIfNotFound = false) {
    const result = this.dependencyTree.get(sourceUrl);
    if (result) {
      return result;
    }
    if (createIfNotFound) {
      return this.createEntry(sourceUrl);
    }
    return null;
  }

  setEntry(sourceUrl: string, imports: string[], isHmrEnabled = false) {
    const result = this.getEntry(sourceUrl, true)!;
    const outdatedDependencies = new Set(result.dependencies);
    result.isHmrEnabled = isHmrEnabled;
    for (const importUrl of imports) {
      this.addRelationship(sourceUrl, importUrl);
      outdatedDependencies.delete(importUrl);
    }
    for (const importUrl of outdatedDependencies) {
      this.removeRelationship(sourceUrl, importUrl);
    }
  }

  removeRelationship(sourceUrl: string, importUrl: string) {
    let importResult = this.getEntry(importUrl);
    importResult && importResult.dependents.delete(sourceUrl);
    const sourceResult = this.getEntry(sourceUrl);
    sourceResult && sourceResult.dependencies.delete(importUrl);
  }

  addRelationship(sourceUrl: string, importUrl: string) {
    if (importUrl !== sourceUrl) {
      let importResult = this.getEntry(importUrl, true)!;
      importResult.dependents.add(sourceUrl);
      const sourceResult = this.getEntry(sourceUrl, true)!;
      sourceResult.dependencies.add(importUrl);
    }
  }

  markEntryForReplacement(entry: Dependency, state: boolean) {
    if (state) {
      entry.needsReplacementCount++;
    } else {
      entry.needsReplacementCount--;
    }
    entry.needsReplacement = !!entry.needsReplacementCount;
  }

  broadcastMessage(data: object) {
    if (this.liveReloadDelayMs > 0) {
      if (this.currentBatchTimeout) {
        clearTimeout(this.currentBatchTimeout);
      }
      this.currentBatch.push(data);
      this.currentBatchTimeout = setTimeout(() => this.broadcastBatch(), this.liveReloadDelayMs);
    } else {
      this.internalBroadcastMessage([data]);
    }
  }

  broadcastBatch() {
    if (this.currentBatchTimeout) {
      clearTimeout(this.currentBatchTimeout);
    }
    if (this.currentBatch.length > 0) {
      this.internalBroadcastMessage(this.currentBatch);
      this.currentBatch = [];
    }
  }

  private internalBroadcastMessage(dataArr: object[]) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        dataArr.forEach((data) => {
          client.send(JSON.stringify(data));
        });
      } else {
        this.disconnectClient(client);
      }
    });
  }

  connectClient(client: WebSocket) {
    this.clients.add(client);
  }

  disconnectClient(client: WebSocket) {
    client.terminate();
    this.clients.delete(client);
  }

  disconnectAllClients() {
    for (const client of this.clients) {
      this.disconnectClient(client);
    }
  }
}
