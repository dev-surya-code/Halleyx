/**
 * WebSocket Service for real-time execution updates
 *
 * Keepalive strategy (prevents proxy/browser 5-min idle disconnect):
 *   - Server pings every client every 25 seconds
 *   - Clients that miss 2 consecutive pings (50s) are terminated
 *   - Frontend also sends its own ping every 20s so either side keeps the TCP alive
 */

let wss = null;
const clients = new Map();

const PING_INTERVAL_MS = 25000;
const MAX_MISSED_PINGS = 2;

function initialize(websocketServer) {
  wss = websocketServer;

  wss.on("connection", (ws, req) => {
    const clientId = generateId();
    clients.set(clientId, { ws, subscriptions: [], missedPings: 0 });

    console.log(
      `🔌 WebSocket client connected: ${clientId} (total: ${clients.size})`,
    );
    send(ws, "connected", {
      client_id: clientId,
      timestamp: new Date().toISOString(),
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(clientId, data);
      } catch (err) {
        console.error("WebSocket message parse error:", err.message);
      }
    });

    ws.on("pong", () => {
      const client = clients.get(clientId);
      if (client) client.missedPings = 0;
    });

    ws.on("close", () => {
      clients.delete(clientId);
      console.log(
        `🔌 WebSocket client disconnected: ${clientId} (total: ${clients.size})`,
      );
    });

    ws.on("error", (err) => {
      console.error(`WebSocket error for ${clientId}:`, err.message);
      clients.delete(clientId);
    });
  });

  const heartbeatInterval = setInterval(() => {
    clients.forEach((client, clientId) => {
      const { ws, missedPings } = client;

      if (ws.readyState !== 1) {
        clients.delete(clientId);
        return;
      }

      if (missedPings >= MAX_MISSED_PINGS) {
        console.warn(`💀 Terminating stale WebSocket client: ${clientId}`);
        ws.terminate();
        clients.delete(clientId);
        return;
      }

      client.missedPings += 1;
      try {
        ws.ping();
      } catch (e) {
        clients.delete(clientId);
      }
    });
  }, PING_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeatInterval));
}

function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case "subscribe":
      if (
        data.execution_id &&
        !client.subscriptions.includes(data.execution_id)
      ) {
        client.subscriptions.push(data.execution_id);
      }
      break;
    case "unsubscribe":
      client.subscriptions = client.subscriptions.filter(
        (id) => id !== data.execution_id,
      );
      break;
    case "ping":
      client.missedPings = 0;
      send(client.ws, "pong", { timestamp: new Date().toISOString() });
      break;
    default:
      break;
  }
}

function send(ws, type, data) {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({ type, data, timestamp: new Date().toISOString() }),
    );
  }
}

function broadcast(type, data) {
  clients.forEach(({ ws }) => {
    send(ws, type, data);
  });
}

function broadcastToExecution(executionId, type, data) {
  clients.forEach(({ ws, subscriptions }) => {
    if (subscriptions.includes(executionId)) {
      send(ws, type, data);
    }
  });
  broadcast(type, data);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getClientCount() {
  return clients.size;
}

module.exports = {
  initialize,
  broadcast,
  broadcastToExecution,
  getClientCount,
};
