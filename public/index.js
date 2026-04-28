console.log("index.js is loaded");

const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code");
const joinRoomButton = document.getElementById("join-room-button");
const createRoomButton = document.getElementById("create-room-button");
const formMessage = document.getElementById("form-message");

const ensureUser = async () => {
  const name = playerNameInput.value.trim();

  if (!name) {
    formMessage.textContent = "Please enter a name";
    return null;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name })
    });
    const data = await response.json();
    localStorage.setItem('userId', data.userId);
    return data.userId;
  } catch (error) {
    console.error('Error creating user:', error);
    formMessage.textContent = "Error. Please try again.";
    return null;
  }
};

const joinRoom = async () => {
  const room = roomCodeInput.value.trim();

  if (!room) {
    formMessage.textContent = "Please enter a room code";
    return;
  }

  const userId = await ensureUser();
  if (!userId) return;

  try {
    const response = await fetch(`/api/rooms/${room}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      formMessage.textContent = "Room not found";
      return;
    }

    const queryParams = new URLSearchParams({ roomNumber: room }).toString();
    window.location.href = `lobby.html?${queryParams}`;
  } catch (error) {
    console.error('Error joining room:', error);
    formMessage.textContent = "Error joining room. Please try again.";
  }
};

const createRoom = async () => {
  const userId = await ensureUser();
  if (!userId) return;

  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await response.json();
    const queryParams = new URLSearchParams({ roomNumber: data.roomNumber }).toString();
    window.location.href = `lobby.html?${queryParams}`;
  } catch (error) {
    console.error('Error creating room:', error);
    formMessage.textContent = "Error creating room. Please try again.";
  }
};

joinRoomButton.addEventListener("click", joinRoom);
createRoomButton.addEventListener("click", createRoom);
