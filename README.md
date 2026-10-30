# Real-Time Chat

A real-time chat application built on raw WebSockets to understand the
parts a library like Socket.IO usually hides: the connection lifecycle,
heartbeats, dead-client detection, reconnection and delivery guarantees.

I built it to answer specific questions. What happens when a connection
drops mid-conversation? Who closes first, and with which close code?
How do you tell a dead client from a slow one? How do you deliver a
message that was sent while the user was offline, exactly once, when
the server may or may not have received it the first time?

## Stack

- Server: Node.js, TypeScript, Express, raw `ws` (no Socket.IO)
- Client: React, TypeScript, Vite
- Storage: MongoDB by default via Docker, or any running instance
  through `MONGO_URI`, or in-memory when no database is configured

## What it does

- Rooms with join, broadcast and presence
- Server heartbeat (ping/pong every 15 seconds) that terminates
  connections that stop answering, so dead clients cannot linger
- Graceful shutdown: every client is closed with a 1001 going-away
  code before the server exits
- Client reconnection with exponential backoff (1s to 30s, reset on a
  successful rejoin)
- Offline send queue: messages written while disconnected are held on
  the client and flushed in order after rejoining
- Exactly-once delivery on resend: every message carries a
  client-generated id; the server keeps the most recent ids per room
  and drops any resend it has already accepted, so a message that got
  through just before a disconnect is never delivered twice
- Delivery confirmation without an ack protocol: the sender receives
  their own message back, so the echo (or the history replay after a
  rejoin) confirms delivery; until then the message shows as pending
- History on join and rejoin, merged by id on the client so replays
  never duplicate

## Running it

Server:

```bash
cd server
npm install
npm run dev
```

With MongoDB (recommended, history survives restarts):

```bash
docker compose up -d
cp .env.example .env   # from the server directory
npm run dev
```

With any running MongoDB instance, set `MONGO_URI` to its connection
string. With nothing set, the server runs on in-memory storage and
needs no database at all.

Client:

```bash
cd client
npm install
npm run dev
```

## Tests

```bash
cd server
npm test
```

Unit tests cover rooms, storage and the resend dedupe. The integration
test spawns the real server and drives it with WebSocket clients:
joining, duplicate names, message delivery, resend dedupe and history
replay.

## Design decisions

**Raw `ws` instead of Socket.IO.** Socket.IO gives reconnection,
heartbeats and rooms for free, which is exactly why it was not used.
The point of this project was to build and understand those mechanics;
using a library that hides them would defeat the purpose.

**Idempotency keys instead of acks.** Acks confirm receipt but do not
survive a disconnect between delivery and acknowledgement. Client
generated message ids make resends safe: the server can accept the
same message twice and store it once, which turns an at-least-once
retry loop into effectively-once delivery without distributed
coordination.

**Delivery confirmation by echo.** The room broadcast includes the
sender, so the sender seeing their own id come back is proof the
server accepted and redistributed the message. That is enough to clear
the pending state on the client without adding a dedicated
acknowledgement message type.

**Storage behind one interface.** In-memory, local Docker MongoDB and
any hosted instance are interchangeable behind `StorageInterface`, so
the transport layer never touches database code.

## Repository layout

```
server/   Express + ws server, storage, tests
client/   React chat client
```
