"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";

export interface OnlineState {
  doctor: boolean;
  jamaah: boolean;
}

export interface TypingState {
  isTyping: boolean;
  role: string;
}

interface PresencePayload {
  jamaahId: string;
  online: OnlineState;
}

interface TypingPayload {
  jamaahId: string;
  isTyping: boolean;
  role: string;
}

interface AlertPayload {
  jamaahId: string;
  alert: { level: "RED" | "ORANGE" | "YELLOW"; detail: string };
}

interface RequestPayload {
  jamaahId: string;
  request: unknown;
}

interface MessagePayload {
  message: import("@/lib/telemedicine-types").ChatMessageData;
}

// ===== Singleton socket (one connection shared by all components) =====
let _socket: Socket | null = null;
let _connectPromise: Promise<Socket> | null = null;
const _onlineMapListeners = new Set<(m: Record<string, OnlineState>) => void>();
const _typingMapListeners = new Set<(m: Record<string, TypingState>) => void>();
const _messageListeners = new Set<(p: MessagePayload) => void>();
const _alertListeners = new Set<(p: AlertPayload) => void>();
const _requestListeners = new Set<(p: RequestPayload) => void>();
const _responseListeners = new Set<(p: RequestPayload) => void>();
const _connectionListeners = new Set<(connected: boolean) => void>();

let _onlineMap: Record<string, OnlineState> = {};
let _typingMap: Record<string, TypingState> = {};
let _isConnected = false;

function getSocket(): Promise<Socket> {
  if (_socket && _socket.connected) return Promise.resolve(_socket);
  if (_connectPromise) return _connectPromise;

  _connectPromise = new Promise<Socket>((resolve, reject) => {
    try {
      // Connect to socket.io mini-service on port 3003, same origin (path "/")
      const s = io("/?XTransformPort=3003", {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 10000,
      });

      s.on("connect", () => {
        _isConnected = true;
        _connectionListeners.forEach((fn) => fn(true));
      });
      s.on("disconnect", () => {
        _isConnected = false;
        _connectionListeners.forEach((fn) => fn(false));
      });
      s.io.on("reconnect_attempt", () => {
        // silent
      });
      s.on("connect_error", () => {
        _isConnected = false;
        _connectionListeners.forEach((fn) => fn(false));
      });

      s.on("telemedicine:presence", (p: PresencePayload) => {
        if (!p?.jamaahId) return;
        _onlineMap = { ..._onlineMap, [p.jamaahId]: p.online ?? { doctor: false, jamaah: false } };
        _onlineMapListeners.forEach((fn) => fn(_onlineMap));
      });
      s.on("telemedicine:typing", (p: TypingPayload) => {
        if (!p?.jamaahId) return;
        _typingMap = {
          ..._typingMap,
          [p.jamaahId]: { isTyping: !!p.isTyping, role: p.role ?? "JAMAAH" },
        };
        _typingMapListeners.forEach((fn) => fn(_typingMap));
        // Auto-clear after 4s
        if (p.isTyping) {
          setTimeout(() => {
            const cur = _typingMap[p.jamaahId];
            if (cur && cur.role === (p.role ?? "JAMAAH")) {
              _typingMap = { ..._typingMap, [p.jamaahId]: { isTyping: false, role: cur.role } };
              _typingMapListeners.forEach((fn) => fn(_typingMap));
            }
          }, 4000);
        }
      });
      s.on("telemedicine:message", (p: MessagePayload) => {
        _messageListeners.forEach((fn) => fn(p));
      });
      s.on("telemedicine:alert", (p: AlertPayload) => {
        _alertListeners.forEach((fn) => fn(p));
      });
      s.on("telemedicine:request", (p: RequestPayload) => {
        _requestListeners.forEach((fn) => fn(p));
      });
      s.on("telemedicine:response", (p: RequestPayload) => {
        _responseListeners.forEach((fn) => fn(p));
      });

      _socket = s;
      // Resolve immediately — connection state is tracked via events
      resolve(s);
    } catch (e) {
      _connectPromise = null;
      reject(e);
    }
  });

  return _connectPromise;
}

export interface UseTelemedicineSocket {
  socket: Socket | null;
  isConnected: boolean;
  onlineMap: Record<string, OnlineState>;
  typingMap: Record<string, TypingState>;
  joinRoom: (jamaahId: string) => void;
  leaveRoom: (jamaahId: string) => void;
  setTyping: (jamaahId: string, isTyping: boolean, role?: string) => void;
  announcePresence: (jamaahId: string, role?: "DOCTOR" | "JAMAAH") => void;
  onMessage: (fn: (p: MessagePayload) => void) => () => void;
  onAlert: (fn: (p: AlertPayload) => void) => () => void;
  onRequest: (fn: (p: RequestPayload) => void) => () => void;
  onResponse: (fn: (p: RequestPayload) => void) => () => void;
}

export function useTelemedicineSocket(): UseTelemedicineSocket {
  const [socket, setSocket] = React.useState<Socket | null>(_socket);
  const [isConnected, setIsConnected] = React.useState<boolean>(_isConnected);
  const [onlineMap, setOnlineMap] = React.useState<Record<string, OnlineState>>(_onlineMap);
  const [typingMap, setTypingMap] = React.useState<Record<string, TypingState>>(_typingMap);

  React.useEffect(() => {
    let mounted = true;

    const connCb = (v: boolean) => mounted && setIsConnected(v);
    const onlineCb = (m: Record<string, OnlineState>) => mounted && setOnlineMap(m);
    const typingCb = (m: Record<string, TypingState>) => mounted && setTypingMap(m);
    _connectionListeners.add(connCb);
    _onlineMapListeners.add(onlineCb);
    _typingMapListeners.add(typingCb);

    getSocket()
      .then((s) => {
        if (mounted) setSocket(s);
        else s.disconnect();
      })
      .catch(() => {
        // graceful: leave socket null; UI still works in REST-only mode
      });

    return () => {
      mounted = false;
      _connectionListeners.delete(connCb);
      _onlineMapListeners.delete(onlineCb);
      _typingMapListeners.delete(typingCb);
    };
  }, []);

  const joinRoom = React.useCallback((jamaahId: string) => {
    if (!_socket) return;
    _socket.emit("telemedicine:join", { jamaahId });
    _socket.emit("telemedicine:presence", { jamaahId, role: "DOCTOR" });
  }, []);

  const leaveRoom = React.useCallback((jamaahId: string) => {
    if (!_socket) return;
    _socket.emit("telemedicine:leave", { jamaahId });
  }, []);

  const setTyping = React.useCallback(
    (jamaahId: string, isTyping: boolean, role: string = "DOCTOR") => {
      if (!_socket || !_socket.connected) return;
      _socket.emit("telemedicine:typing", { jamaahId, isTyping, role });
    },
    []
  );

  const announcePresence = React.useCallback(
    (jamaahId: string, role: "DOCTOR" | "JAMAAH" = "DOCTOR") => {
      if (!_socket) return;
      _socket.emit("telemedicine:presence", { jamaahId, role });
    },
    []
  );

  const onMessage = React.useCallback((fn: (p: MessagePayload) => void) => {
    _messageListeners.add(fn);
    return () => {
      _messageListeners.delete(fn);
    };
  }, []);

  const onAlert = React.useCallback((fn: (p: AlertPayload) => void) => {
    _alertListeners.add(fn);
    return () => {
      _alertListeners.delete(fn);
    };
  }, []);

  const onRequest = React.useCallback((fn: (p: RequestPayload) => void) => {
    _requestListeners.add(fn);
    return () => {
      _requestListeners.delete(fn);
    };
  }, []);

  const onResponse = React.useCallback((fn: (p: RequestPayload) => void) => {
    _responseListeners.add(fn);
    return () => {
      _responseListeners.delete(fn);
    };
  }, []);

  return {
    socket,
    isConnected,
    onlineMap,
    typingMap,
    joinRoom,
    leaveRoom,
    setTyping,
    announcePresence,
    onMessage,
    onAlert,
    onRequest,
    onResponse,
  };
}
