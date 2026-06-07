import { useEffect, useRef, useCallback } from "react";
import { WS_URL } from "../lib/utils";

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      const delay = Math.min(30000, 1000 * 2 ** reconnectRef.current);
      reconnectRef.current++;
      setTimeout(connect, delay);
    };
    ws.onopen = () => { reconnectRef.current = 0; };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return wsRef;
}
