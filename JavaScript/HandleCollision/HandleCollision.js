export function resolveCollision(player, T) {
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
