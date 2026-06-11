import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

const port = process.env.PORT || 5002;

// Serve static files
app.use(express.static('public'));

// Session management
const sessions = new Map();
const userCursors = new Map();

// Operation class for Operational Transformation
class Operation {
  constructor(type, position, content = '', timestamp = Date.now(), userId = '') {
    this.type = type; // 'insert' or 'delete'
    this.position = position;
    this.content = content;
    this.timestamp = timestamp;
    this.userId = userId;
  }
}

// Transform two concurrent operations
function transform(op1, op2) {
  if (op1.timestamp > op2.timestamp) return transform(op2, op1);

  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op1.position < op2.position) {
      op2.position += op1.content.length;
    } else if (op1.position === op2.position && op1.userId > op2.userId) {
      op2.position += op1.content.length;
    }
  } else if (op1.type === 'insert' && op2.type === 'delete') {
    if (op1.position < op2.position) {
      op2.position += op1.content.length;
    }
  } else if (op1.type === 'delete' && op2.type === 'insert') {
    if (op1.position <= op2.position) {
      op2.position -= op1.content.length;
    }
  } else if (op1.type === 'delete' && op2.type === 'delete') {
    if (op1.position < op2.position) {
      op2.position -= op1.content.length;
    } else if (op1.position === op2.position) {
      op2.content = '';
    }
  }

  return op2;
}

// Create session
function createSession() {
  const sessionId = uuidv4().slice(0, 8);
  sessions.set(sessionId, {
    id: sessionId,
    document: '',
    operations: [],
    users: new Map(),
    createdAt: Date.now()
  });
  return sessionId;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('session:create', (callback) => {
    const sessionId = createSession();
    socket.join(sessionId);
    socket.sessionId = sessionId;

    const session = sessions.get(sessionId);
    session.users.set(socket.id, { id: socket.id, color: randomColor() });

    callback({ sessionId, document: session.document });
    console.log(`Session created: ${sessionId}`);
  });

  socket.on('session:join', (sessionId, callback) => {
    if (!sessions.has(sessionId)) {
      callback({ error: 'Session not found' });
      return;
    }

    socket.join(sessionId);
    socket.sessionId = sessionId;

    const session = sessions.get(sessionId);
    session.users.set(socket.id, { id: socket.id, color: randomColor() });

    // Send current document state to new user
    callback({ document: session.document, operations: session.operations });

    // Notify others
    socket.to(sessionId).emit('user:joined', {
      userId: socket.id,
      userCount: session.users.size
    });

    console.log(`User joined session: ${sessionId} (${session.users.size} users)`);
  });

  socket.on('operation:submit', (data, callback) => {
    if (!socket.sessionId) return;

    const session = sessions.get(socket.sessionId);
    if (!session) return;

    const startTime = Date.now();
    const newOp = new Operation(
      data.type,
      data.position,
      data.content,
      data.timestamp,
      socket.id
    );

    // Transform against all previous operations
    let transformedOp = JSON.parse(JSON.stringify(newOp));
    for (const prevOp of session.operations) {
      transformedOp = transform(prevOp, transformedOp);
    }

    // Apply to document
    if (transformedOp.type === 'insert') {
      session.document = 
        session.document.slice(0, transformedOp.position) +
        transformedOp.content +
        session.document.slice(transformedOp.position);
    } else if (transformedOp.type === 'delete') {
      session.document = 
        session.document.slice(0, transformedOp.position) +
        session.document.slice(transformedOp.position + transformedOp.content.length);
    }

    // Store operation
    session.operations.push(transformedOp);

    // Limit history
    if (session.operations.length > parseInt(process.env.HISTORY_LIMIT) || 100) {
      session.operations = session.operations.slice(-100);
    }

    const transformTime = Date.now() - startTime;

    // Broadcast to others
    socket.to(socket.sessionId).emit('operation:apply', {
      operation: transformedOp,
      transformTime,
      docLength: session.document.length
    });

    callback({
      success: true,
      transformTime,
      docLength: session.document.length
    });

    console.log(`Operation applied (${transformTime}ms): ${transformedOp.type} at ${transformedOp.position}`);
  });

  socket.on('cursor:move', (position) => {
    if (!socket.sessionId) return;
    userCursors.set(socket.id, position);
    socket.to(socket.sessionId).emit('cursor:update', {
      userId: socket.id,
      position
    });
  });

  socket.on('disconnect', () => {
    if (socket.sessionId) {
      const session = sessions.get(socket.sessionId);
      if (session) {
        session.users.delete(socket.id);
        io.to(socket.sessionId).emit('user:left', {
          userId: socket.id,
          userCount: session.users.size
        });

        // Clean up empty sessions after 1 hour
        if (session.users.size === 0) {
          setTimeout(() => {
            if (session.users.size === 0) {
              sessions.delete(socket.sessionId);
              console.log(`Session deleted: ${socket.sessionId}`);
            }
          }, 3600000);
        }
      }
    }
    userCursors.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });

  // Health check
  socket.on('ping', (callback) => {
    callback({ pong: true, timestamp: Date.now() });
  });
});

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    activeUsers: io.engine.clientsCount,
    timestamp: Date.now()
  });
});

app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(s => ({
    id: s.id,
    users: s.users.size,
    docLength: s.document.length,
    operationCount: s.operations.length,
    createdAt: new Date(s.createdAt).toISOString()
  }));
  res.json(sessionList);
});

// Start server
server.listen(port, () => {
  console.log(`CodeCollab server running on http://localhost:${port}`);
  console.log('Open two browser windows to test real-time collaboration');
});

function randomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  return colors[Math.floor(Math.random() * colors.length)];
}
