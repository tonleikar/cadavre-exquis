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
let gridSize = 2;
let turnIndex = 0;
let totalTurns = 0;
let gameComplete = false;

console.log("game.js is loaded");

const params = new URLSearchParams(window.location.search);
roomNumber = params.get("roomNumber");
gridSize = parseInt(params.get("gridSize") || "2", 10);
userId = localStorage.getItem("userId");

// Helper function to calculate grid position (row, col) from turn index
const getGridPosition = (index, size) => {
  return {
    row: Math.floor(index / size),
    col: index % size
  };
};

// Helper function to extract the correct image slice based on grid position
const extractImageSlice = (imageDataUrl, gridSize, turnIndex) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { row, col } = getGridPosition(turnIndex, gridSize);
      const sliceWidth = img.width / gridSize;
      const sliceHeight = img.height / gridSize;
      const sourceX = col * sliceWidth;
      const sourceY = row * sliceHeight;

      // Create a canvas to draw the slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sliceWidth;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sourceX, sourceY, sliceWidth, sliceHeight, 0, 0, sliceWidth, sliceHeight);

      resolve(sliceCanvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
};

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
      gameComplete = false;
      currentDrawerId = message.currentDrawerId;
      isMyTurn = userId === currentDrawerId;
      gridSize = message.gridSize || 2;
      turnIndex = 0;
      totalTurns = gridSize * gridSize;
      document.getElementById('play-again-button').style.display = 'none';
      updateGameStatus(message.currentDrawerUsername, message.previousDrawing);
      updateGridProgress();
    } else if (message.type === 'turn-update') {
      currentDrawerId = message.currentDrawerId;
      isMyTurn = userId === currentDrawerId;
      gridSize = message.gridSize || 2;
      turnIndex = message.turnIndex || 0;
      updateGameStatus(message.currentDrawerUsername, message.previousDrawing);
      updateGridProgress();
      if (isMyTurn) {
        clearCanvas();
        displayPreviousDrawing(message.previousDrawing);
      }
    } else if (message.type === 'game-complete') {
      gameComplete = true;
      updateGridProgress();
      // Show play again button instead of redirecting immediately
      document.getElementById('play-again-button').style.display = 'block';
      canvas.style.opacity = "0.5";
      canvas.style.pointerEvents = "none";
      doneButton.disabled = true;
      // Store all drawings
      localStorage.setItem('drawings', JSON.stringify(message.drawings));
      localStorage.setItem('gridSize', message.gridSize || gridSize);
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
  if (gameComplete) {
    statusMessage.textContent = `Game Complete!`;
    return;
  }
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

const updateGridProgress = () => {
  const progressContainer = document.getElementById('grid-progress');
  progressContainer.innerHTML = '';

  if (totalTurns === 0) return;

  const gridDiv = document.createElement('div');
  gridDiv.className = 'grid-progress-container';

  for (let i = 0; i < totalTurns; i++) {
    const square = document.createElement('div');
    square.className = 'grid-square';
    if (i < turnIndex) {
      square.classList.add('filled');
      square.textContent = '✓';
    } else {
      square.textContent = '';
    }
    gridDiv.appendChild(square);
  }

  progressContainer.appendChild(gridDiv);
};

const displayPreviousDrawing = (imageDataUrl) => {
  if (!imageDataUrl) {
    return;
  }

  const img = new Image();
  img.onload = () => {
    paper.imageSmoothingEnabled = false;

    // Get current grid position
    const { row: currRow, col: currCol } = getGridPosition(turnIndex, gridSize);

    // Draw left edge if not in first column
    if (currCol > 0) {
      const sourceX = img.width - 10;
      const sourceY = 0;
      const sourceW = 10;
      const sourceH = img.height;

      // Draw on left side of canvas with reduced opacity
      paper.globalAlpha = 0.3;
      paper.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, 10, canvas.height);
      paper.globalAlpha = 1;
    }

    // Draw top edge if not in first row
    if (currRow > 0) {
      const sourceX = 0;
      const sourceY = img.height - 10;
      const sourceW = img.width;
      const sourceH = 10;

      // Draw on top side of canvas with reduced opacity
      paper.globalAlpha = 0.3;
      paper.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, 10);
      paper.globalAlpha = 1;
    }
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

document.getElementById('play-again-button').addEventListener("click", () => {
  const queryParams = new URLSearchParams({ roomNumber }).toString();
  window.location.href = `gallery.html?${queryParams}`;
});
