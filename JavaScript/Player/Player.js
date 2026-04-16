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
}