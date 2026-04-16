export class Camera {
    constructor(mapCols, mapRows, tileSize, viewportCols, viewportRows) {
        this.tileSize = tileSize;
        
        this.mapWidth = mapCols * tileSize;   
        this.mapHeight = mapRows * tileSize;
        
        this.viewportWidth = viewportCols * tileSize; 
        this.viewportHeight = viewportRows * tileSize;
  
        this.x = 0;
        this.y = 0;
    }
    follow(player) {
        let targetX = player.x - (this.viewportWidth / 2);
        let targetY = player.y - (this.viewportHeight / 2);

        this.x = Math.max(0, Math.min(targetX, this.mapWidth - this.viewportWidth));
        this.y = Math.max(0, Math.min(targetY, this.mapHeight - this.viewportHeight));
    }
}