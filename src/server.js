import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const server = createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const wss = new WebSocketServer({ server });

const users = [];
const rooms = [];
const roomConnections = new Map(); // Map of roomNumber -> Set of WebSocket connections
const gameState = new Map(); // Map of roomNumber -> { currentDrawerIndex, drawingHistory, isStarted }

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/room', (req, res) => {
  res.sendFile(path.join(publicDir, 'room.html'));
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const userId = randomUUID();
  const user = { userId, username: username.trim() };
  users.push(user);

  res.json({ userId, username: user.username });
});


app.post('/api/rooms', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = users.find(u => u.userId === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const roomNumber = Math.random().toString(36).substring(2, 6).toUpperCase();
  const room = { roomNumber, createdBy: userId, participants: [userId] };
  rooms.push(room);

  res.json({ roomNumber });
});


app.post('/api/rooms/:roomNumber/join', (req, res) => {
  const { userId } = req.body;
  const { roomNumber } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = users.find(u => u.userId === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const room = rooms.find(r => r.roomNumber === roomNumber);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!room.participants.includes(userId)) {
    room.participants.push(userId);
  }

  res.json({ roomNumber, participants: room.participants });
});


wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentUserId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'join-room') {
        const { roomNumber, userId } = message;
        const room = rooms.find(r => r.roomNumber === roomNumber);
        const user = users.find(u => u.userId === userId);

        if (room && user) {
          currentRoom = roomNumber;
          currentUserId = userId;

          // Add connection to room
          if (!roomConnections.has(roomNumber)) {
            roomConnections.set(roomNumber, new Set());
          }
          roomConnections.get(roomNumber).add(ws);

          // Send current participants to the new connection
          ws.send(JSON.stringify({
            type: 'participants-update',
            participants: room.participants.map(uid => {
              const u = users.find(usr => usr.userId === uid);
              return { userId: uid, username: u.username };
            })
          }));

          // Broadcast player joined to all in room
          const roomClients = roomConnections.get(roomNumber);
          roomClients.forEach(client => {
            if (client.readyState === 1) { // 1 = OPEN
              client.send(JSON.stringify({
                type: 'player-joined',
                userId: userId,
                username: user.username
              }));
            }
          });
        }
      } else if (message.type === 'start-game') {
        const { roomNumber } = message;
        const room = rooms.find(r => r.roomNumber === roomNumber);

        if (room) {
          gameState.set(roomNumber, {
            currentDrawerIndex: 0,
            drawingHistory: [],
            isStarted: true
          });

          const currentDrawerId = room.participants[0];
          const currentDrawer = users.find(u => u.userId === currentDrawerId);

          const roomClients = roomConnections.get(roomNumber);
          roomClients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'game-started',
                currentDrawerId,
                currentDrawerUsername: currentDrawer.username,
                previousDrawing: null
              }));
            }
          });
        }
      } else if (message.type === 'submit-drawing') {
        const { roomNumber, userId, imageData } = message;
        const room = rooms.find(r => r.roomNumber === roomNumber);
        const state = gameState.get(roomNumber);

        if (room && state) {
          // Store drawing
          state.drawingHistory.push({ userId, imageData, roomNumber });

          // Move to next drawer
          state.currentDrawerIndex = (state.currentDrawerIndex + 1) % room.participants.length;
          const nextDrawerId = room.participants[state.currentDrawerIndex];
          const nextDrawer = users.find(u => u.userId === nextDrawerId);

          const roomClients = roomConnections.get(roomNumber);
          roomClients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'turn-update',
                currentDrawerId: nextDrawerId,
                currentDrawerUsername: nextDrawer.username,
                previousDrawing: imageData
              }));
            }
          });
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUserId) {
      const roomClients = roomConnections.get(currentRoom);
      if (roomClients) {
        roomClients.delete(ws);

        // Broadcast player left to remaining clients
        const user = users.find(u => u.userId === currentUserId);
        if (user) {
          roomClients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'player-left',
                userId: currentUserId,
                username: user.username
              }));
            }
          });
        }
      }
    }
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
