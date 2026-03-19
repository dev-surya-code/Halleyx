import { useEffect, useRef, useCallback } from "react";

const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000/ws";

const CLIENT_PING_INTERVAL_MS = 20000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

export const useWebSocket = (onMessage) => {
  const ws = useRef(null);
  const mounted = useRef(true);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const stopPing = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: "ping" }));
        } catch (e) {}
      }
    }, CLIENT_PING_INTERVAL_MS);
  }, [stopPing]);

  const scheduleReconnect = useCallback((connectFn) => {
    if (!mounted.current) return;
    if (reconnectTimer.current) return;

    const delay = reconnectDelay.current;
    console.log(`🔄 WebSocket reconnecting in ${delay}ms…`);

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      if (mounted.current) connectFn();
    }, delay);

    reconnectDelay.current = Math.min(delay * 2, RECONNECT_MAX_MS);
  }, []);

  const connect = useCallback(() => {
    if (!mounted.current) return;
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) return;

    try {
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        if (!mounted.current) {
          socket.close();
          return;
        }
        console.log("✅ WebSocket connected");
        reconnectDelay.current = RECONNECT_BASE_MS;
        startPing();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "pong") return;
          if (onMessageRef.current) onMessageRef.current(message);
        } catch (e) {}
      };

      socket.onclose = (event) => {
        stopPing();
        if (!mounted.current) return;
        if (event.code !== 1000) {
          console.warn(
            `⚠️  WebSocket closed (code ${event.code}), scheduling reconnect`,
          );
          scheduleReconnect(connect);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err.message || err);
        stopPing();
        socket.close();
      };
    } catch (e) {
      console.error("WebSocket constructor failed:", e);
      scheduleReconnect(connect);
    }
  }, [startPing, stopPing, scheduleReconnect]);

  useEffect(() => {
    mounted.current = true;
    connect();

    return () => {
      mounted.current = false;
      stopPing();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (ws.current) {
        ws.current.close(1000, "component unmounted");
        ws.current = null;
      }
    };
  }, [connect, stopPing]);

  const send = useCallback((type, data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({ type, data }));
      } catch (e) {
        console.error("WebSocket send error:", e);
      }
    }
  }, []);

  const subscribe = useCallback(
    (executionId) => {
      send("subscribe", { execution_id: executionId });
    },
    [send],
  );

  return { send, subscribe };
};
