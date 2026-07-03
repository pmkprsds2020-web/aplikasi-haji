// Telemedicine socket.io mini-service — port 3003
// Realtime chat events + presence + internal HTTP /broadcast endpoint
// for Next.js API routes to emit after DB writes.
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server, Socket } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, used by Caddy to forward to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ===== Presence tracking =====
// Map jamaahId → Set<"doctor" | "jamaah">
const presence = new Map<string, Set<string>>();
// Map socketId → { jamaahId, role } (for cleanup on disconnect)
const socketIndex = new Map<string, { jamaahId: string; role: string }>();

type Role = 'doctor' | 'jamaah';

function normalizeRole(r: unknown): Role {
  if (typeof r === 'string' && r.toLowerCase() === 'doctor') return 'doctor';
  return 'jamaah';
}

function getPresence(jamaahId: string): { doctor: boolean; jamaah: boolean } {
  const set = presence.get(jamaahId);
  return {
    doctor: set?.has('doctor') ?? false,
    jamaah: set?.has('jamaah') ?? false,
  };
}

function broadcastPresence(jamaahId: string) {
  io.to(`jamaah:${jamaahId}`).emit('telemedicine:presence', {
    jamaahId,
    online: getPresence(jamaahId),
  });
}

// ===== HTTP /broadcast endpoint (for Next.js API routes) =====
//
// socket.io attaches its own 'request' listener when the Server is created,
// and with path: '/' it matches every URL prefix — so we intercept BEFORE
// engine.io by removing its listeners, adding ours, and re-emitting to the
// originals only for URLs we don't claim.
const priorListeners = httpServer.listeners('request').slice();
httpServer.removeAllListeners('request');

function handleInternalHttp(req: IncomingMessage, res: ServerResponse): boolean {
  // /health — simple liveness probe
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port: 3003, rooms: io.sockets.adapter.rooms.size }));
    return true;
  }

  // POST /broadcast — internal emit bridge for Next.js API routes
  if (req.method === 'POST' && req.url === '/broadcast') {
    const internal = req.headers['x-internal'];
    if (internal !== 'telemedicine') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return true;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy(); // simple guard
    });
    req.on('end', () => {
      try {
        const { event, jamaahId, payload } = JSON.parse(body || '{}');
        if (typeof event !== 'string' || typeof jamaahId !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid payload' }));
          return;
        }
        io.to(`jamaah:${jamaahId}`).emit(event, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, event, jamaahId }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'invalid json',
          detail: e instanceof Error ? e.message : '',
        }));
      }
    });
    return true;
  }

  return false;
}

httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  if (handleInternalHttp(req, res)) return;
  // Not our route — let socket.io's engine handle it (websocket upgrade, polling, etc.)
  for (const l of priorListeners) {
    l.call(httpServer, req, res);
  }
});

// ===== Socket.io events =====
io.on('connection', (socket: Socket) => {
  console.log(`[telemedicine] connected: ${socket.id}`);

  socket.on('telemedicine:join', (data: { jamaahId?: string; role?: string }) => {
    const jamaahId = data?.jamaahId;
    if (!jamaahId) return;
    const role = normalizeRole(data?.role);
    socket.join(`jamaah:${jamaahId}`);
    socketIndex.set(socket.id, { jamaahId, role });

    let set = presence.get(jamaahId);
    if (!set) {
      set = new Set<string>();
      presence.set(jamaahId, set);
    }
    set.add(role);

    socket.emit('telemedicine:presence', {
      jamaahId,
      online: getPresence(jamaahId),
    });
    broadcastPresence(jamaahId);
    console.log(`[telemedicine] join ${socket.id} → jamaah:${jamaahId} (${role})`);
  });

  socket.on('telemedicine:leave', (data: { jamaahId?: string; role?: string }) => {
    const jamaahId = data?.jamaahId;
    if (!jamaahId) return;
    const role = normalizeRole(data?.role);
    socket.leave(`jamaah:${jamaahId}`);

    const set = presence.get(jamaahId);
    if (set) {
      // Only remove if no other socket with this role is in the room
      let otherWithRole = false;
      for (const [sid, info] of socketIndex.entries()) {
        if (sid === socket.id) continue;
        if (info.jamaahId === jamaahId && info.role === role) {
          otherWithRole = true;
          break;
        }
      }
      if (!otherWithRole) set.delete(role);
      if (set.size === 0) presence.delete(jamaahId);
    }
    socketIndex.delete(socket.id);
    broadcastPresence(jamaahId);
    console.log(`[telemedicine] leave ${socket.id} ← jamaah:${jamaahId} (${role})`);
  });

  socket.on('telemedicine:typing', (data: { jamaahId?: string; isTyping?: boolean; role?: string }) => {
    const jamaahId = data?.jamaahId;
    if (!jamaahId) return;
    socket.to(`jamaah:${jamaahId}`).emit('telemedicine:typing', {
      jamaahId,
      isTyping: Boolean(data?.isTyping),
      role: normalizeRole(data?.role),
    });
  });

  socket.on('telemedicine:presence', (data: { jamaahId?: string; role?: string }) => {
    const jamaahId = data?.jamaahId;
    if (!jamaahId) return;
    broadcastPresence(jamaahId);
  });

  socket.on('disconnect', () => {
    const info = socketIndex.get(socket.id);
    if (info) {
      const { jamaahId, role } = info;
      const set = presence.get(jamaahId);
      if (set) {
        let otherWithRole = false;
        for (const [sid, i] of socketIndex.entries()) {
          if (sid === socket.id) continue;
          if (i.jamaahId === jamaahId && i.role === role) {
            otherWithRole = true;
            break;
          }
        }
        if (!otherWithRole) set.delete(role);
        if (set.size === 0) presence.delete(jamaahId);
      }
      socketIndex.delete(socket.id);
      broadcastPresence(jamaahId);
    }
    console.log(`[telemedicine] disconnected: ${socket.id}`);
  });

  socket.on('error', (err: unknown) => {
    console.error(`[telemedicine] socket error (${socket.id}):`, err);
  });
});

const PORT = Number(process.env.PORT ?? 3003);
httpServer.listen(PORT, () => {
  console.log(`[telemedicine] socket.io server listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[telemedicine] received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log('[telemedicine] server closed');
      process.exit(0);
    });
  });
  // Force exit after 5s if graceful fails
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
