'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PIXEL_COLORS } from '@/lib/constants';

interface GameStats {
  hp: number;
  atk: number;
  spd: number;
  range: number;
}

interface GameCanvasProps {
  terrain: number[][]; // 2D array from backend
  playerPixels: number[];
  weaponPixels: number[];
  stats: GameStats;
}

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;

export default function GameCanvas({ terrain, playerPixels, weaponPixels, stats }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState({
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1, // 1 for right, -1 for left
    hp: stats.hp,
  });

  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let playerX = 100;
    let playerY = 100;
    let playerVx = 0;
    let playerVy = 0;
    let playerOnGround = false;
    let playerFacing = 1;

    const MAP_H = terrain.length;
    const MAP_W = terrain[0].length;

    const isSolid = (x: number, y: number) => {
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);
      if (row < 0 || row >= MAP_H || col < 0 || col >= MAP_W) return false;
      return terrain[row][col] > 0;
    };

    const update = () => {
      // Horizontal Movement
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
        playerVx = -MOVE_SPEED * (stats.spd / 5);
        playerFacing = -1;
      } else if (keys.current['KeyD'] || keys.current['ArrowRight']) {
        playerVx = MOVE_SPEED * (stats.spd / 5);
        playerFacing = 1;
      } else {
        playerVx *= 0.8;
      }

      // Jump
      if ((keys.current['KeyW'] || keys.current['Space'] || keys.current['ArrowUp']) && playerOnGround) {
        playerVy = JUMP_FORCE;
        playerOnGround = false;
      }

      // Gravity
      playerVy += GRAVITY;

      // Vertical Collision
      playerY += playerVy;
      playerOnGround = false;
      if (playerVy > 0) { // Moving down
        if (isSolid(playerX + 4, playerY + 32) || isSolid(playerX + 28, playerY + 32)) {
          playerY = Math.floor(playerY / TILE_SIZE) * TILE_SIZE;
          playerVy = 0;
          playerOnGround = true;
        }
      } else if (playerVy < 0) { // Moving up
        if (isSolid(playerX + 4, playerY) || isSolid(playerX + 28, playerY)) {
          playerY = (Math.floor(playerY / TILE_SIZE) + 1) * TILE_SIZE;
          playerVy = 0;
        }
      }

      // Horizontal Collision
      playerX += playerVx;
      if (playerVx > 0) { // Moving right
        if (isSolid(playerX + 32, playerY + 4) || isSolid(playerX + 32, playerY + 28)) {
          playerX = Math.floor(playerX / TILE_SIZE) * TILE_SIZE;
          playerVx = 0;
        }
      } else if (playerVx < 0) { // Moving left
        if (isSolid(playerX, playerY + 4) || isSolid(playerX, playerY + 28)) {
          playerX = (Math.floor(playerX / TILE_SIZE) + 1) * TILE_SIZE;
          playerVx = 0;
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Camera follow
      ctx.save();
      const camX = -playerX + canvas.width / 2;
      const camY = -playerY + canvas.height / 2;
      ctx.translate(camX, camY);

      // Draw Terrain
      terrain.forEach((row, r) => {
        row.forEach((tile, c) => {
          if (tile === 0) return;
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;
          
          // Simple tile colors based on backend IDs
          if (tile === 1) ctx.fillStyle = '#4a9e2f'; // Grass
          else if (tile === 2) ctx.fillStyle = '#7a4f28'; // Dirt
          else if (tile === 3) ctx.fillStyle = '#6b6b6b'; // Stone
          else ctx.fillStyle = '#3a3a3a';

          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        });
      });

      // Draw Player
      ctx.save();
      ctx.translate(playerX + 16, playerY + 16);
      ctx.scale(playerFacing, 1);
      
      // Render character from pixel data (32x32 scaled to 32x32)
      playerPixels.forEach((colorIdx, i) => {
        if (colorIdx === 0) return;
        const px = (i % 32) - 16;
        const py = Math.floor(i / 32) - 16;
        ctx.fillStyle = PIXEL_COLORS[colorIdx];
        ctx.fillRect(px, py, 1, 1);
      });

      // Render Weapon (16x16)
      ctx.save();
      ctx.translate(8, 0); // Offset to hand
      weaponPixels.forEach((colorIdx, i) => {
        if (colorIdx === 0) return;
        const px = (i % 16) - 8;
        const py = Math.floor(i / 16) - 8;
        ctx.fillStyle = PIXEL_COLORS[colorIdx];
        ctx.fillRect(px, py, 1, 1);
      });
      ctx.restore();

      ctx.restore();

      ctx.restore();
    };

    let frameId: number;
    const loop = () => {
      update();
      render();
      frameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(frameId);
  }, [terrain, playerPixels, weaponPixels, stats]);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-panel p-4 flex justify-between items-center px-8">
        <div className="flex gap-8">
          <div><span className="text-slate-400 mr-2">HP:</span> <span className="mono text-red-400 font-bold">{stats.hp}</span></div>
          <div><span className="text-slate-400 mr-2">ATK:</span> <span className="mono text-indigo-400 font-bold">{stats.atk.toFixed(1)}</span></div>
          <div><span className="text-slate-400 mr-2">SPD:</span> <span className="mono text-emerald-400 font-bold">{stats.spd.toFixed(1)}</span></div>
          <div><span className="text-slate-400 mr-2">RANGE:</span> <span className="mono text-amber-400 font-bold">{stats.range.toFixed(1)}</span></div>
        </div>
        <div className="text-xs text-slate-500 uppercase tracking-widest">Pixel Forge Arena v0.1</div>
      </div>
      <div className="border-8 border-slate-800 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="bg-slate-900"
        />
      </div>
      <div className="text-center text-slate-500 text-sm">
        WASD or Arrows to Move & Jump • ESC to exit
      </div>
    </div>
  );
}
