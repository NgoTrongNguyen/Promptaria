import {State} from './State.js';

export function MouseMoving(canvas, tileSize, callback) {
    let check = 0;
    canvas.addEventListener('mousemove', (event) => {
    // 1. Lấy vị trí của Canvas trên màn hình
        const rect = canvas.getBoundingClientRect();
    
    // 2. Tính toán tọa độ X, Y của chuột bên trong Canvas
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

    // 3. Quy đổi từ Pixel sang tọa độ Ô (Grid Index)
        const gridX = Math.floor(mouseX / tileSize);
        const gridY = Math.floor(mouseY / tileSize);

        if (Math.abs(gridX - State.lastGrid.x) >7 || Math.abs( gridY - State.lastGrid.y)>7) {
            State.lastGrid = { x: gridX, y: gridY };
            console.log(`Mouse moved to Grid: (${gridX}, ${gridY})`);
            check = 1; 
            callback(check);
        }
    });
}