const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ---------------- PLAYER ----------------

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 25,
  color: "cyan",
  speed: 5
};

// ---------------- INPUT ----------------

const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ---------------- MOVEMENT ----------------

function movePlayer() {

  if (keys["w"] && player.y - player.radius > 0) {
    player.y -= player.speed;
  }

  if (keys["s"] && player.y + player.radius < canvas.height) {
    player.y += player.speed;
  }

  if (keys["a"] && player.x - player.radius > 0) {
    player.x -= player.speed;
  }

  if (keys["d"] && player.x + player.radius < canvas.width) {
    player.x += player.speed;
  }
}

// ---------------- DRAW PLAYER ----------------

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);

  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 20;

  ctx.fill();

  ctx.closePath();

  ctx.shadowBlur = 0;
}

// ---------------- GAME LOOP ----------------

function animate() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  movePlayer();
  drawPlayer();

  requestAnimationFrame(animate);
}

animate();