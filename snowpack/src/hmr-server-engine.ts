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

type HMRMessage = {type: 'reload'} | {type: 'update', url: string};
const DEFAULT_PORT = 12321;

export class EsmHmrEngine {
  clients: Set<WebSocket> = new Set();
  dependencyTree = new Map<string, Dependency>();

  private delay: number = 0;
  private currentBatch: HMRMessage[] = [];
  private currentBatchTimeout: NodeJS.Timer | null = null;
  wsUrl = `ws://localhost:${DEFAULT_PORT}`;

  constructor(
    options: {server?: http.Server | http2.Http2Server; delay?: number} = {},
  ) {
    const wss = options.server
      ? new WebSocket.Server({noServer: true})
      : new WebSocket.Server({port: DEFAULT_PORT});
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
    if (options.delay) {
      this.delay = options.delay;
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

  broadcastMessage(data: HMRMessage) {
    if (this.delay > 0) {
      if (this.currentBatchTimeout) {
        clearTimeout(this.currentBatchTimeout);
      }
      this.currentBatch.push(data);
      this.currentBatchTimeout = setTimeout(() => this.broadcastBatch(), this.delay);
    } else {
      this.dispatchMessage([data]);
    }
  }

  broadcastBatch() {
    if (this.currentBatchTimeout) {
      clearTimeout(this.currentBatchTimeout);
    }
    if (this.currentBatch.length > 0) {
      this.dispatchMessage(this.currentBatch);
      this.currentBatch = [];
    }
  }

  /**
   * This is shared logic to dispatch messages to the clients. The public methods
   * `broadcastMessage` and `broadcastBatch` manage the delay then use this,
   * internally when it's time to actually send the data.
   */
  private dispatchMessage(messageBatch: HMRMessage[]) {
    if (messageBatch.length === 0) {
      return;
    }

    let singleReloadMessage =
      messageBatch.every(message => message.type === 'reload')
        ? messageBatch[0]
        : null;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (singleReloadMessage) {
          client.send(JSON.stringify(singleReloadMessage));
        } else {
          messageBatch.forEach((data) => {
            client.send(JSON.stringify(data));
          });
        }
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
