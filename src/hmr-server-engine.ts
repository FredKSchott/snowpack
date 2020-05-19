import http from 'http';

const liveReloadClients: http.ServerResponse[] = [];

function sendMessage(res: http.ServerResponse, channel: string, data: string) {
  res.write(`event: ${channel}\nid: 0\ndata: ${data}\n`);
  res.write('\n\n');
}

export function broadcastMessage(channel: string, data: object) {
  for (const client of liveReloadClients) {
    sendMessage(client, channel, JSON.stringify(data));
  }
}

export function handleConnection(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  sendMessage(res, 'connected', 'ready');
  setInterval(sendMessage, 60000, res, 'ping', 'waiting');
  liveReloadClients.push(res);
  req.on('close', () => {
    liveReloadClients.splice(liveReloadClients.indexOf(res), 1);
  });
}

process.on('SIGINT', () => {
  for (const client of liveReloadClients) {
    client.end();
  }
  process.exit(0);
});
