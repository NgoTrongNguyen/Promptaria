import {draw, createLegend} from './Drawing/Draw.js';
import {MouseMoving} from './Mouse/Mouse.js';
import {CallAPI} from './CallAPI/API.js';
import {Camera} from './Camera/Camera.js';
import { InputHandler } from './InputHandler/InputHandler.js';
import { Player } from './Player/Player.js';
import { resolveCollision } from './HandleCollision/HandleCollision.js';

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

let terrainMatrix = generateMatrix();

const config = {
    0: { name: "Air", color: "#87CEEB" },       // Xanh da trời (Khí)
    1: { name: "Grass", color: "#4CAF50" },     // Xanh lá (Cỏ)
    2: { name: "Dirt", color: "#8B4513" },      // Nâu (Đất)
    3: { name: "Stone", color: "#757575" },     // Xám (Đá)
    4: { name: "Wood", color: "#5D4037" },      // Nâu đậm (Gỗ)
    5: { name: "Leaves", color: "#1B5E20" },    // Xanh rừng (Lá)
    6: { name: "Coal", color: "#333333" },      // Đen (Than)
    7: { name: "Iron", color: "#D7CCC8" },      // Trắng xám (Sắt)
    8: { name: "Gold", color: "#FFD600" },      // Vàng tươi (Vàng)
    9: { name: "Diamond", color: "#00E5FF" },   // Xanh băng (Kim cương)
    10: { name: "Emerald", color: "#00C853" }   // Xanh lục bảo (Emerald)
};

const tileSize = 45; 
const canvas = document.getElementById('terrainCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 30 * tileSize;
canvas.height = 16 * tileSize;

draw(ctx, config, terrainMatrix, tileSize);

const Input = new InputHandler();
let player = new Player(3 * tileSize, 1 * tileSize);
const camera = new Camera(64, 64, tileSize, 30, 16);

function update() {
     time += 0.016;
    const spd = 3.2, jmp = -11, grv = 0.5;

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

    resolveCollision(player, tileSize);

    camera.follow(player);
    }

function gameLoop() {
    MouseMoving(canvas, tileSize, (check) => {
    if (check === 1) {
        CallAPI().then(data => {
            terrainMatrix = data.result;
            });
        };
    });
    update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    draw(ctx, config, terrainMatrix, tileSize, player.x, player.y);
    player.drawPlayer(ctx, camera.x, camera.y);
    requestAnimationFrame(gameLoop);
}
gameLoop();





