console.log("lobby.js is loaded");

const lobbyForm = document.getElementById("lobby-form");
const nameInput = document.getElementById("name-input");
const roomInput = document.getElementById("room-input");

lobbyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const room = roomInput.value.trim();
  const queryParams = new URLSearchParams({ name, room }).toString();
  window.location.href = `room.html?${queryParams}`;
});
