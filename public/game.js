const canvas = document.getElementById("drawing");
const paper = canvas.getContext("2d");
const previewCanvas = document.getElementById("preview-canvas");
const previewPaper = previewCanvas.getContext("2d");
const tools = document.querySelectorAll('input[name="tool"]');
const clearButton = document.getElementById("clear-button");
const doneButton = document.getElementById("done-button");
const statusMessage = document.getElementById("status-message");
const currentDrawerEl = document.getElementById("current-drawer");
const previewContainer = document.getElementById("previous-drawing-preview");

const colorBackground = "#F0F8FF";
const colorLine = "#222222";
const penTool = { color: colorLine, width: 1 };
const eraserTool = { color: colorBackground, width: 5 };

let pressedMouse = false;
let x = 0;
let y = 0;
let currentTool = penTool;
let currentDrawerId = null;
let userId = null;
let roomNumber = null;
let ws = null;
let isMyTurn = false;

console.log("game.js is loaded");

const params = new URLSearchParams(window.location.search);
roomNumber = params.get("roomNumber");
userId = localStorage.getItem("userId");

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

    if (message.type === 'game-started') {
      currentDrawerId = message.currentDrawerId;
      isMyTurn = userId === currentDrawerId;
      updateGameStatus(message.currentDrawerUsername, message.previousDrawing);
    } else if (message.type === 'turn-update') {
      currentDrawerId = message.currentDrawerId;
      isMyTurn = userId === currentDrawerId;
      updateGameStatus(message.currentDrawerUsername, message.previousDrawing);
      if (isMyTurn) {
        clearCanvas();
        displayPreviousDrawing(message.previousDrawing);
      }
    }
  });

  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket closed');
  });
};

const updateGameStatus = (drawerUsername, previousDrawing) => {
  if (isMyTurn) {
    statusMessage.textContent = `Your turn to draw!`;
    canvas.style.opacity = "1";
    canvas.style.pointerEvents = "auto";
    doneButton.disabled = false;
  } else {
    statusMessage.textContent = `Wait for your turn`;
    canvas.style.opacity = "0.5";
    canvas.style.pointerEvents = "none";
    doneButton.disabled = true;
  }
  currentDrawerEl.textContent = `${drawerUsername} is drawing`;
};

const displayPreviousDrawing = (imageDataUrl) => {
  if (!imageDataUrl) {
    previewContainer.style.display = "none";
    return;
  }

  previewContainer.style.display = "block";
  const img = new Image();
  img.onload = () => {
    previewPaper.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    // Draw only the top 10 pixels
    previewPaper.drawImage(img, 0, 0, img.width, 10, 0, 0, previewCanvas.width, previewCanvas.height);
  };
  img.src = imageDataUrl;
};

const prepareCanvas = () => {
  paper.imageSmoothingEnabled = false;
  paper.fillStyle = colorBackground;
  paper.fillRect(0, 0, canvas.width, canvas.height);
};

const drawingLine = (tool, xStart, yStart, xEnd, yEnd, board) => {
  const size = Math.max(1, Math.round(tool.width));
  const half = Math.floor(size / 2);
  const x0 = Math.round(xStart);
  const y0 = Math.round(yStart);
  const x1 = Math.round(xEnd);
  const y1 = Math.round(yEnd);

  let xPos = x0;
  let yPos = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  board.fillStyle = tool.color;

  while (true) {
    board.fillRect(xPos - half, yPos - half, size, size);
    if (xPos === x1 && yPos === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      xPos += sx;
    }
    if (e2 < dx) {
      err += dx;
      yPos += sy;
    }
  }
};

const getCanvasPoint = ({ clientX, clientY }) => {
  const { left, top, width, height } = canvas.getBoundingClientRect();
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  return {
    xPoint: (clientX - left) * scaleX,
    yPoint: (clientY - top) * scaleY
  };
};

const startDrawing = (event) => {
  if (!isMyTurn) return;
  const { xPoint, yPoint } = getCanvasPoint(event);
  pressedMouse = true;
  x = xPoint;
  y = yPoint;
  drawingLine(currentTool, x, y, x, y, paper);
};

const drawLine = (event) => {
  if (!pressedMouse || !isMyTurn) return;
  const { xPoint: xMouse, yPoint: yMouse } = getCanvasPoint(event);
  drawingLine(currentTool, x, y, xMouse, yMouse, paper);
  x = xMouse;
  y = yMouse;
};

const stopDrawing = () => {
  pressedMouse = false;
};

const submitDrawing = () => {
  if (!isMyTurn || !ws) return;

  const imageData = canvas.toDataURL("image/png");
  ws.send(JSON.stringify({
    type: 'submit-drawing',
    roomNumber,
    userId,
    imageData
  }));
};

const clearCanvas = () => {
  paper.clearRect(0, 0, canvas.width, canvas.height);
  prepareCanvas();
};

tools.forEach(tool => {
  tool.addEventListener("change", () => {
    if (tool.value === 'eraser') {
      currentTool = eraserTool;
      canvas.setAttribute("data-tool", "eraser");
    } else {
      currentTool = penTool;
      canvas.setAttribute("data-tool", "pen");
    }
  });
});

prepareCanvas();
connectWebSocket();

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawLine);
window.addEventListener("mouseup", stopDrawing);
doneButton.addEventListener("click", submitDrawing);
clearButton.addEventListener("click", clearCanvas);
