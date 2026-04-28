console.log("gallery.js is loaded");

const roomNumberSpan = document.getElementById("room-number");
const finalImageCanvas = document.getElementById("final-image");
const downloadButton = document.getElementById("download-button");

const params = new URLSearchParams(window.location.search);
const roomNumber = params.get("roomNumber");
const drawingsJson = localStorage.getItem("drawings");
const gridSizeStr = localStorage.getItem("gridSize");
const gridSize = gridSizeStr ? parseInt(gridSizeStr, 10) : 2;

if (roomNumber) {
  roomNumberSpan.textContent = roomNumber;
}

if (drawingsJson) {
  const drawings = JSON.parse(drawingsJson);
  const images = [];
  let loadedCount = 0;

  // Load all drawing images
  drawings.forEach((dataUrl, index) => {
    const img = new Image();
    img.onload = () => {
      images[index] = img;
      loadedCount++;

      // When all images are loaded, stitch them together
      if (loadedCount === drawings.length) {
        stitchImages(images);
      }
    };
    img.src = dataUrl;
  });

  const stitchImages = (images) => {
    if (images.length === 0) return;

    // Calculate canvas dimensions based on grid size
    const cellWidth = images[0].width;
    const cellHeight = images[0].height;
    const width = cellWidth * gridSize;
    const height = cellHeight * gridSize;

    finalImageCanvas.width = width;
    finalImageCanvas.height = height;

    const ctx = finalImageCanvas.getContext("2d");
    ctx.fillStyle = "#F0F8FF";
    ctx.fillRect(0, 0, width, height);

    // Draw each image in grid position
    images.forEach((img, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const x = col * cellWidth;
      const y = row * cellHeight;
      ctx.drawImage(img, x, y);
    });
  };
}

downloadButton.addEventListener("click", () => {
  if (finalImageCanvas.width > 0) {
    const link = document.createElement("a");
    link.href = finalImageCanvas.toDataURL("image/png");
    link.download = `cadavre-exquis-${roomNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
