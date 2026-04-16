export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.w = 22;
        this.h = 30;
        this.onGround = false;
        this.facing = 1;
        this.walkFrame = 0;
        this.walkTimer = 0;
    }
    drawPlayer(ctx, camX, camY) {
        const px = this.x - camX;
        const py = this.y - camY;
        ctx.save();
        ctx.translate(px + this.w / 2, py + this.h / 2);
        ctx.scale(this.facing, 1);
        const lx = this.onGround && (keys['KeyA'] || keys['ArrowLeft'] || keys['KeyD'] || keys['ArrowRight'])
            ? Math.sin(this.walkFrame * 0.5) * 5 : 0;
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
}