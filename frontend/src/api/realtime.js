// Real-time WebSocket synchronization client for MDR Settlement Guardian

class RealtimeClient {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimeout = null;
    this.isConnected = false;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Backend runs on port 8000 in dev
      const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1:8000'
        : window.location.host;

      wsUrl = `${protocol}//${host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[MDR Realtime] Connected to WebSocket channel');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.listeners.forEach((callback) => {
            try {
              callback(payload);
            } catch (err) {
              console.error('[MDR Realtime Callback Error]:', err);
            }
          });
        } catch {
          // Non-JSON ping message
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnected = false;
        try {
          this.ws.close();
        } catch {}
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    this.connect();
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const realtime = new RealtimeClient();
