# CodeCollab - Real-time Collaborative Code Editor

A sophisticated real-time collaborative code editor featuring Monaco Editor integration, Socket.io for WebSocket communication, and Operational Transformation for conflict resolution.

## Features

- **Real-time Collaboration**: Multiple users editing simultaneously with live updates
- **Monaco Editor Integration**: Full-featured VS Code editor in browser
- **Operational Transformation**: Handles concurrent edits without conflicts
- **Syntax Highlighting**: Support for 40+ programming languages
- **Session Management**: Create and join editing sessions
- **Edit History**: Track all changes and modifications
- **Cursor Tracking**: See other users' cursor positions
- **Performance Metrics**: Measure latency, bandwidth, and transformation time

## Quick Start

### Prerequisites

- Node.js 16+
- Two browser windows/tabs for testing

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   npm start
   ```

Server runs on `http://localhost:5002`

## Development

For development with hot-reload:
```bash
npm run dev
```

## Testing

To test real-time collaboration:

1. Open `http://localhost:5002` in two browser windows
2. Click "Create Session" in first window, copy the session ID
3. In second window, click "Join Session" and paste the session ID
4. Type in either window - see changes appear instantly in the other
5. Check browser DevTools Console for operation logs

## How Operational Transformation Works

1. **Client submits operation** (e.g., insert "hello" at position 5)
2. **Server validates** against edit history
3. **Server transforms operation** against concurrent edits
4. **Server broadcasts** transformed operation to all clients
5. **Clients apply operation** in correct order

### Example Transformation Scenario

```
Initial state: "code"
User A inserts "hello " at position 0
User B inserts "world" at position 4

Without OT: Would result in "helloworld code" or "codeworld hello" (conflict)
With OT: Correctly produces "hello code world" (both operations applied)
```

## Performance Metrics

### Baseline Measurements (Record these)

- Message latency: ~0-50ms (local)
- Bandwidth per operation: ~50-100 bytes
- Transformation time: ~2-5ms per operation
- Concurrent users supported: 20-50 on standard server

### Improvements to Track

- Compression: Reduce bandwidth 30-50%
- Batching: Group operations to reduce messages
- Selective sync: Only send visible range to reduce transforms

## API/Events

### WebSocket Events

**Server → Client:**
- `document:init` - Send initial document state
- `operation:apply` - Apply new operation
- `cursor:update` - Update user cursor position
- `user:joined` - New user joined session
- `user:left` - User left session

**Client → Server:**
- `operation:submit` - Submit new operation
- `cursor:move` - Broadcast cursor position
- `session:create` - Create new session
- `session:join` - Join existing session

## Deployment

Deploy to any Node.js hosting (Heroku, Railway, Render). For production:

1. Enable CORS restrictions
2. Implement user authentication
3. Add persistent storage (MongoDB/PostgreSQL)
4. Use Redis for horizontal scaling
5. Implement operation compression

## Architecture Notes

The system uses a **central authority model** where:
- Server maintains single source of truth
- All operations go through server
- Operational Transformation resolves conflicts
- Clients apply operations in consistent order

This ensures consistency but means network latency affects responsiveness.

## License

MIT
