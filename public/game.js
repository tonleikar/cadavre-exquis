const canvas = document.getElementById("drawing");
const paper = canvas.getContext("2d");
const tools = document.querySelectorAll('input[name="tool"]');
const colorBackground = "#F0F8FF";
const colorLine = "#9ACD32";
const penTool = {color: colorLine, width: 5};
const eraserTool = {color: colorBackground, width: 20};


let pressedMouse = false;
let x = 0;
let y = 0;
let currentTool = penTool;


console.log("game.js is loaded");

const drawingLine = (tool, xStart, yStart, xEnd, yEnd, board) => {
	board.beginPath();
	board.strokeStyle = tool.color;
	board.lineWidth = tool.width;
	board.lineCap = "round";
	board.lineJoin = "round";
	board.moveTo(xStart, yStart);
	board.lineTo(xEnd, yEnd);
	board.stroke();
	board.closePath();
};

const getCanvasPoint = ({ clientX, clientY }) => {
	const { left, top } = canvas.getBoundingClientRect();
	return {
		xPoint: clientX - left,
		yPoint: clientY - top
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

const clearCanvas = ({ code }) => {
	if (code === "KeyC") {
		paper.clearRect(0, 0, canvas.width, canvas.height);
	}
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

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawLine);
window.addEventListener("mouseup", stopDrawing);
document.addEventListener("keydown", clearCanvas);
