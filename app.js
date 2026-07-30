const rooms = [
  ["keyboard", "Keyboard Clicker", "기계식 키보드를 누르는 또각또각 ASMR"],
  ["popball", "Pop Bubble Ball", "말랑한 공의 돌기를 하나씩 눌러 넣는 체험"],
  ["wrap", "Bubble Wrap Sheet", "드래그하면 연속으로 터지는 뽁뽁이"],
  ["switches", "Switch Panel", "토글 스위치를 딸깍딸깍 넘기는 패널"],
  ["slime", "Slime Ball", "눌렀다 놓으면 되돌아오는 말랑볼"],
  ["beads", "Magnetic Beads", "작은 구슬이 자석처럼 착착 모이는 느낌"]
];

const colors = ["#256ef4", "#0b78cb", "#d63d4a", "#228738", "#ffb114", "#7c3aed", "#14b8a6"];
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

let activeRoom = "keyboard";
let width = 0;
let height = 0;
let pointer = { x: 0, y: 0, px: 0, py: 0, down: false, speed: 0 };
let items = [];
let particles = [];
let count = 0;
let audio = null;
let master = null;
let soundOn = true;

rooms.forEach(([id, name, desc]) => {
  const button = document.createElement("button");
  button.className = "room-card";
  button.type = "button";
  button.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
  button.addEventListener("click", () => openRoom(id));
  roomGrid.appendChild(button);
});

soundBtn.textContent = "ASMR 소리 켜짐";
soundBtn.classList.add("sound-on");
soundBtn.setAttribute("aria-pressed", "true");

document.querySelector("#homeBtn").addEventListener("click", showHome);
document.querySelector("#resetBtn").addEventListener("click", () => initRoom(activeRoom));
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  ensureAudio();
  soundBtn.textContent = soundOn ? "ASMR 소리 켜짐" : "ASMR 소리 켜기";
  soundBtn.classList.toggle("sound-on", soundOn);
  soundBtn.classList.toggle("sound-off", !soundOn);
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) keySound(0.8);
});

function openRoom(id) {
  ensureAudio();
  activeRoom = id;
  homeView.classList.add("hidden");
  playView.classList.remove("hidden");
  requestAnimationFrame(resize);
  setTimeout(() => keySound(0.5), 80);
}

function showHome() {
  playView.classList.add("hidden");
  homeView.classList.remove("hidden");
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(320, Math.floor(rect.height * devicePixelRatio));
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
  if (activeRoom === "slime") wetPop(0.35);
});

window.addEventListener("keydown", (event) => {
  if (activeRoom !== "keyboard" || playView.classList.contains("hidden")) return;
  const key = items.find((item) => item.label.toLowerCase() === event.key.toLowerCase()) || items[Math.floor(Math.random() * items.length)];
  pressKey(key);
});

function movePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.px = pointer.x;
  pointer.py = pointer.y;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
}

function initRoom(id) {
  const room = rooms.find((entry) => entry[0] === id);
  roomKicker.textContent = "ASMR object";
  roomTitle.textContent = room[1];
  roomHint.textContent = hintFor(id);
  modeLabel.textContent = id;
  items = [];
  particles = [];
  count = 0;
  counter.textContent = "0";
  if (id === "keyboard") createKeyboard();
  if (id === "popball") createPopBall();
  if (id === "wrap") createWrap();
  if (id === "switches") createSwitches();
  if (id === "slime") createSlime();
  if (id === "beads") createBeads();
}

function hintFor(id) {
  return {
    keyboard: "마우스로 키를 누르거나 실제 키보드를 눌러 보세요. 키마다 피치가 조금 다릅니다.",
    popball: "공 위의 돌기를 하나씩 눌러 넣습니다. 모두 누르면 자동으로 다시 올라옵니다.",
    wrap: "한 줄로 쓸듯이 드래그하면 뽁뽁이가 연속으로 터집니다.",
    switches: "스위치를 하나씩 넘기면 짧고 선명한 딸깍 소리가 납니다.",
    slime: "말랑볼을 누르고 끌면 찌그러지고, 놓으면 둔탁하게 돌아옵니다.",
    beads: "포인터를 움직이면 구슬이 착착 모입니다. 누르면 부드럽게 퍼집니다."
  }[id];
}

function createKeyboard() {
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const key = Math.min(70, Math.max(42, width / 12));
  const startY = Math.max(145, height * 0.28);
  rows.forEach((row, r) => {
    const rowWidth = row.length * (key + 8) - 8;
    const startX = (width - rowWidth) / 2 + r * key * 0.28;
    [...row].forEach((label, i) => {
      items.push({ type: "key", label, x: startX + i * (key + 8), y: startY + r * (key + 12), w: key, h: key, down: 0, tone: 190 + (r * 11 + i) * 11 });
    });
  });
  const spaceW = Math.min(420, width * 0.52);
  items.push({ type: "key", label: "SPACE", x: (width - spaceW) / 2, y: startY + 3 * (key + 12), w: spaceW, h: key, down: 0, tone: 130 });
}

function createPopBall() {
  const cx = width / 2;
  const cy = height * 0.56;
  const radius = Math.min(width, height) * 0.31;
  for (let ring = 0; ring < 5; ring++) {
    const dots = ring === 0 ? 1 : ring * 8;
    const rr = radius * ring / 5;
    for (let i = 0; i < dots; i++) {
      const angle = dots === 1 ? 0 : i / dots * Math.PI * 2;
      items.push({ type: "nub", x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr, r: 18 + ring * 1.8, popped: false, lift: 1, color: colors[(ring + i) % colors.length] });
    }
  }
}

function createWrap() {
  const gap = 46;
  for (let y = 145; y < height - 28; y += gap) {
    for (let x = 28; x < width - 28; x += gap) {
      items.push({ type: "bubble", x, y, r: 17, popped: false, color: colors[(x + y) % colors.length] });
    }
  }
}

function createSwitches() {
  const cols = Math.max(2, Math.floor(width / 180));
  const w = 128;
  const h = 58;
  const gap = 26;
  const rows = Math.ceil(18 / cols);
  const startX = (width - cols * w - (cols - 1) * gap) / 2;
  const startY = Math.max(140, (height - rows * h - (rows - 1) * gap) / 2);
  for (let i = 0; i < 18; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    items.push({ type: "switch", x: startX + c * (w + gap), y: startY + r * (h + gap), w, h, on: i % 3 === 0, t: i % 3 === 0 ? 1 : 0 });
  }
}

function createSlime() {
  items.push({ type: "slime", x: width / 2, y: height * 0.58, r: Math.min(width, height) * 0.23, sx: 1, sy: 1, color: "#14b8a6" });
}

function createBeads() {
  for (let i = 0; i < 700; i++) {
    items.push({ type: "bead", x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, r: 2.4 + Math.random() * 2.8, color: colors[i % colors.length] });
  }
}

function interact(isTap) {
  if (activeRoom === "keyboard" && pointer.down) {
    items.forEach((key) => {
      if (hitRect(key) && key.down <= 0.08) pressKey(key);
    });
  }
  if (activeRoom === "popball" && pointer.down) {
    items.forEach((nub) => {
      if (!nub.popped && Math.hypot(pointer.x - nub.x, pointer.y - nub.y) < nub.r + 7) popNub(nub);
    });
  }
  if (activeRoom === "wrap" && pointer.down) {
    items.forEach((bubble) => {
      if (!bubble.popped && Math.hypot(pointer.x - bubble.x, pointer.y - bubble.y) < bubble.r + 9) popWrap(bubble);
    });
  }
  if (activeRoom === "switches" && isTap) {
    items.forEach((sw) => {
      if (hitRect(sw)) toggleSwitch(sw);
    });
  }
  if (activeRoom === "slime" && pointer.down) {
    const slime = items[0];
    const dist = Math.hypot(pointer.x - slime.x, pointer.y - slime.y);
    if (dist < slime.r * 1.4) {
      slime.x += (pointer.x - slime.x) * 0.08;
      slime.y += (pointer.y - slime.y) * 0.08;
      slime.sx = 1.25 + Math.min(0.35, pointer.speed * 0.01);
      slime.sy = 0.7;
      if (Math.random() < 0.08) wetPop(0.18);
      addParticle(pointer.x, pointer.y, "#14b8a6", 8);
    }
  }
}

function hitRect(rect) {
  return pointer.x >= rect.x && pointer.x <= rect.x + rect.w && pointer.y >= rect.y && pointer.y <= rect.y + rect.h;
}

function pressKey(key) {
  key.down = 1;
  count += 1;
  counter.textContent = String(count);
  keySound(key.tone / 260);
  addParticle(key.x + key.w / 2, key.y + key.h / 2, "#256ef4", 10);
}

function popNub(nub) {
  nub.popped = true;
  nub.lift = 0;
  count += 1;
  counter.textContent = String(count);
  popSound(0.95);
  addParticle(nub.x, nub.y, nub.color, 18);
  if (items.every((item) => item.popped)) setTimeout(() => initRoom("popball"), 650);
}

function popWrap(bubble) {
  bubble.popped = true;
  count += 1;
  counter.textContent = String(count);
  popSound(0.65 + pointer.speed * 0.012);
  addParticle(bubble.x, bubble.y, bubble.color, 12);
  if (count >= 120) setTimeout(() => initRoom("wrap"), 500);
}

function toggleSwitch(sw) {
  sw.on = !sw.on;
  sw.t = sw.on ? 1 : 0;
  count += 1;
  counter.textContent = String(count);
  switchSound(sw.on);
  addParticle(sw.x + sw.w / 2, sw.y + sw.h / 2, sw.on ? "#228738" : "#58616a", 10);
}

function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = 1.4;
    master.connect(audio.destination);
  }
  if (audio.state === "suspended") audio.resume();
}

function out() {
  return master || audio.destination;
}

function keySound(pitch = 1) {
  if (!soundOn || !audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const click = audio.createBufferSource();
  const gain = audio.createGain();
  const noiseGain = audio.createGain();
  const filter = audio.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(145 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(80 * pitch, now + 0.045);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  click.buffer = noiseBuffer(0.028, 0.9);
  filter.type = "bandpass";
  filter.frequency.value = 2800;
  noiseGain.gain.value = 0.24;
  osc.connect(gain).connect(out());
  click.connect(filter).connect(noiseGain).connect(out());
  osc.start(now);
  click.start(now);
  osc.stop(now + 0.07);
  click.stop(now + 0.035);
  vibrate(6);
}

function popSound(power = 1) {
  if (!soundOn || !audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const click = audio.createBufferSource();
  const clickGain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420 + 220 * power, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.075);
  gain.gain.setValueAtTime(0.26 * power, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  click.buffer = noiseBuffer(0.055, 1.2);
  clickGain.gain.value = 0.26 * power;
  osc.connect(gain).connect(out());
  click.connect(clickGain).connect(out());
  osc.start(now);
  click.start(now);
  osc.stop(now + 0.1);
  click.stop(now + 0.06);
  vibrate(10);
}

function switchSound(on) {
  if (!soundOn || !audio) return;
  const now = audio.currentTime;
  const a = audio.createOscillator();
  const g = audio.createGain();
  a.type = "triangle";
  a.frequency.setValueAtTime(on ? 620 : 360, now);
  a.frequency.exponentialRampToValueAtTime(on ? 180 : 120, now + 0.045);
  g.gain.setValueAtTime(0.34, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  a.connect(g).connect(out());
  a.start(now);
  a.stop(now + 0.07);
  keySound(on ? 0.7 : 0.5);
  vibrate(8);
}

function wetPop(volume = 0.3) {
  if (!soundOn || !audio) return;
  const src = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  src.buffer = noiseBuffer(0.16, 0.8);
  filter.type = "lowpass";
  filter.frequency.value = 520;
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(out());
  src.start();
}

function beadTick(speed) {
  if (!soundOn || !audio || Math.random() > 0.2) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = 900 + Math.min(800, speed * 20);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  osc.connect(gain).connect(out());
  osc.start(now);
  osc.stop(now + 0.03);
}

function noiseBuffer(duration, amount) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * amount * (1 - i / data.length);
  }
  return buffer;
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function addParticle(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 2 + Math.random() * 5, life: 24 + Math.random() * 20, color });
  }
}

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = activeRoom === "slime" ? "#e7f4fe" : "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (activeRoom === "keyboard") drawKeyboard();
  if (activeRoom === "popball") drawPopBall();
  if (activeRoom === "wrap") drawWrap();
  if (activeRoom === "switches") drawSwitches();
  if (activeRoom === "slime") drawSlime();
  if (activeRoom === "beads") drawBeads();
  drawParticles();
}

function drawKeyboard() {
  drawDesk("#f4f5f6");
  items.forEach((key) => {
    key.down = Math.max(0, key.down - 0.12);
    const press = key.down * 6;
    ctx.save();
    ctx.translate(0, press);
    shadow(key.x, key.y, key.w, key.h, 12, 0.18);
    const grad = ctx.createLinearGradient(key.x, key.y, key.x, key.y + key.h);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#dfe4ea");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(key.x, key.y, key.w, key.h, 10);
    ctx.fill();
    ctx.strokeStyle = key.down > 0 ? "#256ef4" : "#b1b8be";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#1e2124";
    ctx.font = `700 ${key.label === "SPACE" ? 15 : 19}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key.label, key.x + key.w / 2, key.y + key.h / 2 + 1);
    ctx.restore();
  });
}

function drawPopBall() {
  const cx = width / 2;
  const cy = height * 0.56;
  const r = Math.min(width, height) * 0.34;
  shadow(cx - r, cy - r, r * 2, r * 2, r, 0.18);
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.45, "#d8e5fd");
  grad.addColorStop(1, "#256ef4");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  items.forEach((nub) => {
    nub.lift += ((nub.popped ? 0 : 1) - nub.lift) * 0.2;
    const nr = nub.r * (nub.popped ? 0.62 : 1);
    ctx.fillStyle = nub.popped ? "#0b50d0aa" : nub.color;
    ctx.beginPath();
    ctx.arc(nub.x, nub.y - nub.lift * 5, nr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffffaa";
    ctx.stroke();
  });
}

function drawWrap() {
  drawDesk("#f4f5f6");
  items.forEach((bubble) => {
    if (bubble.popped) {
      ctx.fillStyle = "#e6e8ea";
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r * 0.52, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const grad = ctx.createRadialGradient(bubble.x - 6, bubble.y - 7, 2, bubble.x, bubble.y, bubble.r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, bubble.color + "88");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#86aff9";
    ctx.stroke();
  });
}

function drawSwitches() {
  drawDesk("#f9fafb");
  items.forEach((sw) => {
    sw.t += ((sw.on ? 1 : 0) - sw.t) * 0.22;
    shadow(sw.x, sw.y, sw.w, sw.h, 999, 0.14);
    ctx.fillStyle = sw.on ? "#ecf2fe" : "#f4f5f6";
    ctx.beginPath();
    ctx.roundRect(sw.x, sw.y, sw.w, sw.h, 999);
    ctx.fill();
    ctx.strokeStyle = sw.on ? "#256ef4" : "#b1b8be";
    ctx.lineWidth = 2;
    ctx.stroke();
    const knob = sw.x + 29 + sw.t * (sw.w - 58);
    ctx.fillStyle = sw.on ? "#256ef4" : "#ffffff";
    ctx.beginPath();
    ctx.arc(knob, sw.y + sw.h / 2, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#58616a";
    ctx.stroke();
  });
}

function drawSlime() {
  const slime = items[0];
  slime.sx += (1 - slime.sx) * 0.1;
  slime.sy += (1 - slime.sy) * 0.1;
  ctx.save();
  ctx.translate(slime.x, slime.y);
  ctx.scale(slime.sx, slime.sy);
  shadow(-slime.r, -slime.r, slime.r * 2, slime.r * 2, slime.r, 0.16);
  const grad = ctx.createRadialGradient(-slime.r * 0.35, -slime.r * 0.42, 12, 0, 0, slime.r);
  grad.addColorStop(0, "#d9fff7");
  grad.addColorStop(0.55, "#14b8a6");
  grad.addColorStop(1, "#0f766e");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, slime.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeads() {
  items.forEach((bead) => {
    const dx = pointer.x - bead.x;
    const dy = pointer.y - bead.y;
    const dist = Math.max(18, Math.hypot(dx, dy));
    if (dist < 240) {
      const force = pointer.down ? -0.7 : 0.85;
      bead.vx += dx / dist * force;
      bead.vy += dy / dist * force;
      beadTick(pointer.speed);
    }
    bead.x += bead.vx;
    bead.y += bead.vy;
    bead.vx *= 0.92;
    bead.vy *= 0.92;
    if (bead.x < bead.r || bead.x > width - bead.r) bead.vx *= -0.8;
    if (bead.y < bead.r || bead.y > height - bead.r) bead.vy *= -0.8;
    bead.x = Math.max(bead.r, Math.min(width - bead.r, bead.x));
    bead.y = Math.max(bead.r, Math.min(height - bead.r, bead.y));
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(bead.x, bead.y, bead.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawParticles() {
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.94;
    p.vy *= 0.94;
    ctx.globalAlpha = Math.max(0, p.life / 44);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawDesk(color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 112, width, height - 112);
}

function shadow(x, y, w, h, r, alpha) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(0,0,0,0.001)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

resize();
draw();
