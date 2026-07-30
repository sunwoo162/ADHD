const rooms = [
  ["slice", "Soft Slice", "말랑한 블록을 천천히 자르는 감각"],
  ["crush", "Crunch Press", "누르면 바삭하게 부서지는 타일"],
  ["peel", "Peel Film", "보호 필름을 벗기는 긴장감"],
  ["sort", "Magnetic Sort", "작은 알갱이가 착착 정렬되는 느낌"],
  ["pour", "Sand Pour", "색 모래가 조용히 쌓이는 흐름"],
  ["bubble", "Bubble Pop", "드래그로 연속해서 터지는 뽁뽁이"],
  ["jelly", "Jelly Press", "길게 누르면 찌그러지는 젤리"],
  ["water", "Water Stroke", "손끝을 따라 번지는 물결"],
  ["light", "Glow Trace", "어두운 표면에 빛을 문지르는 감각"],
  ["machine", "Calm Machine", "작은 장치가 반복해서 이어지는 장면"]
];

const palette = ["#256ef4", "#0b78cb", "#d63d4a", "#228738", "#ffb114", "#7c3aed", "#14b8a6"];
const homeView = document.querySelector("#homeView");
const playView = document.querySelector("#playView");
const roomGrid = document.querySelector("#roomGrid");
const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const counter = document.querySelector("#counter");
const roomTitle = document.querySelector("#roomTitle");
const roomKicker = document.querySelector("#roomKicker");
const roomHint = document.querySelector("#roomHint");
const modeLabel = document.querySelector("#modeLabel");
const soundBtn = document.querySelector("#soundBtn");

let activeRoom = "bubble";
let width = 0;
let height = 0;
let pointer = { x: 0, y: 0, px: 0, py: 0, down: false, speed: 0 };
let items = [];
let particles = [];
let pops = 0;
let audio = null;
let soundOn = true;
let masterGain = null;
let peelProgress = 0;

rooms.forEach(([id, name, desc]) => {
  const button = document.createElement("button");
  button.className = "room-card";
  button.type = "button";
  button.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
  button.addEventListener("click", () => openRoom(id));
  roomGrid.appendChild(button);
});

document.querySelector("#homeBtn").addEventListener("click", showHome);
document.querySelector("#resetBtn").addEventListener("click", () => initRoom(activeRoom));
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  ensureAudio();
  soundBtn.textContent = soundOn ? "ASMR 소리 켜짐" : "ASMR 소리 켜기";
  soundBtn.classList.toggle("sound-on", soundOn);
  soundBtn.classList.toggle("sound-off", !soundOn);
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) satisfyingClick(360, 0.08);
});

soundBtn.textContent = "ASMR 소리 켜짐";
soundBtn.classList.remove("sound-off");
soundBtn.classList.add("sound-on");
soundBtn.setAttribute("aria-pressed", "true");

function openRoom(id) {
  activeRoom = id;
  homeView.classList.add("hidden");
  playView.classList.remove("hidden");
  requestAnimationFrame(() => resize());
}

function showHome() {
  playView.classList.add("hidden");
  homeView.classList.remove("hidden");
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = Math.max(320, Math.floor(rect.width * devicePixelRatio));
  height = Math.max(320, Math.floor(rect.height * devicePixelRatio));
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  width = rect.width;
  height = rect.height;
  initRoom(activeRoom);
}

window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
  pointer.down = true;
  movePointer(event);
  canvas.setPointerCapture(event.pointerId);
  interact(true);
});

canvas.addEventListener("pointermove", (event) => {
  movePointer(event);
  interact(false);
});

canvas.addEventListener("pointerup", () => {
  pointer.down = false;
});

function movePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.px = pointer.x;
  pointer.py = pointer.y;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
}

function initRoom(id, keepTitle = false) {
  if (!keepTitle) {
    const room = rooms.find((entry) => entry[0] === id);
    roomKicker.textContent = room[1];
    roomTitle.textContent = room[1];
    roomHint.textContent = hintFor(id);
    modeLabel.textContent = id;
  }
  items = [];
  particles = [];
  pops = 0;
  counter.textContent = "0";

  if (id === "bubble") createBubbles();
  if (id === "sort") createBalls(520, 3);
  if (id === "pour") createSand();
  if (id === "jelly") createJellies();
  if (id === "machine") createMachine();
  if (id === "slice") createSlices();
  if (id === "crush") createCrushTiles();
  if (id === "peel") createPeelFilm();
}

function hintFor(id) {
  return {
    bubble: "누르거나 빠르게 드래그하면 POP! 100개마다 자동으로 새로 채웁니다.",
    slice: "블록 위를 천천히 가로지르면 사각 소리와 함께 조각이 갈라집니다.",
    crush: "타일을 하나씩 눌러 보세요. 짧은 바삭함과 파편이 남습니다.",
    peel: "왼쪽에서 오른쪽으로 천천히 끌면 필름이 벗겨집니다.",
    sort: "포인터 주변으로 알갱이가 착착 붙습니다. 누르면 조용히 퍼집니다.",
    pour: "누르고 있으면 색 모래가 쏟아지고 바닥에 쌓입니다.",
    water: "드래그하면 물결이 생기고 색이 번집니다.",
    paint: "드래그하면 잉크가 번지고 천천히 흐릅니다.",
    cloud: "구름을 가르듯 드래그해 보세요. 곧 다시 모입니다.",
    light: "어두운 화면 위에 빛을 그립니다.",
    jelly: "젤리를 길게 누르면 찌그러지고 다시 튀어오릅니다.",
    machine: "초기화를 누르면 장치가 다시 시작됩니다."
  }[id];
}

function createBubbles() {
  const gap = 54;
  for (let y = 130; y < height - 20; y += gap) {
    for (let x = 28; x < width - 20; x += gap) {
      items.push({ x, y, r: 20, popped: false, color: palette[Math.floor(Math.random() * palette.length)] });
    }
  }
}

function createBalls(count, radius = 6) {
  for (let i = 0; i < count; i++) {
    items.push({ x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, r: radius + Math.random() * radius, color: palette[i % palette.length] });
  }
}

function createSand() {
  for (let i = 0; i < 1200; i++) {
    items.push({ x: Math.random() * width, y: height - Math.random() * 70, vx: 0, vy: 0, r: 2, color: palette[i % palette.length] });
  }
}

function createSlices() {
  const cols = Math.max(5, Math.floor(width / 120));
  const tileW = width / cols;
  for (let i = 0; i < cols; i++) {
    items.push({
      x: i * tileW + 10,
      y: height * 0.34 + Math.sin(i * 1.4) * 20,
      w: tileW - 20,
      h: height * 0.42,
      cut: 0,
      color: palette[i % palette.length]
    });
  }
}

function createCrushTiles() {
  const size = 58;
  for (let y = 145; y < height - 50; y += size + 10) {
    for (let x = 28; x < width - size; x += size + 10) {
      items.push({ x, y, w: size, h: size, crushed: false, sink: 0, color: palette[(x + y) % palette.length] });
    }
  }
}

function createPeelFilm() {
  peelProgress = 0;
  items.push({ x: width * 0.12, y: height * 0.26, w: width * 0.76, h: height * 0.48 });
}

function createJellies() {
  for (let i = 0; i < 18; i++) {
    items.push({ x: 80 + (i % 6) * 120, y: 180 + Math.floor(i / 6) * 110, r: 38, squish: 0, color: palette[i % palette.length] });
  }
}

function createMachine() {
  createBalls(14, 12);
  items.forEach((ball, index) => {
    ball.x = 50 + index * 64;
    ball.y = 120 + Math.sin(index) * 40;
    ball.vx = index === 0 ? 4 : 0;
  });
}

function interact(isTap) {
  if (activeRoom === "bubble") {
    items.forEach((bubble) => {
      if (!bubble.popped && Math.hypot(pointer.x - bubble.x, pointer.y - bubble.y) < bubble.r + 12) popBubble(bubble);
    });
  }
  if (activeRoom === "slice" && pointer.down) {
    items.forEach((block) => {
      const insideY = pointer.y > block.y && pointer.y < block.y + block.h;
      const insideX = pointer.x > block.x && pointer.x < block.x + block.w;
      if (insideX && insideY && block.cut < 1) {
        block.cut = Math.min(1, block.cut + 0.035 + pointer.speed * 0.002);
        if (Math.random() < 0.45) softNoise("slice");
        addParticle(pointer.x, pointer.y, "slice");
      }
    });
  }
  if (activeRoom === "crush" && pointer.down) {
    items.forEach((tile) => {
      if (!tile.crushed && pointer.x > tile.x && pointer.x < tile.x + tile.w && pointer.y > tile.y && pointer.y < tile.y + tile.h) {
        tile.crushed = true;
        tile.sink = 1;
        pops += 1;
        counter.textContent = String(pops);
        softNoise("crunch");
        satisfyingClick(120 + Math.random() * 90, 0.07);
        pulse(tile.x + tile.w / 2, tile.y + tile.h / 2, tile.color);
      }
    });
  }
  if (activeRoom === "peel" && pointer.down) {
    const film = items[0];
    if (film && pointer.y > film.y - 60 && pointer.y < film.y + film.h + 60) {
      peelProgress = Math.max(peelProgress, Math.min(1, (pointer.x - film.x) / film.w));
      if (Math.random() < 0.55) softNoise("peel");
      addParticle(pointer.x, pointer.y, "peel");
    }
  }
  if (["water", "paint", "cloud", "light"].includes(activeRoom) && pointer.down) {
    const amount = activeRoom === "light" ? 4 : 10;
    for (let i = 0; i < amount; i++) addParticle(pointer.x, pointer.y, activeRoom);
  }
  if (activeRoom === "pour" && pointer.down) {
    for (let i = 0; i < 18; i++) items.push({ x: pointer.x + Math.random() * 30 - 15, y: pointer.y, vx: Math.random() * 2 - 1, vy: Math.random() * 2, r: 2, color: palette[Math.floor(Math.random() * palette.length)] });
    if (Math.random() < 0.45) softNoise("sand");
  }
  if (activeRoom === "jelly" && isTap) {
    pulse(pointer.x, pointer.y, "#256ef4");
    satisfyingClick(95, 0.12);
  }
}

function popBubble(bubble) {
  bubble.popped = true;
  pops += 1;
  counter.textContent = String(pops);
  pulse(bubble.x, bubble.y, bubble.color);
  popSound(220 + pointer.speed * 18);
  if (pops >= 100) initRoom("bubble");
}

function addParticle(x, y, type) {
  const color = type === "light" ? ["#7dd3fc", "#f0abfc", "#fef08a"][Math.floor(Math.random() * 3)] : palette[Math.floor(Math.random() * palette.length)];
  particles.push({ x, y, vx: (Math.random() - 0.5) * pointer.speed * 0.22, vy: (Math.random() - 0.5) * pointer.speed * 0.22, life: type === "light" ? 160 : 90, r: type === "cloud" ? 24 + Math.random() * 24 : 5 + Math.random() * 12, color, type });
}

function pulse(x, y, color = "#256ef4") {
  for (let i = 0; i < 18; i++) {
    particles.push({ x, y, vx: Math.cos(i) * (2 + Math.random() * 4), vy: Math.sin(i) * (2 + Math.random() * 4), life: 28, r: 3 + Math.random() * 5, color, type: "pop" });
  }
}

function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audio.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audio.destination);
  }
  if (audio.state === "suspended") audio.resume();
}

function outputNode() {
  return masterGain || audio.destination;
}

function satisfyingClick(freq, duration = 0.045) {
  if (!soundOn || !audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.35), audio.currentTime + duration);
  gain.gain.setValueAtTime(0.12, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain).connect(outputNode());
  osc.start();
  osc.stop(audio.currentTime + duration + 0.01);
}

function popSound(freq) {
  satisfyingClick(Math.min(950, freq), 0.055);
  softNoise("pop");
  if (navigator.vibrate) navigator.vibrate(8);
}

function softNoise(kind) {
  if (!soundOn || !audio) return;
  const duration = kind === "peel" ? 0.18 : kind === "slice" ? 0.1 : kind === "sand" ? 0.06 : 0.05;
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const fade = 1 - i / data.length;
    const grain = Math.random() * 2 - 1;
    const crackle = kind === "crunch" && Math.random() > 0.78 ? 1 : 0.25;
    data[i] = grain * fade * crackle * (kind === "crunch" ? 0.55 : kind === "sand" ? 0.22 : 0.18);
  }
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  filter.type = kind === "crunch" || kind === "pop" ? "bandpass" : "lowpass";
  filter.frequency.value = kind === "sand" ? 1100 : kind === "peel" ? 1700 : kind === "slice" ? 2200 : kind === "pop" ? 1200 : 3200;
  gain.gain.value = kind === "crunch" ? 0.22 : kind === "sand" ? 0.12 : kind === "peel" ? 0.1 : 0.08;
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(outputNode());
  source.start();
  if (navigator.vibrate && (kind === "crunch" || kind === "peel")) navigator.vibrate(kind === "crunch" ? 12 : 5);
}

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, width, height);
  if (activeRoom === "light") {
    ctx.fillStyle = "rgba(19,20,22,0.22)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
  } else {
    ctx.fillStyle = activeRoom === "water" ? "#e7f4fe" : activeRoom === "cloud" ? "#ecf2fe" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  if (activeRoom === "bubble") drawBubbles();
  if (activeRoom === "slice") drawSlice();
  if (activeRoom === "crush") drawCrush();
  if (activeRoom === "peel") drawPeel();
  if (activeRoom === "sort") drawMagnet();
  if (activeRoom === "pour") drawSand();
  if (activeRoom === "jelly") drawJelly();
  if (activeRoom === "machine") drawMachine();
  drawParticles();
  ctx.globalCompositeOperation = "source-over";
}

function drawBubbles() {
  items.forEach((bubble) => {
    if (bubble.popped) return;
    const gradient = ctx.createRadialGradient(bubble.x - 7, bubble.y - 8, 4, bubble.x, bubble.y, bubble.r);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, bubble.color + "88");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = bubble.color;
    ctx.stroke();
  });
}

function drawGravity() {
  items.forEach((ball) => {
    if (pointer.down) {
      const dx = pointer.x - ball.x;
      const dy = pointer.y - ball.y;
      const dist = Math.max(40, Math.hypot(dx, dy));
      ball.vx += dx / dist * 0.18;
      ball.vy += dy / dist * 0.18;
    }
    stepBall(ball, 0.18);
    circle(ball);
  });
}

function drawSlice() {
  ctx.fillStyle = "#f4f5f6";
  ctx.fillRect(0, height * 0.31, width, height * 0.5);
  items.forEach((block) => {
    const gap = block.cut * 18;
    ctx.fillStyle = block.color + "dd";
    ctx.beginPath();
    ctx.roundRect(block.x - gap, block.y, block.w / 2, block.h, 16);
    ctx.roundRect(block.x + block.w / 2 + gap, block.y, block.w / 2, block.h, 16);
    ctx.fill();
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(block.x + block.w / 2, block.y + 12);
    ctx.lineTo(block.x + block.w / 2, block.y + block.h - 12);
    ctx.stroke();
  });
}

function drawCrush() {
  items.forEach((tile) => {
    tile.sink = Math.max(0, tile.sink - 0.08);
    ctx.save();
    ctx.translate(tile.x + tile.w / 2, tile.y + tile.h / 2);
    const scale = tile.crushed ? 0.72 + tile.sink * 0.12 : 1;
    ctx.scale(scale, scale);
    ctx.fillStyle = tile.crushed ? "#cdd1d5" : tile.color + "cc";
    ctx.beginPath();
    ctx.roundRect(-tile.w / 2, -tile.h / 2, tile.w, tile.h, 8);
    ctx.fill();
    if (tile.crushed) {
      ctx.strokeStyle = "#58616a";
      ctx.beginPath();
      ctx.moveTo(-18, -14);
      ctx.lineTo(16, 12);
      ctx.moveTo(10, -18);
      ctx.lineTo(-12, 18);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawPeel() {
  const film = items[0];
  if (!film) return;
  ctx.fillStyle = "#ecf2fe";
  ctx.beginPath();
  ctx.roundRect(film.x, film.y, film.w, film.h, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.85;
  ctx.fillRect(film.x, film.y, film.w * peelProgress, film.h);
  ctx.globalAlpha = 1;
  const peelX = film.x + film.w * peelProgress;
  ctx.fillStyle = "#d8e5fdcc";
  ctx.beginPath();
  ctx.moveTo(peelX, film.y);
  ctx.quadraticCurveTo(peelX + 70, film.y + film.h * 0.16, peelX + 26, film.y + film.h * 0.42);
  ctx.lineTo(peelX, film.y + film.h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#256ef4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(peelX, film.y);
  ctx.lineTo(peelX, film.y + film.h);
  ctx.stroke();
  counter.textContent = `${Math.round(peelProgress * 100)}%`;
}

function drawMagnet() {
  items.forEach((ball) => {
    const dx = pointer.x - ball.x;
    const dy = pointer.y - ball.y;
    const dist = Math.max(24, Math.hypot(dx, dy));
    const force = pointer.down ? -1.5 : 1.1;
    if (dist < 220) {
      ball.vx += dx / dist * force;
      ball.vy += dy / dist * force;
    }
    stepBall(ball, 0);
    circle(ball, ball.color);
  });
}

function drawSand() {
  items = items.slice(-2200);
  items.forEach((grain, index) => {
    grain.vy += 0.14;
    grain.x += grain.vx;
    grain.y += grain.vy;
    if (grain.y > height - grain.r) {
      grain.y = height - grain.r;
      grain.vy *= -0.08;
      grain.vx *= 0.55;
      grain.x += Math.sin(index + Date.now() * 0.001) * 0.15;
    }
    if (grain.x < 0 || grain.x > width) grain.vx *= -0.5;
    circle(grain);
  });
  counter.textContent = String(items.length);
}

function drawJelly() {
  items.forEach((jelly) => {
    const dist = Math.hypot(pointer.x - jelly.x, pointer.y - jelly.y);
    jelly.squish += pointer.down && dist < jelly.r ? 0.18 : -0.08;
    jelly.squish = Math.max(0, Math.min(1, jelly.squish));
    ctx.save();
    ctx.translate(jelly.x, jelly.y);
    ctx.scale(1 + jelly.squish * 0.45, 1 - jelly.squish * 0.28);
    ctx.fillStyle = jelly.color + "cc";
    ctx.beginPath();
    ctx.roundRect(-jelly.r, -jelly.r, jelly.r * 2, jelly.r * 2, 18);
    ctx.fill();
    ctx.restore();
  });
}

function drawMachine() {
  ctx.strokeStyle = "#58616a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 210);
  ctx.lineTo(width - 20, 330);
  ctx.stroke();
  items.forEach((ball, index) => {
    ball.vx += 0.012 * (index + 1);
    stepBall(ball, 0.08);
    circle(ball);
    if (ball.x > width - 30) {
      ball.x = 40;
      ball.y = 110;
      pulse(width - 80, height * 0.55, palette[index % palette.length]);
    }
  });
}

function drawParticles() {
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy + (p.type === "paint" ? 0.22 : 0);
    p.vx *= 0.98;
    p.vy *= 0.98;
    ctx.globalAlpha = Math.max(0, p.life / 90);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  if (activeRoom !== "peel") {
    counter.textContent = activeRoom === "bubble" || activeRoom === "crush" ? String(pops) : String(particles.length || items.length);
  }
}

function stepBall(ball, gravity) {
  ball.vy += gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= 0.985;
  ball.vy *= 0.985;
  if (ball.x < ball.r || ball.x > width - ball.r) {
    ball.x = Math.max(ball.r, Math.min(width - ball.r, ball.x));
    ball.vx *= -0.86;
  }
  if (ball.y < ball.r || ball.y > height - ball.r) {
    ball.y = Math.max(ball.r, Math.min(height - ball.r, ball.y));
    ball.vy *= -0.84;
  }
}

function circle(item, fallback) {
  ctx.fillStyle = fallback || item.color;
  ctx.beginPath();
  ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
  ctx.fill();
}

resize();
draw();
