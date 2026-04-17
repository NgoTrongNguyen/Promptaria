import { MouseMoving } from './Mouse/Mouse.js';
import { CallAPI } from './CallAPI/API.js';
import { Player } from './Player/Player.js';
import { Camera } from './Camera/Camera.js';
import { Ghost } from './Monster/Monster.js';


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

let lastTile = { r: -1, c: -1};
function getTileAt(row, col) {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
    if (lastTile.r !== row || lastTile.c !== col) {
      if (lastTile.r +4  <= row || lastTile.r -4 >= row || lastTile.c +2 <= col || lastTile.c -2 >= col) {
        lastTile = { r: row, c: col };
        getSurroundingMatrix(lastTile.r, lastTile.c);
      }
    }
}

function getSurroundingTiles(row, col) {
    let surroundingTiles = [];
    for (let r = Math.max(0, row - 1); r <= Math.min(MAP_ROWS - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(MAP_COLS - 1, col + 1); c++) {
            if (r !== row || c !== col) {
                surroundingTiles.push({ r, c });
            }
        }
    }
    return surroundingTiles;
}

let surroundingMatrix = [];
function getSurroundingMatrix(row, col){
  surroundingMatrix = []; 
  let surroundingTiles = getSurroundingTiles(row, col);
  surroundingTiles.forEach((tiles) => {
    surroundingMatrix.push(tilemap[tiles.r][tiles.c]);
  });
}

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
const TILE_WOOD  = 4;
const TILE_LEAVES  = 5;

const TILE_COAL  = 7;
const TILE_IRON  = 8;
const TILE_GOLD  = 9;
const TILE_DIAM  = 10;
const TILE_EMER  = 11;

const MAP_COLS = 64;
const MAP_ROWS = 64;

const SOLID_TILES = new Set([
  TILE_GRASS,
  TILE_DIRT,
  TILE_STONE,
  TILE_WOOD,
  TILE_LEAVES,
  TILE_COAL,  
  TILE_IRON,  
  TILE_GOLD,  
  TILE_DIAM, 
  TILE_EMER, 
]);


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
  return SOLID_TILES.has(tilemap[r][c]);
}

// mau sac tile
const TILE_COLORS = {
  [TILE_GRASS]: '#4a9e2f',
  [TILE_DIRT]:  '#7a4f28',
  [TILE_STONE]: '#6b6b6b',
  [TILE_WOOD]:  '#8b5a2b',
  [TILE_LEAVES]: '#2e8b57',
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
  [TILE_WOOD]:  '#5c3a1e',
  [TILE_LEAVES]: '#1f5d3a',
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

let iron = 0;
let gold = 0;
let diamond = 0;
function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 200, 48, 8);
  ctx.fill();
  ctx.fillStyle = '#f5c842';
  ctx.font = '11px monospace';
  ctx.fillText('Hp: ' + Math.floor(player.hp), 22, 35);
  ctx.fillStyle = '#f5c842';
  ctx.font = '11px monospace';
  ctx.fillText('Goal: Iron - ' + iron + '/5, Gold - ' + gold + '/5, Diamond - ' + diamond + '/5', 22, 65);
  const col = Math.floor(player.x / T);
  const row = Math.floor(player.y / T);
  getTileAt(row, col);
  ctx.fillText('x:' + Math.round(player.x) + ' y:' + Math.round(player.y), 22, 50);
  
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

function setupBlockBreaking() {
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    
    // 2. Tính tỉ lệ giữa tọa độ nội bộ của canvas và kích thước hiển thị CSS
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const localX = (e.clientX - rect.left) * scaleX;
    const localY = (e.clientY - rect.top) * scaleY;

    // Cộng thêm offset camera để ra tọa độ thực trong map
    const worldX = localX + camera.x;
    const worldY = localY + camera.y;

    // Quy đổi sang hàng–cột trong tilemap
    const c = Math.floor(worldX / T);
    const r = Math.floor(worldY / T);

    // Kiểm tra trong phạm vi bản đồ
    if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
      if (isSolid(r, c)) {
        if (tilemap[r][c] === TILE_IRON) iron++;
        if (tilemap[r][c] === TILE_GOLD) gold++;
        if (tilemap[r][c] === TILE_DIAM) diamond++;
        tilemap[r][c] = TILE_AIR; 
      }
    }
  });
}
function mutateTerrainInDarkness(playerWorldX, playerWorldY, radius) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      // Tọa độ tâm của Tile này trong thế giới thực (World Space)
      const tx = c * T - 5*T;
      const ty = r * T - 5*T;

      // Tính khoảng cách dựa trên tọa độ World của người chơi
      const dist = Math.hypot(tx - playerWorldX, ty - playerWorldY);

      let tiles = [TILE_STONE, TILE_DIRT]
      if (dist > radius) {
        if (Math.random() < 0.004) {
          if (tilemap[r][c] === TILE_AIR && Math.random() < 0.2)
            tilemap[r][c] = tiles[Math.floor(Math.random() * tiles.length)];
          if (tilemap[r][c] !== TILE_AIR)
            tilemap[r][c] = tiles[Math.floor(Math.random() * tiles.length)];
            if (Math.random() < 0.006)
              tilemap[r][c] = TILE_AIR;
        }
      }
    }
  }
}

function drawLighting() {
  const px = player.x - camera.x + player.w / 2;
  const py = player.y - camera.y + player.h / 2;

  // bán kính vùng sáng
  const innerRadius = 50;   // vùng sáng rõ
  const outerRadius = 120;  // vùng sáng mờ dần

  // tạo gradient tròn
  const gradient = ctx.createRadialGradient(px, py, innerRadius, px, py, outerRadius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');       // trung tâm sáng
  gradient.addColorStop(1, 'rgba(0,0,0,0.95)');    // ngoài tối

  // phủ gradient lên toàn canvas
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}


let ghosts = [];
function spawnGhost() {
  const x = Math.random() * MAP_COLS * T;
  const y = Math.random() * MAP_ROWS * T;
  ghosts.push(new Ghost(x, y));
}

function drawGhosts(camX, camY) {
  ghosts.forEach(ghost => {
    // 1. Tính toán vị trí hiển thị trên màn hình
    const gx = ghost.x - camX + ghost.w / 2;
    const gy = ghost.y - camY + ghost.h / 2;

    ctx.save(); // Lưu trạng thái canvas

    // 2. Tạo hiệu ứng phát sáng (Glow)
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(200, 230, 255, 0.5)';
    
    // 3. Vẽ thân ma (Hình giọt nước ngược hoặc elip)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Trong suốt một chút
    ctx.beginPath();
    // Vẽ đầu tròn
    ctx.arc(gx, gy, ghost.w / 2, Math.PI, 0); 
    // Vẽ thân dưới hơi loe ra hoặc răng cưa
    ctx.lineTo(gx + ghost.w / 2, gy + ghost.h / 2);
    ctx.lineTo(gx - ghost.w / 2, gy + ghost.h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000';
    const eyeSize = ghost.w / 8;
    const eyeOffset = ghost.w / 4;
    
    // Mắt trái
    ctx.beginPath();
    ctx.arc(gx - eyeOffset/1.5, gy - 2, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // Mắt phải
    ctx.beginPath();
    ctx.arc(gx + eyeOffset/1.5, gy - 2, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Khôi phục trạng thái (để không làm mờ các vật thể khác)
  });
}

function updateGhosts() {
  ghosts.forEach(ghost => {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      ghost.x += (dx / dist) * ghost.speed;
      ghost.y += (dy / dist) * ghost.speed;
    }

    if (Math.abs(ghost.x - player.x) < 2 && Math.abs(ghost.y - player.y) < 2) {
      player.hp -= 0.05; 
    }
  });
}



function loop() {
    MouseMoving(canvas, T, (check) => {
    if (check === 1) {
        CallAPI(surroundingMatrix).then(data => {
            tilemap = data.result;
            });
            player.x = (MAP_COLS * T) / 2 - player.w / 2;
            player.y = (MAP_ROWS * T) / 2 - player.h / 2 + 48;
            player.vx = 0;
            player.vy = 0;

            targetx = player.x - canvas.width / 2;
            targety = player.y - canvas.height / 2 + 48;

            camera.x = (targetx - camera.x)*0.05;
            camera.y = (targety - camera.y)*0.05;
        };
    });
  update();
  updateGhosts();
  drawSky();
  drawTilemap(camera.x, camera.y);
  drawPlayer(camera.x, camera.y);
  drawGhosts(camera.x, camera.y);
  drawLighting();
  mutateTerrainInDarkness(camera.x, camera.y, 320);
  drawHUD();
  requestAnimationFrame(loop);
}

spawnGhost();
setupBlockBreaking();
canvas.setAttribute('tabindex', '0');
canvas.focus();
loop();





