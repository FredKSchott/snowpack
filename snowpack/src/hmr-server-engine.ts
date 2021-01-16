import WebSocket from 'ws';
import stripAnsi from 'strip-ansi';
import http from 'http';
import type http2 from 'http2';

interface Dependency {
  dependents: Set<string>;
  dependencies: Set<string>;
  isHmrEnabled: boolean;
  isHmrAccepted: boolean;
  needsReplacement: boolean;
  needsReplacementCount: number;
}

type HMRMessage =
  | {type: 'reload'}
  | {type: 'update'; url: string; bubbled: boolean}
  | {
      type: 'error';
      title: string;
      errorMessage: string;
      fileLoc?: string;
      errorStackTrace?: string;
    };

const DEFAULT_CONNECT_DELAY = 2000;
const DEFAULT_PORT = 12321;

type EsmHmrEngineOptions = {
  delay?: number
  server?: http.Server | http2.Http2SecureServer
  port?: number
};

export interface IEsmHmrEngine {
  readonly port: number;
  readonly enabled: boolean;
  listen(): Promise<number>;
  disconnectAllClients(): void;

  setEntry(sourceUrl: string, imports: string[], isHmrEnabled?: boolean): void;
  getEntry(sourceUrl: string, createIfNotFound?: boolean): Dependency | null;

  broadcastMessage(data: HMRMessage): void;
  markEntryForReplacement(entry: Dependency, state: boolean): void;
}

export class NoopHmrEngine implements IEsmHmrEngine {
  port = DEFAULT_PORT;
  enabled = false;
  listen() {return Promise.resolve(DEFAULT_PORT)}
  disconnectAllClients() {}
  getEntry(): Dependency | null {
    return null;
  }
  setEntry() {}
  broadcastMessage(): void {}
  markEntryForReplacement(): void {}
}

export class EsmHmrEngine implements IEsmHmrEngine {
  clients: Set<WebSocket> = new Set();
  dependencyTree = new Map<string, Dependency>();

  private delay: number = 0;
  private currentBatch: HMRMessage[] = [];
  private currentBatchTimeout: NodeJS.Timer | null = null;
  private cachedConnectErrors: Set<HMRMessage> = new Set();
  readonly port: number = 0;
  readonly enabled = true;
  readonly server?: http.Server | http2.Http2SecureServer;

  constructor(options: EsmHmrEngineOptions) {
    this.delay = options.delay ?? 0;
    this.server = options.server;
    const wss = options.server
      ? new WebSocket.Server({noServer: true})
      : new WebSocket.Server({port: options.port ?? DEFAULT_PORT });

      // @ts-ignore - if address is a string, then the fallbacks will still return the proper value
    this.port = wss.address()?.port
      // @ts-ignore - if address is a string, then the fallbacks will still return the proper value
      ?? this.server?.address()?.port
      ?? options.port
      ?? DEFAULT_PORT;

    options.server?.on('upgrade', (req, socket, head) => {
      // Only handle upgrades to ESM-HMR requests, ignore others.
      if (req.headers['sec-websocket-protocol'] !== 'esm-hmr') {
        return;
      }
      wss.handleUpgrade(req, socket, head, (client) => {
        wss.emit('connection', client, req);
      });
    });

    wss.on('connection', (client) => {
      this.connectClient(client);
      this.registerListener(client);
      if (this.cachedConnectErrors.size > 0) {
        this.dispatchMessage(Array.from(this.cachedConnectErrors), client);
      }
    });
    wss.on('close', (client) => {
      this.disconnectClient(client);
    });
  }

  listen(): Promise<number> {
    const server = this.server;
    if (!server) {
      return Promise.resolve(this.port);
    }

    if (server.listening) {
      return Promise.resolve(this.port);
    }

    return new Promise((resolve, reject) => {
      const errorHandler = (e: Error) => reject(e);
      server
        .addListener('error', errorHandler)
        .listen(this.port, () => {
          server.removeListener('error', errorHandler);
          resolve(this.port);
        });
    });
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
    // Special "error" event handling
    if (data.type === 'error') {
      // Clean: remove any console styling before we send to the browser
      // NOTE(@fks): If another event ever needs this, okay to generalize.
      data.title = data.title && stripAnsi(data.title);
      data.errorMessage = data.errorMessage && stripAnsi(data.errorMessage);
      data.fileLoc = data.fileLoc && stripAnsi(data.fileLoc);
      data.errorStackTrace = data.errorStackTrace && stripAnsi(data.errorStackTrace);
      // Cache: Cache errors in case an HMR client connects after the error (first page load).
      if (
        Array.from(this.cachedConnectErrors).every(
          (f) => JSON.stringify(f) !== JSON.stringify(data),
        )
      ) {
        this.cachedConnectErrors.add(data);
        setTimeout(() => {
          this.cachedConnectErrors.delete(data);
        }, DEFAULT_CONNECT_DELAY);
      }
    }
    if (this.delay > 0) {
      if (this.currentBatchTimeout) {
        clearTimeout(this.currentBatchTimeout);
      }
      this.currentBatch.push(data);
      this.currentBatchTimeout = setTimeout(() => this.dispatchBatch(), this.delay || 100);
    } else {
      this.dispatchMessage([data]);
    }
  }

  dispatchBatch() {
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
   * `broadcastMessage` and `dispatchBatch` manage the delay then use this,
   * internally when it's time to actually send the data.
   */
  private dispatchMessage(messageBatch: HMRMessage[], singleClient?: WebSocket) {
    if (messageBatch.length === 0) {
      return;
    }
    const clientRecipientList = singleClient ? [singleClient] : this.clients;
    let singleSummaryMessage = messageBatch.find((message) => message.type === 'reload') || null;
    clientRecipientList.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (singleSummaryMessage) {
          client.send(JSON.stringify(singleSummaryMessage));
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
