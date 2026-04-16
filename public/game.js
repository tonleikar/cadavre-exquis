const canvas = document.getElementById("drawing");
const paper = canvas.getContext("2d");
const tools = document.querySelectorAll('input[name="tool"]');
const clearButton = document.getElementById("clear-button");
const colorBackground = "#F0F8FF";
const colorLine = "#222222";
const penTool = {color: colorLine, width: 1};
const eraserTool = {color: colorBackground, width: 10};
const doneButton = document.getElementById("done-button");


let pressedMouse = false;
let x = 0;
let y = 0;
let currentTool = penTool;


console.log("game.js is loaded");

const prepareCanvas = () => {
  paper.imageSmoothingEnabled = false;
  paper.fillStyle = colorBackground;
  paper.fillRect(0, 0, canvas.width, canvas.height);
}

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
	const { xPoint, yPoint } = getCanvasPoint(event);
	pressedMouse = true;
	x = xPoint;
	y = yPoint;
	drawingLine(currentTool, x, y, x, y, paper);
};

const drawLine = (event) => {
	if (!pressedMouse) return;
	const { xPoint: xMouse, yPoint: yMouse } = getCanvasPoint(event);
	drawingLine(currentTool, x, y, xMouse, yMouse, paper);
	x = xMouse;
	y = yMouse;
};

const stopDrawing = () => {
	pressedMouse = false;
};

const saveCanvas = () => {
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "drawing.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const clearCanvas = () => {
  paper.clearRect(0, 0, canvas.width, canvas.height);
  prepareCanvas();
}

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


canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawLine);
window.addEventListener("mouseup", stopDrawing);
doneButton.addEventListener("click", saveCanvas);
clearButton.addEventListener("click", clearCanvas);
