export function draw(ctx, config, matrix, tileSize, x, y) {
    
    const startCol = Math.max(0, Math.floor(x / tileSize));
    const endCol = Math.min(matrix[0].length, startCol + 31); 
    
    const startRow = Math.max(0, Math.floor(y / tileSize));
    const endRow = Math.min(matrix.length, startRow + 17); 

    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const tileID = matrix[r][c];
            const tileConfig = config[tileID];

            if (tileConfig) {
                ctx.fillStyle = tileConfig.color;
                
                ctx.fillRect(
                    c * tileSize - x, 
                    r * tileSize - y, 
                    tileSize +0.5, 
                    tileSize +0.5
                );
            }
        }
    }
}

// Tạo bảng chú thích   
export function createLegend(config) {
    const legend = document.getElementById('legend');
    Object.keys(config).forEach(id => {
        if(id == 0) return; // Không cần chú thích bầu trời
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<div class="box" style="background:${config[id].color}"></div> <span>${config[id].name}</span>`;
        legend.appendChild(div);
    });

}