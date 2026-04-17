'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PIXEL_COLORS } from '@/lib/constants';
import { generateTerrain } from '@/lib/ml';

interface GameStats {
  hp: number;
  atk: number;
  spd: number;
  range: number;
}

type MonsterType = 'ghost' | 'zombie';

interface Monster {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  hp: number;
  maxHp: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  distance: number;
  active: boolean;
}

interface ArenaCanvasProps {
  terrain: number[][];
  playerPixels: number[];
  weaponPixels: number[];
  stats: GameStats;
  hardMode?: boolean;
  heroClass?: string;
}

const T = 32; // TILE_SIZE
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;

const PLAYER_SIZE = 32;
const WEAPON_SIZE = 16;

export default function ArenaCanvas({
  terrain: initialTerrain,
  playerPixels,
  weaponPixels,
  stats,
  hardMode = false,
  heroClass = 'melee'
}: ArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High-frequency game state stored in Refs to prevent re-render loops
  const terrainRef = useRef<number[][]>(initialTerrain);
  const monstersRef = useRef<Monster[]>([]);
  const [playerHp, setPlayerHp] = useState(stats.hp);
  const [kills, setKills] = useState({ ghost: 0 });

  const physics = useRef({
    px: 100,
    py: 100,
    pvx: 0,
    pvy: 0,
    pOnGround: false,
    pFacing: 1,
    walkFrame: 0,
    isAttacking: false,
    attackTimer: 0,
    attackCooldown: 0
  });

  const projectilesRef = useRef<Projectile[]>([]);

  const keys = useRef<{ [key: string]: boolean }>({});
  const camera = useRef({ x: 0, y: 0 });
  const isRegenerating = useRef(false);
  const lastMouseGrid = useRef({ x: 0, y: 0 });

  // Sync initialTerrain to ref if it changes from props
  useEffect(() => {
    terrainRef.current = initialTerrain;
  }, [initialTerrain]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial spawn
    const spawnInitial = () => {
      const MAP_W = terrainRef.current[0].length;
      const MAP_H = terrainRef.current.length;
      for (let i = 0; i < 3; i++) {
        monstersRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'ghost',
          x: Math.random() * (MAP_W * T),
          y: Math.random() * (MAP_H * T),
          w: 22, h: 30, speed: 1.0 + Math.random(),
          hp: 10, maxHp: 10
        });
      }
    };
    spawnInitial();

    const spawnTimer = setInterval(() => {
      if (monstersRef.current.length < 5) {
        const MAP_W = terrainRef.current[0].length;
        const MAP_H = terrainRef.current.length;
        monstersRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'ghost',
          x: Math.random() * (MAP_W * T),
          y: Math.random() * (MAP_H * T),
          w: 22, h: 30, speed: 1.0 + Math.random(),
          hp: 10, maxHp: 10
        });
      }
    }, 3000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(spawnTimer);
    };
  }, []); // Remove hardMode dependency to always spawn ghosts

  useEffect(() => {
    const gameCanvas = canvasRef.current;
    if (!gameCanvas) return;
    const ctx = gameCanvas.getContext('2d');
    if (!ctx) return;

    const MAP_H = terrainRef.current.length;
    const MAP_W = terrainRef.current[0].length;

    const isSolid = (r: number, c: number) => {
      if (r < 0 || r >= MAP_H || c < 0 || c >= MAP_W) return false;
      return terrainRef.current[r][c] > 0;
    };

    const update = () => {
      let { px, py, pvx, pvy, pOnGround, pFacing, walkFrame, isAttacking, attackTimer, attackCooldown } = physics.current;

      // Attack Trigger
      if (keys.current['Space'] && attackCooldown <= 0) {
        isAttacking = true;
        attackTimer = 0;
        attackCooldown = 30; // 0.5s cooldown at 60fps

        if (heroClass === 'ranged') {
          projectilesRef.current.push({
            x: px + 16,
            y: py + 16,
            vx: pFacing * 8,
            distance: 0,
            active: true
          });
        }
      }

      if (isAttacking) {
        attackTimer++;
        if (attackTimer > 20) isAttacking = false;

        // Melee collision in hit frames
        if (heroClass === 'melee' && attackTimer > 5 && attackTimer < 15) {
          const hitbox = {
            x: px + 16 + (pFacing > 0 ? 0 : -48),
            y: py,
            w: 48,
            h: 32
          };
          monstersRef.current.forEach(monster => {
            if (monster.x < hitbox.x + hitbox.w && monster.x + monster.w > hitbox.x &&
                monster.y < hitbox.y + hitbox.h && monster.y + monster.h > hitbox.y) {
              monster.hp -= stats.atk * 0.1; // Do damage over hit frames
            }
          });
        }
      }
      if (attackCooldown > 0) attackCooldown--;

      // Projectile Update
      projectilesRef.current = projectilesRef.current.filter(p => p.active);
      projectilesRef.current.forEach(p => {
        p.x += p.vx;
        p.distance += Math.abs(p.vx);
        if (p.distance > PLAYER_SIZE * 3) p.active = false;
        
        // Monster collision
        monstersRef.current.forEach(monster => {
          if (p.x > monster.x && p.x < monster.x + monster.w &&
              p.y > monster.y && p.y < monster.y + monster.h) {
            monster.hp -= stats.atk;
            p.active = false;
          }
        });
      });


      // Movement
      const currentSpeed = MOVE_SPEED * (stats.spd / 10);

      if (keys.current['ArrowLeft']) {
        pvx = -currentSpeed;
        pFacing = -1;
        walkFrame++;
      } else if (keys.current['ArrowRight']) {
        pvx = currentSpeed;
        pFacing = 1;
        walkFrame++;
      } else {
        pvx *= 0.8;
      }

      // Debug: Currently use Space for attack
      // -> Temporarily not using Space for jump
      if ((keys.current['ArrowUp']) && pOnGround) {
        pvy = JUMP_FORCE;
        pOnGround = false;
      }

      pvy = Math.min(pvy + GRAVITY, 15);

      // Collision Resolution
      px += pvx;
      const rMid = Math.floor((py + 16) / T);
      if (pvx > 0) {
        const c1 = Math.floor((px + 28) / T);
        if (isSolid(rMid, c1)) { px = c1 * T - 28; pvx = 0; }
      } else if (pvx < 0) {
        const c0 = Math.floor((px + 4) / T);
        if (isSolid(rMid, c0)) { px = (c0 + 1) * T - 4; pvx = 0; }
      }

      py += pvy;
      pOnGround = false;
      const cLeft = Math.floor((px + 6) / T);
      const cRight = Math.floor((px + 26) / T);
      if (pvy >= 0) {
        const rBot = Math.floor((py + 32) / T);
        for (let c = cLeft; c <= cRight; c++) {
          if (isSolid(rBot, c)) {
            py = rBot * T - 32;
            pvy = 0;
            pOnGround = true;
            break;
          }
        }
      } else {
        const rTop = Math.floor(py / T);
        for (let c = cLeft; c <= cRight; c++) {
          if (isSolid(rTop, c)) {
            py = (rTop + 1) * T;
            pvy = 0;
            break;
          }
        }
      }

      // Camera
      const targetX = px + 16 - gameCanvas.width / 2;
      const targetY = py + 16 - gameCanvas.height / 2;
      camera.current.x += (targetX - camera.current.x) * 0.1;
      camera.current.y += (targetY - camera.current.y) * 0.1;
      camera.current.x = Math.max(0, Math.min(MAP_W * T - gameCanvas.width, camera.current.x));
      camera.current.y = Math.max(0, Math.min(MAP_H * T - gameCanvas.height, camera.current.y));

      // Monster Update
      monstersRef.current.forEach(monster => {
        const dx = px - monster.x;
        const dy = py - monster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          if (dist < 20) setPlayerHp(h => Math.max(0, h - 0.2));
          monster.x += (dx / dist) * monster.speed;
          monster.y += (dy / dist) * monster.speed;
        }
      });

      // Maintain MIN_MONSTER_NUM (3)
      if (monstersRef.current.length < 3) {
        monstersRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'ghost',
          x: Math.random() < 0.5 ? 0 : MAP_W * T,
          y: Math.random() < 0.5 ? 0 : MAP_H * T,
          w: 22, h: 30, speed: 1.0 + Math.random(),
          hp: 10, maxHp: 10
        });
      }

      // Cleanup & Quest Logic
      const initialCount = monstersRef.current.length;
      monstersRef.current = monstersRef.current.filter(m => m.hp > 0);
      if (monstersRef.current.length < initialCount) {
        setKills(prev => ({ ...prev, ghost: prev.ghost + (initialCount - monstersRef.current.length) }));
      }

      if (hardMode) {
        // Terrain Mutation in Darkness
        if (Math.random() < 0.01) {
          const r = Math.floor(Math.random() * MAP_H);
          const c = Math.floor(Math.random() * MAP_W);
          const dist = Math.sqrt(Math.pow(c * T - px, 2) + Math.pow(r * T - py, 2));
          if (dist > 250) {
            if (terrainRef.current[r][c] === 0) terrainRef.current[r][c] = 3;
            else terrainRef.current[r][c] = 0;
          }
        }
      }

      physics.current = { px, py, pvx, pvy, pOnGround, pFacing, walkFrame, isAttacking, attackTimer, attackCooldown };
    };

    const handleMouseMove = async (e: MouseEvent) => {
      if (isRegenerating.current || !gameCanvas) return;

      const rect = gameCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (gameCanvas.width / rect.width) + camera.current.x;
      const y = (e.clientY - rect.top) * (gameCanvas.height / rect.height) + camera.current.y;
      const c = Math.floor(x / T);
      const r = Math.floor(y / T);

      if (r !== lastMouseGrid.current.y || c !== lastMouseGrid.current.x) {
        lastMouseGrid.current = { x: c, y: r };

        const surround: number[] = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < MAP_H && nc >= 0 && nc < MAP_W) {
              surround.push(terrainRef.current[nr][nc]);
            } else {
              surround.push(0);
            }
          }
        }

        if (surround.length === 8) {
          isRegenerating.current = true;
          try {
            const data = await generateTerrain(surround);
            terrainRef.current = data.result;
            physics.current.px = (data.result[0].length * T) / 2 - 16;
            physics.current.py = (data.result.length * T) / 2 - 16;
            physics.current.pvy = 0;
            physics.current.pvx = 0;
          } catch (err) {
            console.error(err);
          } finally {
            setTimeout(() => { isRegenerating.current = false; }, 2000);
          }
        }
      }
    };

    const drawSky = () => {
      ctx.fillStyle = hardMode ? '#0f172a' : '#1e293b';
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    };

    const drawTilemap = () => {
      const { x: camX, y: camY } = camera.current;
      const startC = Math.max(0, Math.floor(camX / T));
      const endC = Math.min(MAP_W - 1, Math.ceil((camX + gameCanvas.width) / T));
      const startR = Math.max(0, Math.floor(camY / T));
      const endR = Math.min(MAP_H - 1, Math.ceil((camY + gameCanvas.height) / T));

      for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
          const tile = terrainRef.current[r][c];
          if (tile === 0) continue;
          const x = c * T - camX;
          const y = r * T - camY;

          if (tile === 1) ctx.fillStyle = '#4a9e2f'; // Grass
          else if (tile === 2) ctx.fillStyle = '#7a4f28'; // Dirt
          else if (tile === 3) ctx.fillStyle = '#6b6b6b'; // Stone
          else ctx.fillStyle = '#3a3a3a';

          ctx.fillRect(x, y, T, T);
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.strokeRect(x, y, T, T);
        }
      }
    };

    const drawEntities = () => {
      const { x: camX, y: camY } = camera.current;
      const { px, py, pFacing, isAttacking, attackTimer } = physics.current;

      ctx.save();
      ctx.translate(px + 16 - camX, py + 16 - camY);
      ctx.scale(pFacing, 1);
      playerPixels.forEach((colorIdx: number, i: number) => {
        if (colorIdx === 0) return;
        ctx.fillStyle = PIXEL_COLORS[colorIdx];
        ctx.fillRect((i % PLAYER_SIZE) - PLAYER_SIZE / 2, Math.floor(i / PLAYER_SIZE) - PLAYER_SIZE / 2, 2, 2);
      });

      // Weapon
      ctx.save();
      ctx.translate(8, 0); // Position of hand/weapon pivot
      if (isAttacking && heroClass === 'melee') {
        const swingArc = (attackTimer / 20) * Math.PI * 0.8; // Rotate up to 144 degrees
        ctx.rotate(swingArc);
      }
      weaponPixels.forEach((colorIdx: number, i: number) => {
        if (colorIdx === 0) return;
        ctx.fillStyle = PIXEL_COLORS[colorIdx];
        ctx.fillRect((i % WEAPON_SIZE) - WEAPON_SIZE / 2, Math.floor(i / WEAPON_SIZE) - WEAPON_SIZE / 2, 2, 2);
      });
      ctx.restore();
      ctx.restore();

      // Projectiles
      projectilesRef.current.forEach(p => {
        ctx.save();
        ctx.translate(p.x - camX, p.y - camY);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0ff';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
      });

      // Monsters Rendering
      monstersRef.current.forEach(monster => {
        const gx = monster.x - camX + monster.w / 2;
        const gy = monster.y - camY + monster.h / 2;
        
        // Red Health Bar
        if (monster.hp < monster.maxHp) {
          const barW = monster.w;
          const barH = 4;
          const barX = monster.x - camX;
          const barY = monster.y - camY - 8;
          ctx.fillStyle = '#333';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#ef4444'; // Red
          ctx.fillRect(barX, barY, barW * (monster.hp / monster.maxHp), barH);
        }

        if (monster.type === 'ghost') {
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(200, 230, 255, 0.5)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(gx, gy - 5, monster.w / 2, Math.PI, 0);
          ctx.lineTo(gx + monster.w / 2, gy + monster.h / 2);
          ctx.lineTo(gx - monster.w / 2, gy + monster.h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc(gx - 4, gy - 7, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(gx + 4, gy - 7, 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });
    };

    const drawLighting = () => {
      if (!hardMode) return;
      const { px, py } = physics.current;
      const lpx = px - camera.current.x + 16;
      const lpy = py - camera.current.y + 16;
      const gradient = ctx.createRadialGradient(lpx, lpy, 50, lpx, lpy, 250);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    };

    let frameId: number;
    const loop = () => {
      update();
      ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
      drawSky();
      drawTilemap();
      drawEntities();
      drawLighting();
      frameId = requestAnimationFrame(loop);
    };

    loop();
    // gameCanvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(frameId);
      // gameCanvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [playerPixels, weaponPixels, stats, hardMode, heroClass]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const interactionCanvas = canvasRef.current;
    if (!interactionCanvas) return;
    const rect = interactionCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (interactionCanvas.width / rect.width) + camera.current.x;
    const y = (e.clientY - rect.top) * (interactionCanvas.height / rect.height) + camera.current.y;
    const c = Math.floor(x / T);
    const r = Math.floor(y / T);
    if (r >= 0 && r < terrainRef.current.length && c >= 0 && c < terrainRef.current[0].length) {
      if (terrainRef.current[r][c] > 0) {
        terrainRef.current[r][c] = 0;
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`glass-panel p-4 flex justify-between items-center px-8 border-t-2 ${hardMode ? 'border-red-500/50' : 'border-indigo-500/50'}`}>
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">HP</span>
            <span className={`mono font-bold ${playerHp < 30 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>{Math.round(playerHp)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">ATK</span>
            <span className="mono text-indigo-400 font-bold">{stats.atk.toFixed(1)}</span>
          </div>
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
          {hardMode ? <span className="text-red-500 animate-pulse">HARD MODE ACTIVATED</span> : 'CLASSIC MODE'}
        </div>
      </div>
      <div className={`border-8 rounded-2xl overflow-hidden shadow-2xl relative ${hardMode ? 'border-slate-900 shadow-red-900/20' : 'border-slate-800 shadow-indigo-900/20'}`}>
        {/* Quest Tracker Overlay */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="glass-panel py-2 px-4 border-l-4 border-amber-500 animate-in slide-in-from-left duration-500">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Tasks</h3>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${kills.ghost >= 5 ? 'bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]' : 'bg-slate-600'}`} />
              <span className={`mono text-xs font-bold ${kills.ghost >= 5 ? 'text-emerald-400 line-through opacity-50' : 'text-slate-200'}`}>
                Ghost {kills.ghost}/5
              </span>
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          className="bg-slate-950 block"
        />
      </div>
    </div>
  );
}
