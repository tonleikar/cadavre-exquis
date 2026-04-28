console.log("lobby.js is loaded");

const roomNumberSpan = document.getElementById("room-number");
const readyButton = document.getElementById("join-room-button");
const startGameButton = document.getElementById("start-game-button");
const participantsList = document.getElementById("participants-list");
const gridSizeSelect = document.getElementById("grid-size");

const params = new URLSearchParams(window.location.search);
const roomNumber = params.get("roomNumber");
const userId = localStorage.getItem("userId");

let ws = null;
let participants = [];

const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.addEventListener('open', () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({
      type: 'join-room',
      roomNumber,
      userId
    }));
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'participants-update') {
      participants = message.participants;
      updateParticipantsList();
    } else if (message.type === 'player-joined') {
      if (!participants.find(p => p.userId === message.userId)) {
        participants.push({ userId: message.userId, username: message.username });
        updateParticipantsList();
      }
    } else if (message.type === 'player-left') {
      participants = participants.filter(p => p.userId !== message.userId);
      updateParticipantsList();
    }
  });

  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket closed');
  });
};

const updateParticipantsList = () => {
  if (participants.length === 0) {
    participantsList.innerHTML = '<p>Waiting for players...</p>';
  } else {
    const playerNames = participants.map(p => p.username).join(', ');
    participantsList.innerHTML = `<p><strong>Players:</strong> ${playerNames}</p>`;
  }
};

const startGame = () => {
  if (ws && ws.readyState === 1) {
    const gridSize = parseInt(gridSizeSelect.value, 10);
    ws.send(JSON.stringify({
      type: 'start-game',
      roomNumber,
      gridSize
    }));
    // Redirect to game room
    const queryParams = new URLSearchParams({ roomNumber, gridSize }).toString();
    window.location.href = `room.html?${queryParams}`;
  }
};

if (roomNumber) {
  roomNumberSpan.textContent = roomNumber;
  connectWebSocket();
}

if (readyButton) {
  readyButton.addEventListener("click", () => {
    if (ws) {
      ws.close();
    }
    const room = roomNumberSpan.textContent.trim();
    const queryParams = new URLSearchParams({ roomNumber: room }).toString();
    window.location.href = `room.html?${queryParams}`;
  });
}

if (startGameButton) {
  startGameButton.addEventListener("click", startGame);
}
