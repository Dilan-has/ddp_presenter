// Client-side Network & Broadcast Synchronization for DDP Presenter
// Connects across LAN via WebSocket and locally across tabs via BroadcastChannel

const LOCAL_CHANNEL_NAME = "ddp_projection";
const clientId = `client-${Math.random().toString(36).substring(2, 9)}`;

let broadcastChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
  } catch (err) {
    console.warn("[NetworkSync] BroadcastChannel not supported or failed:", err);
  }
}

let ws = null;
let reconnectTimer = null;
const listeners = new Set();
let latestState = null;

function getWsUrl() {
  if (typeof window === "undefined") return "ws://localhost:3001";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  // Always connect to backend server port 3001
  return `${protocol}//${hostname}:3001`;
}

export function initNetworkSync() {
  if (typeof window === "undefined") return;

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[NetworkSync] Connected to DDP Presenter LAN server (${url})`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Ignore echo of our own outgoing messages if senderId matches
          if (msg.senderId && msg.senderId === clientId) {
            return;
          }

          if (msg.type === "INIT_STATE") {
            latestState = msg.state;
          }

          // Forward to all local subscribers
          notifyListeners(msg);
        } catch (err) {
          console.error("[NetworkSync] Error parsing incoming WS message:", err);
        }
      };

      ws.onclose = () => {
        scheduleReconnect();
      };

      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };
    } catch (e) {
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 2000);
  }

  // Also listen on local BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.senderId && msg.senderId === clientId) return;
      notifyListeners(msg);
    };
  }

  connect();
}

function notifyListeners(msg) {
  listeners.forEach((callback) => {
    try {
      callback(msg);
    } catch (err) {
      console.error("[NetworkSync] Listener error:", err);
    }
  });
}

/**
 * Send a projection control message to all screens across LAN and local browser tabs.
 */
export function sendProjectionMessage(message) {
  const payload = {
    ...message,
    senderId: clientId,
    timestamp: Date.now()
  };

  // 1. Send via WebSocket to remote devices on LAN
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      console.warn("[NetworkSync] Failed to send over WebSocket:", err);
    }
  }

  // 2. Send via local BroadcastChannel for zero-latency local tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (err) {
      console.warn("[NetworkSync] Failed to post to BroadcastChannel:", err);
    }
  }
}

/**
 * Subscribe to projection messages.
 * @param {Function} callback Function that receives message objects.
 * @returns {Function} Unsubscribe function.
 */
export function onProjectionMessage(callback) {
  listeners.add(callback);
  
  // If we already received latest state from server, optionally supply it to new listener
  if (latestState) {
    try {
      callback({ type: "INIT_STATE", state: latestState });
    } catch (_) {}
  }

  return () => {
    listeners.delete(callback);
  };
}

export function getLatestState() {
  return latestState;
}

// Auto-initialize when imported on client
if (typeof window !== "undefined") {
  initNetworkSync();
}
