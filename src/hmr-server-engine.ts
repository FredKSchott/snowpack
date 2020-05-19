import http from 'http';

function sendMessage(res: http.ServerResponse, channel: string, data: string) {
  res.write(`event: ${channel}\nid: 0\ndata: ${data}\n`);
  res.write('\n\n');
}

export class EsmHmrEngine {
  clients: http.ServerResponse[] = [];

  broadcastMessage(channel: string, data: object) {
    for (const client of this.clients) {
      sendMessage(client, channel, JSON.stringify(data));
    }
  }

  connectClient(res: http.ServerResponse) {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    sendMessage(res, 'connected', 'ready');
    setInterval(sendMessage, 60000, res, 'ping', 'waiting');
    this.clients.push(res);
  }

  disconnectClient(client: http.ServerResponse) {
    this.clients.splice(this.clients.indexOf(client), 1);
  }

  disconnectAllClients() {
    for (const client of this.clients) {
      client.end();
    }
  }
}
