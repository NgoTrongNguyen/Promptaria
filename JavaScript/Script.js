import { MouseMoving } from './Mouse/Mouse.js';
import { CallAPI } from './CallAPI/API.js';
import { Player } from './Player/Player.js';
import { Camera } from './Camera/Camera.js';


function generateMatrix() {
    const size = 64;
    const matrix = [];

    for (let r = 0; r < size; r++) {
        let row = [];
        for (let c = 0; c < size; c++) {
            if (r < size/8) {
                row.push(0);   // nửa trên
            } else if (r === size/8) {
                row.push(1);   // hàng giữa
            } else {
                row.push(2);   // nửa dưới
            }
        }
        matrix.push(row);
    }

    return matrix;
}

let tilemap = generateMatrix();

const canvas = document.getElementById('gc');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
canvas.width = 700;
canvas.height = 400;

const T = 32;


const TILE_AIR   = 0;
const TILE_GRASS = 1;
const TILE_DIRT  = 2;
const TILE_STONE = 3;
const TILE_DEEP  = 4;
const TILE_COIN  = 5;
const TILE_PLATF = 6;
const TILE_COAL  = 7;
const TILE_IRON  = 8;
const TILE_GOLD  = 9;
const TILE_DIAM  = 10;
const TILE_EMER  = 11;

const MAP_COLS = 64;
const MAP_ROWS = 64;


// sinh dia hinh theo height map
const heightMap = [];
let h = 10;
for (let c = 0; c < MAP_COLS; c++) {
  h += (Math.random() - 0.5) * 1.8;
  h = Math.max(6, Math.min(14, h));
  heightMap.push(Math.round(h));
}


function isSolid(r, c) {
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false;
  const t = tilemap[r][c];
  return t === TILE_GRASS || t === TILE_DIRT || t === TILE_STONE || t === TILE_DEEP || t === TILE_PLATF;
}

// mau sac tile
const TILE_COLORS = {
  [TILE_GRASS]: '#4a9e2f',
  [TILE_DIRT]:  '#7a4f28',
  [TILE_STONE]: '#6b6b6b',
  [TILE_DEEP]:  '#3a3a3a',
  [TILE_PLATF]: '#8B6914',
  [TILE_COAL]:  '#5a5a5a',
  [TILE_IRON]:  '#808080',
  [TILE_GOLD]:  '#ffd700',
  [TILE_DIAM]:  '#b0e0e6',
  [TILE_EMER]:  '#00ff00'

};
const TILE_TOP = {
  [TILE_GRASS]: '#6ecc44'
};
const TILE_SHADE = {
  [TILE_GRASS]: '#3a7d24',
  [TILE_DIRT]:  '#5c3d1e',
  [TILE_STONE]: '#505050',
  [TILE_DEEP]:  '#2a2a2a',
  [TILE_PLATF]: '#6a4e10',
  [TILE_COAL]:  '#4a4a4a',
  [TILE_IRON]:  '#707070',
  [TILE_GOLD]:  '#bfa000',
  [TILE_DIAM]:  '#90b0b0',
  [TILE_EMER]:  '#00cc00'
};

function drawTilemap(camX, camY) {
  const startC = Math.max(0, Math.floor(camX / T));
  const endC   = Math.min(MAP_COLS - 1, Math.ceil((camX + canvas.width) / T));
  const startR = Math.max(0, Math.floor(camY / T));
  const endR   = Math.min(MAP_ROWS - 1, Math.ceil((camY + canvas.height) / T));

  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const tile = tilemap[r][c];
      if (tile === TILE_AIR) continue;

      const sx = c * T - camX;
      const sy = r * T - camY;

      ctx.fillStyle = TILE_COLORS[tile] || '#888';
      ctx.fillRect(sx, sy, T, T);

      // highlight top
      if (TILE_TOP[tile]) {
        ctx.fillStyle = TILE_TOP[tile];
        ctx.fillRect(sx, sy, T, 5);
      }
      // shade bottom-right
      ctx.fillStyle = TILE_SHADE[tile] || '#444';
      ctx.fillRect(sx, sy + T - 4, T, 4);
      ctx.fillRect(sx + T - 4, sy, 4, T);

      // duong luoi nhe
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(sx, sy, T, T);
    }
  }
}


// nhân vật
const player = new Player(3 * T, (heightMap[3] - 2) * T);
const camera = new Camera(0, 0);

const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
document.addEventListener('keyup',   e => { keys[e.code] = false; });


function drawPlayer(camX, camY) {
  const px = player.x - camX;
  const py = player.y - camY;
  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(player.facing, 1);
  const lx = player.onGround && (keys['KeyA'] || keys['ArrowLeft'] || keys['KeyD'] || keys['ArrowRight'])
    ? Math.sin(player.walkFrame * 0.5) * 5 : 0;
  ctx.fillStyle = '#2c2c8a';
  ctx.fillRect(-8, 6, 7, 14);
  ctx.fillRect(1, 6, 7, 14);
  ctx.fillStyle = '#1a5e1a';
  ctx.fillRect(-9, -4, 18, 12);
  ctx.fillStyle = '#f5c07a';
  ctx.beginPath();
  ctx.arc(0, -11, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a6a';
  ctx.beginPath(); ctx.arc(-3, -12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function resolveCollision() {
  const STEPS = 3;
  player.x += player.vx;
  for (let s = 0; s < STEPS; s++) {
    const c0 = Math.floor(player.x / T);
    const c1 = Math.floor((player.x + player.w - 1) / T);
    const rMid = Math.floor((player.y + player.h / 2) / T);
    if (player.vx > 0) {
      if (isSolid(rMid, c1)) { player.x = c1 * T - player.w; player.vx = 0; }
    } else if (player.vx < 0) {
      if (isSolid(rMid, c0)) { player.x = (c0 + 1) * T; player.vx = 0; }
    }
  }

  player.y += player.vy;
  player.onGround = false;
  const c0 = Math.floor(player.x / T);
  const c1 = Math.floor((player.x + player.w - 1) / T);
  if (player.vy >= 0) {
    const rBot = Math.floor((player.y + player.h) / T);
    for (let c = c0; c <= c1; c++) {
      if (isSolid(rBot, c)) {
        player.y = rBot * T - player.h;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  } else {
    const rTop = Math.floor(player.y / T);
    for (let c = c0; c <= c1; c++) {
      if (isSolid(rTop, c)) {
        player.y = (rTop + 1) * T;
        player.vy = 0;
        break;
      }
    }
  }
}


function drawSky() {
  ctx.fillStyle = '#0f1b2d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const stars = [[50,20],[150,40],[280,15],[400,35],[530,10],[640,50],[80,80],[220,70],[360,60],[480,85],[600,30]];
  stars.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 200, 48, 8);
  ctx.fill();
  ctx.fillStyle = '#f5c842';
  ctx.font = '11px monospace';
  const col = Math.floor(player.x / T);
  const row = Math.floor(player.y / T);
  ctx.fillText('tile [' + row + '][' + col + ']  |  x:' + Math.round(player.x) + ' y:' + Math.round(player.y), 22, 50);
}

let time = 0;

function update() {
  time += 0.016;
  const spd = 2.2, jmp = -8, grv = 0.5;

  if (keys['KeyA'] || keys['ArrowLeft'])  { player.vx = -spd; player.facing = -1; }
  else if (keys['KeyD'] || keys['ArrowRight']) { player.vx = spd;  player.facing = 1; }
  else player.vx *= 0.75;

  if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.onGround) {
    player.vy = jmp;
    player.onGround = false;
  }

  player.vy = Math.min(player.vy + grv, 18);

  if (player.vx !== 0 && player.onGround) {
    player.walkTimer++;
    if (player.walkTimer > 3) { player.walkFrame++; player.walkTimer = 0; }
  }

  resolveCollision();

  player.x = Math.max(0, Math.min(MAP_COLS * T - player.w, player.x));
  if (player.y > MAP_ROWS * T + 50) {
    player.y = (heightMap[3] - 2) * T;
    player.x = 3 * T;
    player.vy = 0;
  }

  const targetX = player.x + player.w / 2 - canvas.width / 2;
  const targetY = player.y + player.h / 2 - canvas.height * 0.5;
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;
  camera.x = Math.max(0, Math.min(MAP_COLS * T - canvas.width,  camera.x));
  camera.y = Math.max(0, Math.min(MAP_ROWS * T - canvas.height, camera.y));
}

function loop() {
    MouseMoving(canvas, T, (check) => {
    if (check === 1) {
        CallAPI().then(data => {
            tilemap = data.result;
            });
        };
    });
  update();
  drawSky();
  drawTilemap(camera.x, camera.y);
  drawPlayer(camera.x, camera.y);
  drawHUD();
  requestAnimationFrame(loop);
}

canvas.setAttribute('tabindex', '0');
canvas.focus();
loop();





