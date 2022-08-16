export const [xMin, xMax, yMin, yMax] = [0, 1000, 0, 500];

export type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  ts: number;
  color: string;
};

function step(ball: Ball, dt: number): Ball {
  let { x, y, dx, dy, ts } = ball;

  if (x < xMin || x > xMax) {
    ball.x = Math.min(xMax, Math.max(xMin, x));
    return ball;
  }

  ts = ts + dt;
  dx = 0.99 * dx;
  dy = 0.99 * dy - 0.05;
  x = x + dx;
  y = y + dy;

  // bounce
  if (y < yMin) {
    y = yMin + (yMin - y);
    dy = -dy * 0.7;
  }

  return { ...ball, x, y, dx, dy, ts };
}

export function currentPosition(ball: Ball): { x: number; y: number } {
  const now = Date.now();

  /*
  // last moved more than ten seconds ago");
  if (ball.ts < now - 10000) return ball;
  */

  // in the future (?), don't touch it
  if (ball.ts > now) return ball;

  let newBall = ball;
  let i = 0;
  // infinite loops are annoying
  while (i++ < 1000) {
    newBall = step(newBall, 10);record

    // out of bounds, return to start
    if (newBall.x < xMin || newBall.x > xMax) {
      return ball;
    }

    if (
      newBall.y < 1 &&
      Math.abs(newBall.dy * newBall.dy + newBall.dx * newBall.dx) < 1
    ) {
      // stuck on ground
      return newBall;
    }

    if (newBall.ts > now) {
      // we have reached the present
      return newBall;
    }
  }
  // ran out of simulation steps
  return newBall;
}

export const degreesToVector = (deg: number) => [
  Math.sin((deg * 2 * Math.PI) / 360),
  Math.cos((deg * 2 * Math.PI) / 360),
];
