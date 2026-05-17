const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ---------------- COLORS ----------------

const COLORS = {
  backgroundTop: "#070716",
  backgroundMiddle: "#2a0a4f",
  backgroundBottom: "#001a22",

  player: "#00f6ff",

  normalCreep: "#ff2e88",
  fastCreep: "#00e5ff",
  tankCreep: "#9b4dff",

  uiGlow: "#00f6ff",
  uiPanel: "rgba(8, 10, 20, 0.6)",
  text: "#e8f7ff",
};

// ---------------- GAME STATE ----------------

let gameStarted = false;
let gameOver = false;

let score = 0;
let displayedScore = 0;
let lastScoreTime = 0;

let highScore = localStorage.getItem("highScore") || 0;

let creepSpeed = 2;
let spawnRate = 1000;

let shakeIntensity = 0;

// ---------------- PLAYER ----------------

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 25,

  color: COLORS.player,

  speed: 5,
  dashSpeed: 14,

  isDashing: false,
  dashDuration: 150,
  dashCooldown: 1000,
  canDash: true,

  dashEnergy: 1,
  dashDrain: 0.35,
  dashRegen: 0.002,
};

// ---------------- TOUCH TRACKING VARIABLES ----------------

let touchX = null;
let touchY = null;
let isTouching = false;
let lastTap = 0;
let isMobileUser = false; // Automatically flags true if they use a touch gesture

// ---------------- INPUT LISTENERS (KEYBOARD & TOUCH) ----------------

const keys = {};

// Keyboard Listeners
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  isMobileUser = false; // User is on a keyboard

  if (!gameStarted && e.key === "Enter") {
    gameStarted = true;
    lastScoreTime = performance.now();
  }

  if (gameOver && e.key.toLowerCase() === "r") {
    restartGame();
  }

  if (e.key === " " && player.canDash && gameStarted && !gameOver) {
    dash();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Mobile Touch Listeners
window.addEventListener("touchstart", (e) => {
  isTouching = true;
  isMobileUser = true; // Flag user as playing on mobile layout
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;

  // Touch triggers for Start and Restart Screens
  if (!gameStarted) {
    gameStarted = true;
    lastScoreTime = performance.now();
  }
  if (gameOver) {
    restartGame();
  }

  // Handle Double-Tap to Dash
  const currentTime = performance.now();
  const tapLength = currentTime - lastTap;
  if (tapLength < 300 && tapLength > 0) {
    if (player.canDash && gameStarted && !gameOver) {
      dash();
    }
  }
  lastTap = currentTime;
});

window.addEventListener("touchmove", (e) => {
  if (!gameStarted || gameOver) return;
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
});

window.addEventListener("touchend", () => {
  isTouching = false;
});

// ---------------- DASH LOGIC ----------------

function dash() {
  if (player.dashEnergy < player.dashDrain) return;

  player.isDashing = true;
  player.canDash = false;
  player.dashEnergy -= player.dashDrain;

  setTimeout(() => (player.isDashing = false), player.dashDuration);
  setTimeout(() => (player.canDash = true), player.dashCooldown);
}

// ---------------- BACKGROUND ----------------

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

  gradient.addColorStop(0, COLORS.backgroundTop);
  gradient.addColorStop(0.5, COLORS.backgroundMiddle);
  gradient.addColorStop(1, COLORS.backgroundBottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---------------- HOLOGRAM PANEL ----------------

function drawHologramPanel(x, y, w, h, color) {
  const t = Date.now();

  ctx.fillStyle = "rgba(10, 14, 30, 0.35)";
  ctx.fillRect(x, y, w, h);

  ctx.shadowColor = color;
  ctx.shadowBlur = 15 + Math.sin(t * 0.005) * 5;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.shadowBlur = 0;
}

// ---------------- DASH RING ----------------

function drawDashEnergyRing() {
  if (!gameStarted) return;

  const x = player.x;
  const y = player.y;
  const r = player.radius + 18;

  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * player.dashEnergy;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r, start, end);

  ctx.strokeStyle =
    player.dashEnergy > player.dashDrain
      ? COLORS.uiGlow
      : COLORS.normalCreep;

  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 15;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.shadowBlur = 0;
}

// ---------------- PARTICLES ----------------

const particles = [];

function createParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x,
      y,
      radius: Math.random() * 2 + 1,
      color,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      alpha: 1,
    });
  }
}

function drawParticles() {
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.04;

    if (p.alpha <= 0) particles.splice(i, 1);

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  });
}

// ---------------- CREEPS ----------------

const creeps = [];

function spawnCreep() {
  if (!gameStarted || gameOver) return;

  let x, y;
  const side = Math.floor(Math.random() * 4);

  if (side === 0) { x = 0; y = Math.random() * canvas.height; }
  else if (side === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  else if (side === 2) { x = Math.random() * canvas.width; y = 0; }
  else { x = Math.random() * canvas.width; y = canvas.height; }

  const r = Math.random();

  let creep;

  if (r < 0.6) {
    creep = { x, y, radius: 20, color: COLORS.normalCreep, speed: creepSpeed };
  } else if (r < 0.85) {
    creep = { x, y, radius: 12, color: COLORS.fastCreep, speed: creepSpeed + 2 };
  } else {
    creep = { x, y, radius: 35, color: COLORS.tankCreep, speed: creepSpeed - 0.7 };
  }

  creeps.push(creep);
}

let spawnInterval = setInterval(spawnCreep, spawnRate);

// ---------------- MOVEMENT ----------------

function movePlayer() {
  if (!gameStarted || gameOver) return;

  const speed = player.isDashing ? player.dashSpeed : player.speed;

  // Handle Touch Engine Interpolation
  if (isTouching && touchX !== null && touchY !== null) {
    const dx = touchX - player.x;
    const dy = touchY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      player.x += (dx / distance) * speed;
      player.y += (dy / distance) * speed;
    }
  } 
  // Fallback Keyboard Handler
  else {
    if (keys["w"]) player.y -= speed;
    if (keys["s"]) player.y += speed;
    if (keys["a"]) player.x -= speed;
    if (keys["d"]) player.x += speed;
  }

  // Prevent moving outside screen boundaries
  if (player.x - player.radius < 0) player.x = player.radius;
  if (player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;
  if (player.y - player.radius < 0) player.y = player.radius;
  if (player.y + player.radius > canvas.height) player.y = canvas.height - player.radius;
}

// ---------------- PLAYER DRAW ----------------

function drawPlayer() {
  if (!gameStarted) return;

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);

  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = player.isDashing ? 45 : 25;

  ctx.fill();
  ctx.shadowBlur = 0;
}

// ---------------- CREEPS DRAW ----------------

function drawCreeps() {
  creeps.forEach((c) => {
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    c.x += (dx / dist) * c.speed;
    c.y += (dy / dist) * c.speed;

    if (dist < player.radius + c.radius && !player.isDashing) {
      createParticles(player.x, player.y, player.color);
      shakeIntensity = 3;
      gameOver = true;

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
      }
    }

    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// ---------------- UI SCORE ----------------

function drawScore() {
  if (!gameStarted) return;

  displayedScore += (score - displayedScore) * 0.08;

  drawHologramPanel(20, 20, 280, 140, COLORS.uiGlow);

  ctx.save();
  ctx.fillStyle = COLORS.text;
  ctx.font = "18px monospace";
  ctx.textAlign = "left";

  ctx.shadowColor = COLORS.uiGlow;
  ctx.shadowBlur = 10;

  ctx.fillText("NEURAL SCORE", 40, 55);

  ctx.font = "28px monospace";
  ctx.fillText(Math.floor(displayedScore), 40, 90);

  ctx.font = "16px monospace";
  ctx.fillText("HIGH:", 40, 115);
  ctx.fillText(highScore, 95, 115);

  ctx.fillStyle = player.canDash ? COLORS.uiGlow : COLORS.normalCreep;
  ctx.fillText(player.canDash ? "DASH READY" : "COOLDOWN", 40, 135);

  ctx.restore();
}

// ---------------- START SCREEN ----------------

function drawStartScreen() {
  if (gameStarted) return;

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.font = "80px monospace";

  ctx.fillStyle = COLORS.uiGlow;
  ctx.shadowColor = COLORS.uiGlow;
  ctx.shadowBlur = 30;

  ctx.fillText("DODGE", canvas.width / 2, canvas.height / 2 - 50);

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.text;

  // Change action message depending on screen format dynamically
  if (isMobileUser) {
    ctx.font = "24px monospace";
    ctx.fillText("TAP SCREEN TO BOOT", canvas.width / 2, canvas.height / 2 + 120);
    ctx.font = "16px monospace";
    ctx.fillText("Drag to move | Double-tap to dash", canvas.width / 2, canvas.height / 2 + 160);
  } else {
    ctx.font = "28px monospace";
    ctx.fillText("PRESS ENTER TO BOOT", canvas.width / 2, canvas.height / 2 + 120);
    ctx.font = "16px monospace";
    ctx.fillText("WASD to move | Space to dash", canvas.width / 2, canvas.height / 2 + 160);
  }
}

// ---------------- GAME OVER ----------------

function drawGameOver() {
  if (!gameOver) return;

  ctx.textAlign = "center";
  ctx.font = "60px monospace";

  ctx.shadowColor = COLORS.normalCreep;
  ctx.shadowBlur = 25;

  ctx.fillStyle = COLORS.normalCreep;
  ctx.fillText("SYSTEM FAIL", canvas.width / 2, canvas.height / 2);

  ctx.shadowBlur = 0;
  ctx.font = "20px monospace";
  ctx.fillStyle = COLORS.text;

  if (isMobileUser) {
    ctx.fillText("TAP SCREEN TO REBOOT", canvas.width / 2, canvas.height / 2 + 50);
  } else {
    ctx.fillText("PRESS R TO REBOOT", canvas.width / 2, canvas.height / 2 + 50);
  }
}

// ---------------- RESTART ----------------

function restartGame() {
  gameOver = false;
  score = 0;
  displayedScore = 0;
  lastScoreTime = performance.now();

  creeps.length = 0;
  particles.length = 0;

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;

  player.dashEnergy = 1;
  player.canDash = true;
}

// ---------------- LOOP ----------------

function animate() {
  requestAnimationFrame(animate);

  if (gameStarted && !gameOver) {
    const now = performance.now();

    if (now - lastScoreTime >= 1000) {
      score += 1;
      lastScoreTime = now;
    }
  }

  player.dashEnergy = Math.min(1, player.dashEnergy + player.dashRegen);

  ctx.save();

  drawBackground();

  movePlayer();
  drawPlayer();
  drawDashEnergyRing();
  drawCreeps();
  drawParticles();
  drawScore();
  drawStartScreen();
  drawGameOver();

  ctx.restore();
}

animate();