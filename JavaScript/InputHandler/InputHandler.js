export class InputHandler {
    constructor() {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    isPressed(direction) {
        switch (direction) {
            case 'up':
                return this.keys['w'] || this.keys['arrowup'];
            case 'left':
                return this.keys['a'] || this.keys['arrowleft'];
            case 'right':
                return this.keys['d'] || this.keys['arrowright'];
            default:
                return false;
        }
    }
}